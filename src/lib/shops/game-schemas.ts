// 매장 발 게임 등록, 게임 찾기의 검증 규칙 — 서버 액션과 폼이 같은 스키마 하나를 본다(AGENTS §2).
import { z } from "zod";
import { normalizeForSearch } from "@/lib/slug";
import { SHOP_GAME_MESSAGES } from "./game-messages";

/**
 * 후보를 몇 줄까지 보여 주나. 한 화면에 손가락으로 훑을 수 있는 양이다 —
 * 더 늘리면 매장은 아래를 안 보고 "없다" 며 새로 만든다(그게 곧 중복이다).
 */
export const SHOP_GAME_SEARCH_LIMIT = 8;
/** 검색어 최소 길이. 한 글자는 카탈로그 7만 행에서 아무것도 못 가른다 */
export const SHOP_GAME_SEARCH_MIN = 2;
/** 제목 길이 상한. 상품 이름(PRODUCT_NAME_MAX)보다 길게 두는 이유는 부제가 붙는 옛 제목 때문이다 */
export const SHOP_GAME_TITLE_MAX = 120;
export const SHOP_GAME_PUBLISHER_MAX = 60;

export const shopGameSearchSchema = z.object({
  term: z.string().trim().min(SHOP_GAME_SEARCH_MIN, SHOP_GAME_MESSAGES.searchTooShort),
});

/**
 * 매장이 직접 만드는 게임. 받는 값이 적은 것이 의도다.
 *
 * 출시연도, 장르, 커버는 안 받는다 — 매장이 아는 값이 아니고, 억지로 받으면 빈칸이거나 틀린 값이 된다.
 * 기종은 상품 폼이 이미 받으므로 여기서 또 묻지 않고 그 값을 그대로 쓴다(레트로 판정에 쓰인다).
 */
export const shopGameCreateSchema = z.object({
  shopSlug: z.string().trim().min(1, SHOP_GAME_MESSAGES.badRequest),
  title: z.string().trim().min(1, SHOP_GAME_MESSAGES.badRequest).max(SHOP_GAME_TITLE_MAX, SHOP_GAME_MESSAGES.badRequest),
  publisher: z.string().trim().max(SHOP_GAME_PUBLISHER_MAX).optional(),
  hardwareCode: z.string().trim().max(32).optional(),
});

export type ShopGameCreateInput = z.infer<typeof shopGameCreateSchema>;

/**
 * 등록하려는 제목으로 다시 찾아야 하나 — §7 의 "제출 직전에 한 번 더 검색을 강제한다".
 *
 * 비교를 정규화본으로 하는 이유: 사람은 찾을 때 "젤다의 전설" 로 치고 등록할 때 "젤다의전설" 로 적는다.
 * 글자 그대로 견주면 그 띄어쓰기 하나 때문에 다시 찾으라는 말을 듣고, 두 번째부터는 아무도 안 읽는다.
 * 막아야 하는 것은 **찾은 것과 다른 게임을 등록하는 일**이지 띄어쓰기가 아니다.
 *
 * 화면과 서버가 같은 판단을 써야 한다 — 갈라지면 화면은 통과시키고 서버가 막는 폼이 된다.
 */
export function needsResearch(title: string, searchedTerm: string): boolean {
  return normalizeForSearch(title.trim()) !== normalizeForSearch(searchedTerm.trim());
}
