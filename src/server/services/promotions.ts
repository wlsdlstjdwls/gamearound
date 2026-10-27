// 유료 노출 자리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4장, 5장 2단계) — 걸기, 회수, 노출 읽기.
//
// 노출 읽기는 "지금 걸린 대상 id" 를 하위 질의로 두고 대상 표의 공개 조건과 함께 거른다. 숨김, 반려, 삭제된 대상은 그 조건에서
// 저절로 빠진다(schema-promotions 머리 주석). 세울 수보다 많으면 시간 구간마다 차례를 돌린다(lib/promo/boost).
// 2단계는 결제가 없다 — 걸기는 관리자만 한다(source admin). 결제가 붙으면 같은 grantBoost 를 결제 확인 뒤에 부른다.
import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePosts, posts, promotionBoosts, users, type PromoSlot } from "@/server/db/schema";
import { boostEnd, boostState, rotateForWindow, SLOT_CAPACITY, SLOT_TARGET, type BoostState } from "@/lib/promo/boost";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import { postPath } from "@/lib/community/constants";
import { indiePath } from "@/lib/routes";
import type { IndieCardDto } from "@/lib/indie/dto";
import { cardColumns, isPublic, toCards } from "@/server/services/indie/read";
import { rowColumns, toRow } from "@/server/services/community/columns";
import type { PostRowDto } from "@/server/services/community/dto";

/** 관리자 목록에 끝난 줄을 얼마나 남겨 보이나. 지난 기록은 성과를 잴 때나 보고, 한 화면에 쌓이면 지금 걸린 것이 묻힌다 */
const ENDED_SHOWN = 20;
/** 걸기 후보로 세우는 홍보 글 수. 최신부터 — 오래된 홍보 글에 돈을 거는 일은 드물다 */
const PROMO_CANDIDATES = 50;

/** 지금 그 자리에 걸린 대상 id(하위 질의). 같은 대상이 두 번 걸려도 in 이라 한 번만 선다 */
function activeTargets(slot: PromoSlot) {
  return getDb()
    .select({ id: promotionBoosts.targetId })
    .from(promotionBoosts)
    .where(and(eq(promotionBoosts.slot, slot), isNull(promotionBoosts.revokedAt), lte(promotionBoosts.startsAt, sql`now()`), gt(promotionBoosts.endsAt, sql`now()`)));
}

/** 공개 홍보 글 — 게시판 목록과 같은 문턱(공개 상태)에 홍보 카테고리 */
const isPublicPromo = and(eq(posts.status, "published"), eq(posts.category, "promo"));

/** 인디 목록 맨 위 "주목할 게임" 카드. 걸린 글이 없으면 빈 목록 */
export async function listFeaturedIndie(): Promise<IndieCardDto[]> {
  const rows = await getDb()
    .select(cardColumns)
    .from(indiePosts)
    .where(and(isPublic, inArray(indiePosts.id, activeTargets("indie_top"))))
    .orderBy(asc(indiePosts.id));
  const picked = rotateForWindow(rows, SLOT_CAPACITY.indie_top, new Date());
  return toCards(picked);
}

/** 게시판 홍보 목록 위 고정 글 */
export async function listPinnedPromoPosts(): Promise<PostRowDto[]> {
  const rows = await getDb()
    .select(rowColumns)
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(and(isPublicPromo, inArray(posts.id, activeTargets("promo_pin"))))
    .orderBy(asc(posts.id));
  return rotateForWindow(rows, SLOT_CAPACITY.promo_pin, new Date()).map(toRow);
}

export type BoostRowDto = {
  id: string;
  slot: PromoSlot;
  state: BoostState;
  targetTitle: string;
  targetHref: string | null;
  /** 대상이 지금 공개인가. 아니면 걸려 있어도 안 보인다 — 관리자가 알아야 한다 */
  targetLive: boolean;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
};

/** 관리자 목록. 지금 걸린 것과 대기가 먼저, 끝나거나 회수한 것은 최근 몇 줄만 */
export async function listBoostsForAdmin(): Promise<BoostRowDto[]> {
  const db = getDb();
  // 질의 빌더는 where 를 부르면 제 몸을 바꾼다 — 두 번 쓰려면 매번 새로 만든다
  const base = () =>
    db
    .select({
      id: promotionBoosts.id,
      slot: promotionBoosts.slot,
      startsAt: promotionBoosts.startsAt,
      endsAt: promotionBoosts.endsAt,
      revokedAt: promotionBoosts.revokedAt,
      note: promotionBoosts.note,
      indieTitle: indiePosts.title,
      indieSlug: indiePosts.slug,
      indieLive: sql<boolean>`(${indiePosts.status} = 'published' and ${indiePosts.review} = 'approved')`,
      postId: posts.id,
      postTitle: posts.title,
      postLive: sql<boolean>`(${posts.status} = 'published')`,
    })
    .from(promotionBoosts)
    .leftJoin(indiePosts, and(eq(promotionBoosts.targetKind, "indie_post"), eq(indiePosts.id, promotionBoosts.targetId)))
    .leftJoin(posts, and(eq(promotionBoosts.targetKind, "board_post"), eq(posts.id, promotionBoosts.targetId)));
  const open = and(isNull(promotionBoosts.revokedAt), gt(promotionBoosts.endsAt, sql`now()`));
  const [current, past] = await Promise.all([
    base().where(open).orderBy(asc(promotionBoosts.slot), asc(promotionBoosts.startsAt)),
    db
      .select({ id: promotionBoosts.id })
      .from(promotionBoosts)
      .where(or(sql`${promotionBoosts.revokedAt} is not null`, lte(promotionBoosts.endsAt, sql`now()`)))
      .orderBy(desc(promotionBoosts.endsAt))
      .limit(ENDED_SHOWN),
  ]);
  const pastRows = past.length ? await base().where(inArray(promotionBoosts.id, past.map((p) => p.id))).orderBy(desc(promotionBoosts.endsAt)) : [];
  const now = new Date();
  return [...current, ...pastRows].map((r) => ({
    id: r.id,
    slot: r.slot,
    state: boostState(r, now),
    targetTitle: r.indieTitle ?? r.postTitle ?? M.targetGone,
    targetHref: r.indieSlug ? indiePath(r.indieSlug) : r.postId ? postPath(r.postId, "promo") : null,
    targetLive: Boolean(r.indieTitle ? r.indieLive : r.postTitle ? r.postLive : false),
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    note: r.note,
  }));
}

export type BoostCandidate = { id: string; title: string };

/** 걸기 후보 — 자리마다 지금 공개인 대상만. 공개 전 글에 걸면 기간만 흐르고 아무도 못 본다 */
export async function listBoostCandidates(): Promise<Record<PromoSlot, BoostCandidate[]>> {
  const db = getDb();
  const [indie, promo] = await Promise.all([
    db.select({ id: indiePosts.id, title: indiePosts.title }).from(indiePosts).where(isPublic).orderBy(asc(indiePosts.title)),
    db.select({ id: posts.id, title: posts.title }).from(posts).where(isPublicPromo).orderBy(desc(posts.createdAt)).limit(PROMO_CANDIDATES),
  ]);
  return { indie_top: indie, promo_pin: promo };
}

/** 걸기. 지금부터 days 일. 대상이 그 자리에 맞는 공개 글인지 다시 본다 — 화면의 후보 목록은 그새 바뀌었을 수 있다 */
export async function grantBoost(input: { slot: PromoSlot; targetId: string; days: number; note: string }, adminId: string): Promise<void> {
  const db = getDb();
  const kind = SLOT_TARGET[input.slot];
  const found =
    kind === "indie_post"
      ? await db.select({ id: indiePosts.id }).from(indiePosts).where(and(eq(indiePosts.id, input.targetId), isPublic)).limit(1)
      : await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, input.targetId), isPublicPromo)).limit(1);
  if (found.length === 0) throw new Error(M.targetNotPublic);
  const startsAt = new Date();
  await db.insert(promotionBoosts).values({
    targetKind: kind,
    targetId: input.targetId,
    slot: input.slot,
    startsAt,
    endsAt: boostEnd(startsAt, input.days),
    source: "admin",
    note: input.note || null,
    ...createdBy("admin", adminId),
  });
}

/** 회수. 이미 회수한 줄은 그대로 둔다(두 번 눌러도 시각이 밀리지 않게) */
export async function revokeBoost(id: string, adminId: string): Promise<void> {
  await getDb()
    .update(promotionBoosts)
    .set({ revokedAt: sql`now()`, ...updatedBy("admin", adminId) })
    .where(and(eq(promotionBoosts.id, id), isNull(promotionBoosts.revokedAt)));
}
