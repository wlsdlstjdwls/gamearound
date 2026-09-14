// Steam 응답 스키마 — 외부 JSON 은 unknown 으로 받아 zod 로만 통과시킨다.
// 스토어 응답이 바뀌면 파서가 잘못된 값을 반영하는 대신 여기서 형식 오류로 멈춘다.
import { z } from "zod";

// ---- 응답 스키마 (unknown → zod) ----
export const priceOverviewSchema = z.object({
  currency: z.string().optional(),
  initial: z.number(), // 센트 단위 (KRW × 100)
  final: z.number(),
  discount_percent: z.number().optional(),
});

export const appDataSchema = z.object({
  type: z.string().optional(),
  name: z.string(),
  steam_appid: z.number().optional(),
  is_free: z.boolean().optional(),
  short_description: z.string().optional(),
  header_image: z.string().optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  price_overview: priceOverviewSchema.optional(),
  categories: z.array(z.object({ id: z.number(), description: z.string() })).optional(),
  genres: z.array(z.object({ id: z.union([z.string(), z.number()]), description: z.string() })).optional(),
  release_date: z.object({ coming_soon: z.boolean().optional(), date: z.string().optional() }).optional(),
});

export const appDetailsResponseSchema = z.record(
  z.string(),
  z.object({ success: z.boolean(), data: appDataSchema.optional() }),
);

export const storeSearchSchema = z.object({
  total: z.number().optional(),
  items: z
    .array(z.object({ id: z.number(), name: z.string(), type: z.string().optional() }))
    .default([]),
});

export const featuredItemSchema = z.object({ id: z.number(), name: z.string().optional(), type: z.number().optional() });
export const featuredCategoriesSchema = z.object({
  top_sellers: z.object({ items: z.array(featuredItemSchema).default([]) }).optional(),
  specials: z.object({ items: z.array(featuredItemSchema).default([]) }).optional(),
});

/** GetItems 의 구매 옵션 — 가격 3종 + 할인 기간·행사명이 모두 여기 있다 */
export const purchaseOptionSchema = z.object({
  /** 문자열로 온다 (센트 단위, KRW × 100) */
  final_price_in_cents: z.string().optional(),
  original_price_in_cents: z.string().optional(),
  discount_pct: z.number().optional(),
  active_discounts: z
    .array(z.object({ discount_end_date: z.number().optional(), discount_description: z.string().optional() }))
    .default([]),
});

export const storeItemSchema = z.object({
  appid: z.number().optional(),
  /** 0 = 앱(게임). 1 이상은 패키지/번들 — 게임 마스터로 만들지 않는다 */
  item_type: z.number().optional(),
  success: z.number().optional(),
  visible: z.boolean().optional(),
  name: z.string().optional(),
  is_free: z.boolean().optional(),
  best_purchase_option: purchaseOptionSchema.optional(),
  basic_info: z
    .object({
      short_description: z.string().optional(),
      developers: z.array(z.object({ name: z.string() })).default([]),
      publishers: z.array(z.object({ name: z.string() })).default([]),
    })
    .optional(),
  assets: z
    .object({
      asset_url_format: z.string().optional(),
      header: z.string().optional(),
      /** 600×900 세로 아트. 구작은 "library_600x900.jpg", 신작은 "<해시>/library_capsule.jpg" */
      library_capsule: z.string().optional(),
    })
    .optional(),
  release: z.object({ steam_release_date: z.number().optional(), is_coming_soon: z.boolean().optional() }).optional(),
  categories: z.object({ supported_player_categoryids: z.array(z.number()).default([]) }).optional(),
  tagids: z.array(z.number()).default([]),
});

export const storeItemsSchema = z.object({
  response: z.object({ store_items: z.array(storeItemSchema).default([]) }).default({ store_items: [] }),
});

/** search/results?json=1 — items 에 appid 가 없고 logo URL(.../apps/<appid>/...) 에만 들어 있다 */
export const searchResultsSchema = z.object({
  items: z.array(z.object({ name: z.string().optional(), logo: z.string().optional() })).default([]),
});
export const APP_ID_IN_LOGO_URL = /\/apps\/(\d+)\//;

export type SteamAppData = z.infer<typeof appDataSchema>;

export type StoreItem = z.infer<typeof storeItemSchema>;
