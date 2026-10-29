// 유료 노출 자리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4장, 5장 2단계) — 걸기, 회수, 노출 읽기.
//
// 노출 읽기는 "지금 걸린 대상 id" 를 하위 질의로 두고 대상 표의 공개 조건과 함께 거른다. 숨김, 반려, 삭제된 대상은 그 조건에서
// 저절로 빠진다(schema-promotions 머리 주석). 세울 수보다 많으면 시간 구간마다 차례를 돌린다(lib/promo/boost).
// 2단계는 결제가 없다 — 걸기는 관리자만 한다(source admin). 결제가 붙으면 같은 grantBoost 를 결제 확인 뒤에 부른다.
import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { games, indiePosts, posts, promotionBoosts, promotionImpressions, users, type PromoSlot, type PromoSource, type PromoTargetKind } from "@/server/db/schema";
import { boostEnd, boostState, rotateForWindow, SLOT_CAPACITY, SLOT_TARGET, type BoostState } from "@/lib/promo/boost";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import { postPath } from "@/lib/community/constants";
import { firstImageSrc, postExcerpt } from "@/lib/community/rich-text";
import { impressionSum } from "./columns";
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

/** 이 대상이 지금 어느 자리에든 걸려 있나. 신고 자동 숨김이 비켜 간다(services/indie/write 의 reportIndiePost) */
export async function isBoostedNow(kind: PromoTargetKind, targetId: string): Promise<boolean> {
  const r = await getDb()
    .select({ x: sql`1` })
    .from(promotionBoosts)
    .where(and(eq(promotionBoosts.targetKind, kind), eq(promotionBoosts.targetId, targetId), isNull(promotionBoosts.revokedAt), lte(promotionBoosts.startsAt, sql`now()`), gt(promotionBoosts.endsAt, sql`now()`)))
    .limit(1);
  return r.length > 0;
}

/** 공개 홍보 글 — 게시판 목록과 같은 문턱(공개 상태)에 홍보 카테고리 */
export const isPublicPromo = and(eq(posts.status, "published"), eq(posts.category, "promo"));

/**
 * 지금 그 자리에 걸린 대상마다 성과를 적을 걸기 줄 하나. 같은 대상에 줄이 둘 이상이면(이어 붙인 결제, 관리자 덤) 먼저 시작한 줄이다 —
 * 끝 시각이 이른 쪽이 지금 흐르는 기간이다. 노출 질의와 나란히 보내 왕복을 늘리지 않는다
 */
async function activeBoostIds(slot: PromoSlot): Promise<Map<string, string>> {
  const rows = await getDb()
    .select({ id: promotionBoosts.id, targetId: promotionBoosts.targetId })
    .from(promotionBoosts)
    .where(and(eq(promotionBoosts.slot, slot), isNull(promotionBoosts.revokedAt), lte(promotionBoosts.startsAt, sql`now()`), gt(promotionBoosts.endsAt, sql`now()`)))
    .orderBy(desc(promotionBoosts.startsAt));
  // 늦게 시작한 줄부터 넣어 먼저 시작한 줄이 덮어쓴다
  return new Map(rows.map((r) => [r.targetId, r.id]));
}

/** 유료 자리에 선 것 하나와 그 성과를 적을 걸기 줄(components/promo/ad-track 이 받는다) */
export type Featured<T> = { boostId: string; item: T };

/** 인디 목록 맨 위 "주목할 게임" 카드. 걸린 글이 없으면 빈 목록 */
export async function listFeaturedIndie(): Promise<Array<Featured<IndieCardDto>>> {
  const [rows, boosts] = await Promise.all([
    getDb()
      .select(cardColumns)
      .from(indiePosts)
      .where(and(isPublic, inArray(indiePosts.id, activeTargets("indie_top"))))
      .orderBy(asc(indiePosts.id)),
    activeBoostIds("indie_top"),
  ]);
  const picked = rotateForWindow(rows, SLOT_CAPACITY.indie_top, new Date());
  const cards = await toCards(picked);
  const boostOf = new Map(picked.map((r) => [r.slug, boosts.get(r.id)]));
  return cards.flatMap((item) => {
    const boostId = boostOf.get(item.slug);
    return boostId ? [{ boostId, item }] : [];
  });
}

/** 홍보 고정 카드 본문 앞부분 길이. 카드 두 줄을 채울 만큼 */
const PIN_EXCERPT_MAX = 90;

/**
 * 홍보 고정 카드 한 장(2026-10-29 사용자: 맨 줄이라 "너무 밋밋하고 눈에 안 띈다"). 줄 정보에 썸네일과 본문 앞부분을 더한다.
 * 썸네일은 본문 첫 그림, 없으면 관련 게임 커버다. 둘 다 없으면 화면이 글머리 그림으로 채운다.
 */
export type PromoPinDto = PostRowDto & { cover: string | null; excerpt: string };

/** 게시판 홍보 목록 위 고정 글 */
export async function listPinnedPromoPosts(): Promise<Array<Featured<PromoPinDto>>> {
  const [rows, boosts] = await Promise.all([
    getDb()
      .select({ ...rowColumns, body: posts.body, gameCover: sql<string | null>`(select ${games.coverUrl} from ${games} where ${games.id} = ${posts.gameId})` })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorUserId))
      .where(and(isPublicPromo, inArray(posts.id, activeTargets("promo_pin"))))
      .orderBy(asc(posts.id)),
    activeBoostIds("promo_pin"),
  ]);
  return rotateForWindow(rows, SLOT_CAPACITY.promo_pin, new Date()).flatMap((r) => {
    const boostId = boosts.get(r.id);
    return boostId ? [{ boostId, item: { ...toRow(r), cover: firstImageSrc(r.body) ?? r.gameCover, excerpt: postExcerpt(r.body, PIN_EXCERPT_MAX) } }] : [];
  });
}

export type BoostRowDto = {
  id: string;
  slot: PromoSlot;
  state: BoostState;
  source: PromoSource;
  targetTitle: string;
  targetHref: string | null;
  /** 대상이 지금 공개인가. 아니면 걸려 있어도 안 보인다 — 관리자가 알아야 한다 */
  targetLive: boolean;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  /** 성과(services/promotions/track 이 쌓는다). 관리자가 시범으로 건 광고의 효과를 여기서 본다 */
  views: number;
  clicks: number;
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
      source: promotionBoosts.source,
      indieTitle: indiePosts.title,
      indieSlug: indiePosts.slug,
      indieLive: sql<boolean>`(${indiePosts.status} = 'published' and ${indiePosts.review} = 'approved')`,
      postId: posts.id,
      postTitle: posts.title,
      postLive: sql<boolean>`(${posts.status} = 'published')`,
      views: impressionSum(promotionImpressions.views),
      clicks: impressionSum(promotionImpressions.clicks),
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
    source: r.source,
    targetTitle: r.indieTitle ?? r.postTitle ?? M.targetGone,
    targetHref: r.indieSlug ? indiePath(r.indieSlug) : r.postId ? postPath(r.postId, "promo") : null,
    targetLive: Boolean(r.indieTitle ? r.indieLive : r.postTitle ? r.postLive : false),
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    note: r.note,
    views: r.views,
    clicks: r.clicks,
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

/**
 * 결제로 거는 부스트(services/payments 가 승인 뒤에, services/membership 이 이용권을 쓸 때 부른다). 같은 대상이 같은 자리에 이미 걸려 있으면 그 끝에 이어 붙인다 —
 * 겹쳐 걸면 산 기간이 겹친 만큼 사라진다. 대상 공개 여부는 다시 보지 않는다: 돈은 이미 빠졌고, 숨김이면 노출 질의가 거른다.
 */
export async function insertPurchasedBoost(input: { slot: PromoSlot; targetId: string; days: number; note: string; source?: Extract<PromoSource, "purchase" | "membership"> }, userId: string): Promise<string> {
  const db = getDb();
  const [latest] = await db
    .select({ end: sql<Date | null>`max(${promotionBoosts.endsAt})` })
    .from(promotionBoosts)
    .where(and(eq(promotionBoosts.slot, input.slot), eq(promotionBoosts.targetId, input.targetId), isNull(promotionBoosts.revokedAt), gt(promotionBoosts.endsAt, sql`now()`)));
  const now = new Date();
  const latestEnd = latest?.end ? new Date(latest.end) : null;
  const startsAt = latestEnd && latestEnd > now ? latestEnd : now;
  const [row] = await db
    .insert(promotionBoosts)
    .values({ targetKind: SLOT_TARGET[input.slot], targetId: input.targetId, slot: input.slot, startsAt, endsAt: boostEnd(startsAt, input.days), source: input.source ?? "purchase", note: input.note, ...createdBy("user", userId) })
    .returning({ id: promotionBoosts.id });
  return row.id;
}
