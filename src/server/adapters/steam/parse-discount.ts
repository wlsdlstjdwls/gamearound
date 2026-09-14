// 할인 행사명 해석 — Steam 은 `#discount_desc_*` 토큰을 주고, 모르는 토큰은 표시하지 않는다.
// 라벨을 지어내면 없는 행사가 화면에 뜨므로, 매핑에 없으면 계절 패턴만 보고 그래도 모르면 null 을 준다.
import { storeItemsSchema } from "./schemas";

export const STEAM_DISCOUNT_LABELS: Record<string, string> = {
  daily: "데일리 딜",
  midweek: "미드위크 할인",
  weekend: "주말 특가",
  weeklong: "주간 할인",
  special: "특별 할인",
  publisher: "퍼블리셔 세일",
  franchise: "프랜차이즈 세일",
  launch: "출시 기념 할인",
  prerelease: "예약 구매 할인",
  freeweekend: "무료 주말",
  bundle: "번들 할인",
};
const STEAM_SEASON_LABELS: Array<[RegExp, string]> = [
  [/spring/, "봄 세일"],
  [/summer/, "여름 세일"],
  [/autumn|fall/, "가을 세일"],
  [/winter/, "겨울 세일"],
  [/lunar/, "설 세일"],
  [/halloween|scream/, "할로윈 세일"],
  [/golden|award/, "스팀 어워드 페스티벌"],
  [/next[_-]?fest/, "넥스트 페스트"],
];

export function steamDiscountLabel(description: string | undefined): string | null {
  if (!description) return null;
  const key = description.replace(/^#?discount_desc_(preset_)?/, "").trim().toLowerCase();
  if (!key) return null;
  if (STEAM_DISCOUNT_LABELS[key]) return STEAM_DISCOUNT_LABELS[key];
  for (const [re, label] of STEAM_SEASON_LABELS) if (re.test(key)) return label;
  return null;
}

export type SteamDiscountInfo = { discountEndsAt: string | null; discountName: string | null };

/** GetItems 응답 → 할인 종료 시각(ISO)·행사명. 할인 중이 아니면 둘 다 null */
export function parseStoreItemDiscount(raw: unknown, appid: string): SteamDiscountInfo {
  const parsed = storeItemsSchema.safeParse(raw);
  if (!parsed.success) return { discountEndsAt: null, discountName: null };
  const items = parsed.data.response.store_items;
  const item = items.find((i) => String(i.appid) === appid) ?? items[0];
  const discount = item?.best_purchase_option?.active_discounts?.[0];
  if (!discount) return { discountEndsAt: null, discountName: null };
  const end = discount.discount_end_date;
  return {
    discountEndsAt: end && end > 0 ? new Date(end * 1000).toISOString() : null,
    discountName: steamDiscountLabel(discount.discount_description),
  };
}

/**
 * GetItems assets → 이미지 절대 URL. asset_url_format 의 ${FILENAME} 자리에 해당 에셋 파일명을 끼운다.
 * kind="header" 는 460×215 가로 배너(카드용), "library_capsule" 은 600×900 세로 아트(상세 헤더용).
 */
