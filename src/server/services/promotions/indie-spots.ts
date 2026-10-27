// 인디 게임 부스트가 함께 서는 한 칸 자리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4.2) — 홈 인디 줄 첫 칸, 게임 상세 "이런 인디 게임은 어때요".
//
// 따로 파는 자리를 만들지 않고 인디 목록 맨 위(indie_top) 부스트가 이 두 칸에도 선다. 자리마다 상품을 나누면 값표와 결제 대상이
// 그만큼 늘고, 산 사람 쪽에서는 "어디에 걸어야 하나" 를 고르는 일이 생긴다. 한 번 사면 인디 노출 자리 전부에 도는 편이 설명도 쉽다.
//
// 걸린 게임이 없으면 비워 두지 않고 광고 아닌 게임으로 채운다(2026-10-27 사용자: "채울 게 있으면 채우면 될듯"). 그때는 boostId 가 null 이라
// 화면이 "광고" 표시와 성과 세기를 붙이지 않는다.
import "server-only";
import { and, arrayOverlaps, asc, desc, eq, gt, isNull, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePosts, promotionBoosts } from "@/server/db/schema";
import { rotateForWindow } from "@/lib/promo/boost";
import { indieGenresOf } from "@/lib/indie/genre-match";
import type { IndieCardDto } from "@/lib/indie/dto";
import { cardColumns, isPublic, toCards, type CardRow } from "@/server/services/indie/read";

/** 한 칸 자리에 선 카드. 광고가 아니면 boostId 가 null 이다 */
export type IndieSpot = { boostId: string | null; item: IndieCardDto };

/** 지금 인디 목록 맨 위에 걸린 공개 글과 그 걸기 줄. 들어온 순서(글 id)로 세워 시간 구간 돌리기가 누구에게나 같게 한다 */
async function boostedIndie() {
  const rows = await getDb()
    .select({ ...cardColumns, gameId: indiePosts.gameId, boostId: promotionBoosts.id })
    .from(promotionBoosts)
    .innerJoin(indiePosts, eq(indiePosts.id, promotionBoosts.targetId))
    .where(and(eq(promotionBoosts.slot, "indie_top"), isNull(promotionBoosts.revokedAt), lte(promotionBoosts.startsAt, sql`now()`), gt(promotionBoosts.endsAt, sql`now()`), isPublic))
    .orderBy(asc(indiePosts.id), asc(promotionBoosts.startsAt));
  // 같은 글에 줄이 둘 이상이면(이어 붙인 결제) 먼저 시작한 줄 하나 — slots 의 activeBoostIds 와 같은 규칙.
  // 카드 칸(row)과 자리 판단 칸을 가른다 — toCards 는 받은 칸을 그대로 DTO 에 펴 넣는다
  const seen = new Set<string>();
  return rows.flatMap(({ gameId, boostId, ...row }) => (seen.has(row.id) ? [] : (seen.add(row.id), [{ row, gameId, boostId }])));
}

/** 카드 한 장으로 편다. 그새 그림이 지워져 카드가 안 되면 null */
async function oneCard(row: CardRow, boostId: string | null): Promise<IndieSpot | null> {
  const [item] = await toCards([row]);
  return item ? { boostId, item } : null;
}

/** 홈 인디 줄 첫 칸의 광고. 걸린 게임이 없으면 null — 줄은 원래 카드로만 선다 */
export async function homeIndieAd(): Promise<IndieSpot | null> {
  const boosted = await boostedIndie();
  const [picked] = rotateForWindow(boosted, 1, new Date());
  return picked ? oneCard(picked.row, picked.boostId) : null;
}

/**
 * 게임 상세 "이런 인디 게임은 어때요" 한 칸. 같은 장르 광고가 먼저, 없으면 아무 광고, 그것도 없으면 같은 장르의 찜 많은 인디 게임.
 * 장르가 안 맞고 광고도 없으면 null — 아무 인디 게임이나 세우면 추천이 아니다. 이 게임에 이어진 인디 글은 뺀다 — "개발자가 직접 소개해요" 마디가 이미 그 글이다
 */
export async function indieSpotForGame(gameId: string, gameGenres: readonly string[]): Promise<IndieSpot | null> {
  const genres = indieGenresOf(gameGenres);
  const sameGenre = (g: readonly string[]) => g.some((x) => (genres as string[]).includes(x));
  const boosted = (await boostedIndie()).filter((r) => r.gameId !== gameId);
  const now = new Date();
  const [ad] = rotateForWindow(boosted.filter((b) => sameGenre(b.row.genres)), 1, now);
  const [anyAd] = ad ? [ad] : rotateForWindow(boosted, 1, now);
  if (anyAd) return oneCard(anyAd.row, anyAd.boostId);
  if (genres.length === 0) return null;
  const [organic] = await getDb()
    .select(cardColumns)
    .from(indiePosts)
    .where(and(isPublic, arrayOverlaps(indiePosts.genres, genres), or(isNull(indiePosts.gameId), ne(indiePosts.gameId, gameId))))
    .orderBy(desc(indiePosts.likeCount), desc(indiePosts.createdAt))
    .limit(1);
  return organic ? oneCard(organic, null) : null;
}

/** 홈 줄에서 광고 카드와 같은 게임을 뺀다(같은 카드가 두 번 서지 않게) */
export function withoutSlug(cards: readonly IndieCardDto[], slug: string | undefined): IndieCardDto[] {
  return slug ? cards.filter((c) => c.slug !== slug) : [...cards];
}
