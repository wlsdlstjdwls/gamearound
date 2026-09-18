// 매장이 상품에 걸 게임을 고르고, 없으면 만드는 자리 — 매장 설계서 §5.1, §7.
//
// 왜 services/games 가 아니라 여기인가: 저쪽 조회는 전부 `mainGamesOnly()` 를 거친다.
// 손님 화면의 계약이 "스토어와 이어진 공개 본편만" 이기 때문이다. 매장은 그 반대를 봐야 한다 —
// 아직 공개되지 않은 자기 임시 게임, 크롤러가 못 찾은 일본판, DLC 코드 카드까지 팔 물건의 후보다.
// 두 계약을 한 함수에 접으면 언젠가 손님 목록에 임시 행이 샌다.
//
// 캐시를 걸지 않는다. 매장이 방금 만든 게임이 다음 줄에서 후보로 떠야 하는데,
// 목록 캐시를 타면 그 사이가 한 시간이다(3단계 결정과 같은 이유).
import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, hardwareModels } from "@/server/db/schema";
import { createdBy, type AuditSource } from "@/server/db/audit";
import { titleMatch, titleMatches, isMissingTrgm } from "@/server/services/games/title-search";
import { hasHangul, normalizeForSearch, slugify, slugWithSuffix } from "@/lib/slug";
import { SHOP_GAME_MESSAGES } from "@/lib/shops/game-messages";
import { SHOP_GAME_SEARCH_LIMIT, type ShopGameCreateInput } from "@/lib/shops/game-schemas";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";

/**
 * 제목으로 게임 후보 찾기. 검색 화면과 같은 조건(titleMatch)을 쓴다 —
 * 매장이 "안 나온다" 며 새로 만든 게임이 정작 손님 검색에는 있는 어긋남을 막는다.
 *
 * 걸러내는 것은 수집 제외 행뿐이다. 레트로 행에 디지털 상품을 걸 일은 없고,
 * 걸리면 그 상세가 매장 시세 대신 엉뚱한 디지털 가격을 머리에 건다.
 */
export async function searchShopGames(term: string, limit = SHOP_GAME_SEARCH_LIMIT): Promise<ShopGameOptionDto[]> {
  const db = getDb();
  const { norm, hit, score } = titleMatch(term);
  if (!norm) return [];

  const columns = {
    id: games.id,
    titleKo: games.titleKo,
    titleEn: games.titleEn,
    publisher: games.publisher,
    contentType: games.contentType,
    visibility: games.visibility,
  };
  try {
    return await db
      .select(columns)
      .from(games)
      .where(and(eq(games.crawlExcluded, false), titleMatches({ hit, score })))
      .orderBy(sql`${hit} desc`, sql`${score} desc`, games.titleEn)
      .limit(limit);
  } catch (err) {
    // trigram 확장이 없는 환경(로컬 복제본)에서도 부분일치만으로는 서야 한다 — 검색 화면과 같은 폴백
    if (!isMissingTrgm(err)) throw err;
    return db
      .select(columns)
      .from(games)
      .where(and(eq(games.crawlExcluded, false), hit))
      .orderBy(games.titleEn)
      .limit(limit);
  }
}

/** slug 충돌 처리. 매장 발 게임에는 외부 ID 가 없어 매장 slug 를 접미어로 쓴다 */
async function uniqueSlug(titleEn: string, shopSlugHint: string): Promise<string> {
  const db = getDb();
  const base = slugify(titleEn);
  const candidates = [base, slugWithSuffix(base, shopSlugHint), slugWithSuffix(base, `${shopSlugHint}-${Date.now()}`)];
  for (const c of candidates) {
    const hit = await db.select({ id: games.id }).from(games).where(eq(games.slug, c)).limit(1);
    if (!hit[0]) return c;
  }
  return candidates[candidates.length - 1];
}

/**
 * 정규화 제목이 똑같은 기존 게임. 서버가 마지막으로 한 번 더 보는 자리다.
 *
 * 폼이 제출 직전에 재검색을 강제하지만(§7) 그것은 화면의 약속이라 우회된다.
 * 같은 제목을 두 행으로 만드는 일만은 질의로 막는다 — 중복은 만들기는 쉽고 접기는 비싸다.
 */
async function findByExactTitle(title: string): Promise<{ id: string } | null> {
  // 생성 컬럼(title_en_norm)과 같은 규칙을 쓰는 함수를 그대로 쓴다. 손으로 다시 적으면 둘이 어긋난다
  const norm = normalizeForSearch(title);
  if (!norm) return null;
  const rows = await getDb()
    .select({ id: games.id })
    .from(games)
    .where(or(eq(games.titleEnNorm, norm), eq(games.titleKoNorm, norm)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 매장이 만드는 게임 — 승인이 없다(§7). 대신 두 컬럼이 오염을 막는다.
 *
 * `visibility = 'shop_only'` 라 전체 목록, 검색, 홈에 안 나온다. 매장 페이지와 그 상품에서만 보인다.
 * `crawlExcluded` 는 고른 기종이 레트로인가로 정한다 — 매장에 묻지 않는다. 슈퍼패미컴을 고른 사람이
 * "이걸 온라인에서 긁을 수 있나" 까지 답할 이유가 없고, 답을 물으면 대개 기본값 그대로 낸다.
 *
 * `titleEn` 에 한글이 들어가는 것을 허용한다. 스토어가 영문 이름을 주기 전까지는 그것이 우리가 아는
 * 유일한 이름이고, 역방향 수집(§5.3)이 스토어를 붙이는 날 `isTitleEnRecovery` 가 되찾아 간다.
 */
export async function createShopGame(
  input: ShopGameCreateInput,
  actor: { source: AuditSource; userId?: string },
): Promise<string> {
  const db = getDb();
  const title = input.title.trim();
  const existing = await findByExactTitle(title);
  if (existing) return existing.id;

  const retro = input.hardwareCode ? await isRetroHardware(input.hardwareCode) : false;
  const slug = await uniqueSlug(title, input.shopSlug);
  const [row] = await db
    .insert(games)
    .values({
      slug,
      titleEn: title,
      titleKo: hasHangul(title) ? title : null,
      publisher: input.publisher || null,
      origin: "shop",
      visibility: "shop_only",
      crawlExcluded: retro,
      ...createdBy(actor.source, actor.userId),
    })
    .returning({ id: games.id });
  if (!row) throw new Error(SHOP_GAME_MESSAGES.createFailed);
  return row.id;
}

/** 고른 기종이 레트로인가. 기종 사전이 답을 갖고 있으니 매장에 되묻지 않는다(§6) */
async function isRetroHardware(code: string): Promise<boolean> {
  const rows = await getDb()
    .select({ isRetro: hardwareModels.isRetro })
    .from(hardwareModels)
    .where(eq(hardwareModels.code, code))
    .limit(1);
  return rows[0]?.isRetro ?? false;
}
