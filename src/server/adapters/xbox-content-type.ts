// Xbox 상품이 본편인지, 추가 콘텐츠인지, 체험판인지, 게임 아닌 앱인지 — 스토어 신호로만 가른다.
//
// xbox.ts 에서 떼어 낸 이유: 그 파일이 이미 300줄을 넘었고, 판정은 응답 형식과 무관한 순수 규칙이라 따로 시험하기 좋다.
//
// 2026-09-24 실측(우리 본편 8,452건 전수 재조회):
// - ProductKind 는 **전부 "Game"** 이었다. Xbox 발견이 게임 채널만 훑어서 앱(ProductKind "Application")은 들어오지 않는다.
// - 대신 Properties.IsDemo 가 true 인 체험판 5건이 본편으로 앉아 있었다(Crossy Road Castle Demo, ScreamRide Demo 등).
// - "Kinect Sports Rivals Hub" 는 IsDemo 도 true 인데 카테고리가 Companion 이다 — 체험판이 아니라 곁들이 앱이다.
// - 제목 끝의 "Trial" 로는 못 가른다: 스토어가 IsDemo false 로 주는 체험판이 있고(Little Ralph — Trial),
//   "Taboo Trial" 은 스팀에서 정식 게임으로 판다. 제목 규칙을 지어내지 않고 스토어가 말한 것만 따른다.
import { isCurrencyItemTitle, isPreOrderExtraTitle } from "@/lib/games/content-kind";

/** ProductKind 가 이 값이면 본편이 아니라 추가 콘텐츠다. 본편은 "Game" 으로 온다 */
export const XBOX_ADDON_KIND = "Durable";
/** 게임 아닌 앱. 발견 경로로는 안 들어오지만 검색 매칭이 데려올 수 있다 */
export const XBOX_APP_KIND = "Application";
/** 곁들이 앱 카테고리(실측: Kinect Sports Rivals Hub). 게임을 돕는 앱이지 게임이 아니다 */
export const XBOX_COMPANION_CATEGORY = "Companion";

export type XboxKindInput = {
  productKind: string | null | undefined;
  isDemo: boolean | null | undefined;
  categories: readonly string[] | null | undefined;
  title: string;
};

export type XboxContentType = "game" | "dlc" | "demo" | "software";

export function xboxContentType(p: XboxKindInput): XboxContentType {
  // ProductKind 가 "Game" 이어도 예약 특전, 예약 팩은 본편이 아니다 — 스토어가 안 가르는 자리다(lib/games/content-kind).
  // Sku.Properties.IsPreOrder 는 못 쓴다: 예약 중인 **본편**의 SKU 에도 true 가 실린다(2026-09-18 원문 확인)
  // 게임 안 재화, 교환권도 ProductKind 가 "Game" 으로 온다(실측: Forza Horizon 6 Car Voucher 4)
  if (p.productKind === XBOX_ADDON_KIND || isPreOrderExtraTitle(p.title) || isCurrencyItemTitle(p.title)) return "dlc";
  // 곁들이 앱을 체험판보다 먼저 본다 — Kinect Sports Rivals Hub 는 IsDemo 도 true 로 온다
  if (p.productKind === XBOX_APP_KIND || p.categories?.includes(XBOX_COMPANION_CATEGORY)) return "software";
  if (p.isDemo === true) return "demo";
  return "game";
}
