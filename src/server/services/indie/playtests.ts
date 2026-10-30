// 플레이테스트 모집(2026-10-27, 기획서 3장 5번, 4.3 메이커 멤버십 "플레이테스트 모집 상단 고정") — 열기, 마감, 신청, 취소, 읽기.
//
// 모집은 공개 중인 인디 글에만 연다: 승인 전 글의 모집은 아무도 못 보고 기간만 흐른다. 열린 모집은 글마다 하나다(schema-indie-promo 주석).
// 인원이 찼는지는 신청 순간에 센다. 두 사람이 마지막 한 자리를 동시에 누르면 한 명 넘칠 수 있다 — 잠금을 거는 값보다 한 명 더 받는 값이 싸다.
// 신청자 목록(한마디 포함)은 그 글의 글쓴이에게만 준다. 이메일은 내보내지 않는다 — 연락 길은 신청자가 한마디에 적는다.
//
// 모아 보기는 열린 모집 전부를 마감 가까운 순서로 세우고, 메이커 멤버십 개발자의 모집을 맨 위 몇 칸에 고정한다(돌리기는 유료 자리와 같다, lib/promo/boost).
import "server-only";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePlaytestApplications, indiePlaytests, indiePosts, users } from "@/server/db/schema";
import { boostEnd, rotateForWindow } from "@/lib/promo/boost";
import { PLAYTEST_PIN_CAPACITY, playtestPhase, type ApplyPlaytestInput, type CreatePlaytestInput, type PlaytestPhase, type UpdatePlaytestInput } from "@/lib/indie/playtest";
import { PLAYTEST_MESSAGES as M } from "@/lib/indie/playtest-messages";
import type { IndieCardDto } from "@/lib/indie/dto";
import { authorNameSql } from "@/server/services/community/columns";
import { makerActiveSql } from "@/server/services/membership/read";
import { requireUser } from "@/server/services/users";
import { cardColumns, isPublic, toCards } from "./read";

/** 관리 화면에 세우는 지난 모집 수 */
const HISTORY_SHOWN = 5;

const applicantCount = sql<number>`(select count(*) from ${indiePlaytestApplications} where ${indiePlaytestApplications.playtestId} = ${indiePlaytests.id})::int`;
const openNow = and(isNull(indiePlaytests.closedAt), gt(indiePlaytests.closesAt, sql`now()`));

export type PlaytestDto = {
  id: string;
  title: string;
  body: string;
  slots: number;
  applicants: number;
  closesAt: Date;
  phase: PlaytestPhase;
};

type PlaytestRow = { id: string; title: string; body: string; slots: number; applicants: number; closesAt: Date; closedAt: Date | null };

function toDto(r: PlaytestRow, now: Date): PlaytestDto {
  return { id: r.id, title: r.title, body: r.body, slots: r.slots, applicants: r.applicants, closesAt: r.closesAt, phase: playtestPhase(r, now) };
}

const playtestColumns = {
  id: indiePlaytests.id,
  title: indiePlaytests.title,
  body: indiePlaytests.body,
  slots: indiePlaytests.slots,
  applicants: applicantCount,
  closesAt: indiePlaytests.closesAt,
  closedAt: indiePlaytests.closedAt,
};

/** 인디 상세의 모집 판. 열린 모집이 없으면 null. viewerId 가 있으면 그 사람이 신청했는지도 */
export async function getOpenPlaytest(postId: string, viewerId: string | null): Promise<(PlaytestDto & { applied: boolean }) | null> {
  const [row] = await getDb()
    .select({
      ...playtestColumns,
      applied: viewerId
        ? sql<boolean>`exists (select 1 from ${indiePlaytestApplications} where ${indiePlaytestApplications.playtestId} = ${indiePlaytests.id} and ${indiePlaytestApplications.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(indiePlaytests)
    .where(and(eq(indiePlaytests.postId, postId), openNow))
    .orderBy(desc(indiePlaytests.createdAt))
    .limit(1);
  return row ? { ...toDto(row, new Date()), applied: row.applied } : null;
}

/** 글쓴이 확인. 아니면 null — 남의 글이 있는지조차 알려 주지 않는다 */
async function ownPost(userId: string, postId: string) {
  const [p] = await getDb()
    .select({ id: indiePosts.id, title: indiePosts.title, slug: indiePosts.slug, live: sql<boolean>`(${isPublic})` })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.authorUserId, userId)))
    .limit(1);
  return p ?? null;
}

export type PlaytestApplicantDto = { name: string; message: string; appliedAt: Date };
export type PlaytestManageDto = {
  post: { id: string; title: string; slug: string; live: boolean };
  /** 최근 모집부터. 맨 앞이 열린 모집이면 phase 가 open 또는 full */
  playtests: Array<PlaytestDto & { applicantList: PlaytestApplicantDto[] }>;
};

/** 개발자 관리 화면. 내 글이 아니면 null */
export async function getPlaytestManage(userId: string, postId: string): Promise<PlaytestManageDto | null> {
  const post = await ownPost(userId, postId);
  if (!post) return null;
  const db = getDb();
  const [rows, applicants] = await Promise.all([
    db.select(playtestColumns).from(indiePlaytests).where(eq(indiePlaytests.postId, postId)).orderBy(desc(indiePlaytests.createdAt)).limit(HISTORY_SHOWN),
    db
      .select({ playtestId: indiePlaytestApplications.playtestId, name: authorNameSql, message: indiePlaytestApplications.message, appliedAt: indiePlaytestApplications.createdAt })
      .from(indiePlaytestApplications)
      .innerJoin(indiePlaytests, eq(indiePlaytests.id, indiePlaytestApplications.playtestId))
      .innerJoin(users, eq(users.id, indiePlaytestApplications.userId))
      .where(eq(indiePlaytests.postId, postId))
      .orderBy(asc(indiePlaytestApplications.createdAt)),
  ]);
  const now = new Date();
  return {
    post,
    playtests: rows.map((r) => ({ ...toDto(r, now), applicantList: applicants.filter((a) => a.playtestId === r.id).map(({ name, message, appliedAt }) => ({ name, message, appliedAt })) })),
  };
}

export async function createPlaytest(input: CreatePlaytestInput): Promise<{ slug: string }> {
  const u = await requireUser();
  const post = await ownPost(u.id, input.postId);
  if (!post) throw new Error(M.notFound);
  if (!post.live) throw new Error(M.notLive);
  const db = getDb();
  const open = await db.select({ id: indiePlaytests.id }).from(indiePlaytests).where(and(eq(indiePlaytests.postId, input.postId), openNow)).limit(1);
  if (open.length > 0) throw new Error(M.alreadyOpen);
  await db.insert(indiePlaytests).values({
    postId: input.postId,
    title: input.title,
    body: input.body,
    slots: input.slots,
    closesAt: boostEnd(new Date(), input.days),
    ...createdBy("user", u.id),
  });
  return { slug: post.slug };
}

/** 일찍 마감. 이미 끝난 모집은 그대로 둔다(두 번 눌러도 시각이 밀리지 않게) */
export async function closePlaytest(playtestId: string): Promise<{ slug: string }> {
  const u = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({ slug: indiePosts.slug })
    .from(indiePlaytests)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePlaytests.postId))
    .where(and(eq(indiePlaytests.id, playtestId), eq(indiePosts.authorUserId, u.id)))
    .limit(1);
  if (!row) throw new Error(M.notFound);
  await db.update(indiePlaytests).set({ closedAt: sql`now()`, ...updatedBy("user", u.id) }).where(and(eq(indiePlaytests.id, playtestId), isNull(indiePlaytests.closedAt)));
  return row;
}

/** 신청. 이미 신청했으면 한마디만 고친다 */
export async function applyPlaytest(input: ApplyPlaytestInput): Promise<{ slug: string }> {
  const u = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({ ...playtestColumns, slug: indiePosts.slug, authorUserId: indiePosts.authorUserId, live: sql<boolean>`(${isPublic})` })
    .from(indiePlaytests)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePlaytests.postId))
    .where(eq(indiePlaytests.id, input.playtestId))
    .limit(1);
  if (!row || !row.live) throw new Error(M.notFound);
  if (row.authorUserId === u.id) throw new Error(M.ownGame);
  const phase = playtestPhase(row, new Date());
  if (phase === "closed") throw new Error(M.notOpen);
  const [mine] = await db
    .select({ x: sql`1` })
    .from(indiePlaytestApplications)
    .where(and(eq(indiePlaytestApplications.playtestId, input.playtestId), eq(indiePlaytestApplications.userId, u.id)))
    .limit(1);
  // 다 찼어도 이미 신청한 사람의 한마디 고치기는 받는다
  if (phase === "full" && !mine) throw new Error(M.full);
  await db
    .insert(indiePlaytestApplications)
    .values({ playtestId: input.playtestId, userId: u.id, message: input.message, ...createdBy("user", u.id) })
    .onConflictDoUpdate({ target: [indiePlaytestApplications.playtestId, indiePlaytestApplications.userId], set: { message: input.message, ...updatedBy("user", u.id) } });
  return { slug: row.slug };
}

/** 신청 취소. 끝난 모집이어도 거둘 수 있다 — 개발자 목록에서 내 연락처를 빼고 싶을 수 있다 */
export async function withdrawPlaytest(playtestId: string): Promise<{ slug: string | null }> {
  const u = await requireUser();
  const db = getDb();
  await db.delete(indiePlaytestApplications).where(and(eq(indiePlaytestApplications.playtestId, playtestId), eq(indiePlaytestApplications.userId, u.id)));
  const [row] = await db.select({ slug: indiePosts.slug }).from(indiePlaytests).innerJoin(indiePosts, eq(indiePosts.id, indiePlaytests.postId)).where(eq(indiePlaytests.id, playtestId)).limit(1);
  return { slug: row?.slug ?? null };
}

export type PlaytestCardDto = { card: IndieCardDto; playtest: PlaytestDto };
export type PlaytestBoardDto = { pinned: PlaytestCardDto[]; rest: PlaytestCardDto[] };

/** 모아 보기. 공개 글의 열린 모집 전부(글마다 하나), 메이커 모집 몇 칸은 맨 위 고정 */
export async function listOpenPlaytests(): Promise<PlaytestBoardDto> {
  const rows = await getDb()
    .select({ card: cardColumns, pt: playtestColumns, maker: makerActiveSql(indiePosts.authorUserId) })
    .from(indiePlaytests)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePlaytests.postId))
    .where(and(openNow, isPublic))
    .orderBy(asc(indiePlaytests.closesAt));
  const cards = await toCards(rows.map((r) => r.card));
  const now = new Date();
  const bySlug = new Map(rows.map((r) => [r.card.slug, r]));
  const all = cards.flatMap((card) => {
    const r = bySlug.get(card.slug);
    return r ? [{ card, playtest: toDto(r.pt, now), maker: r.maker }] : [];
  });
  const pinned = rotateForWindow(
    all.filter((x) => x.maker),
    PLAYTEST_PIN_CAPACITY,
    now,
  );
  const pinnedIds = new Set(pinned.map((x) => x.playtest.id));
  const strip = ({ card, playtest }: (typeof all)[number]) => ({ card, playtest });
  return { pinned: pinned.map(strip), rest: all.filter((x) => !pinnedIds.has(x.playtest.id)).map(strip) };
}

/** 열린 모집 고치기. 글쓴이 확인과 "아직 안 끝났나" 를 한 질의로 보고, 인원은 지금 신청 수 밑으로 못 내린다 */
export async function updatePlaytest(input: UpdatePlaytestInput): Promise<{ slug: string }> {
  const u = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({ slug: indiePosts.slug, applicants: applicantCount })
    .from(indiePlaytests)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePlaytests.postId))
    .where(and(eq(indiePlaytests.id, input.id), eq(indiePosts.authorUserId, u.id), openNow))
    .limit(1);
  if (!row) throw new Error(M.notFound);
  if (input.slots < row.applicants) throw new Error(M.slotsBelowApplied(row.applicants));
  await db.update(indiePlaytests).set({ title: input.title, body: input.body, slots: input.slots, ...updatedBy("user", u.id) }).where(eq(indiePlaytests.id, input.id));
  return { slug: row.slug };
}
