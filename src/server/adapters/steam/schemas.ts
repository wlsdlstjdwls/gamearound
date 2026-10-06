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
  /** "game" | "dlc" | "demo" | "music" ... — DLC 판별의 1차 근거 (2026-09-14 실측) */
  type: z.string().optional(),
  name: z.string(),
  steam_appid: z.number().optional(),
  /** 본편이 알려주는 DLC appid 목록. 엘든 링(1245620) 에서 [3655690, 2778590, 2778580] 확인 */
  dlc: z.array(z.number()).optional(),
  /** DLC 가 알려주는 본편. appid 가 문자열로 온다 */
  fullgame: z.object({ appid: z.union([z.string(), z.number()]).optional(), name: z.string().optional() }).optional(),
  is_free: z.boolean().optional(),
  short_description: z.string().optional(),
  header_image: z.string().optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  price_overview: priceOverviewSchema.optional(),
  categories: z.array(z.object({ id: z.number(), description: z.string() })).optional(),
  /**
   * 지원 언어. 목록이 아니라 HTML 문자열 하나로 온다(2026-10-06 실측, 엘든 링):
   * "영어<strong>*</strong>, 프랑스어, ..., 한국어, ...<br><strong>*</strong>음성이 지원되는 언어".
   * 별표가 붙은 언어가 음성 지원이다. 화면과 자막은 가르지 않는다.
   */
  supported_languages: z.string().optional(),
  genres: z.array(z.object({ id: z.union([z.string(), z.number()]), description: z.string() })).optional(),
  release_date: z.object({ coming_soon: z.boolean().optional(), date: z.string().optional() }).optional(),
  /**
   * 단건 경로의 구동 환경. 배치(GetItems)와 달리 **덱 등급은 없고** OS 세 개만 준다
   * (2026-09-18 실측: 엘든 링 {windows:true, mac:false, linux:false}).
   * 그래서 덱 등급의 출처는 배치 경로 하나뿐이다.
   */
  platforms: z.object({ windows: z.boolean().optional(), mac: z.boolean().optional(), linux: z.boolean().optional() }).optional(),
  /**
   * 구동 사양. 값이 구조체가 아니라 **HTML 문자열**이고(`<strong>라벨:</strong> 값` 이 `<li>` 로 나열),
   * 사양이 아예 없는 게임에는 객체 대신 **빈 배열**이 온다. 두 모양이 다 오므로 여기서는 형을 세우지 않고
   * unknown 으로 받아 parse-requirements 가 가른다 — zod 로 좁히면 빈 배열 응답이 형식 오류가 돼
   * 그 게임의 가격 수집까지 통째로 멈춘다.
   */
  pc_requirements: z.unknown().optional(),
  mac_requirements: z.unknown().optional(),
  linux_requirements: z.unknown().optional(),
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

/** GetItems 의 구매 옵션 — 가격 3종 + 할인 기간, 행사명이 모두 여기 있다 */
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
  /** EStoreAppType — 0 게임, 4 DLC. 배치 경로의 유일한 DLC 판별 근거다 */
  type: z.number().optional(),
  /** DLC 가 가리키는 본편. 본편에는 이 필드가 없다(= 역방향 목록은 GetItems 가 주지 않는다) */
  related_items: z.object({ parent_appid: z.number().optional() }).optional(),
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
  /**
   * 구동 환경(data_request.include_platforms). 이미 켜 놓고 받던 값인데 파서가 버리고 있었다 —
   * 요청을 늘리지 않고 스팀덱 등급과 OS 네이티브 지원을 같이 준다(2026-09-18 실측: 엘든 링 3=verified,
   * CS2 는 steamos_linux=true). steam_os_compat_category, steam_machine_compat_category 도 함께 오지만
   * 담지 않는다(schema 의 steam_deck_compat 주석).
   */
  platforms: z
    .object({
      windows: z.boolean().optional(),
      mac: z.boolean().optional(),
      steamos_linux: z.boolean().optional(),
      steam_deck_compat_category: z.number().optional(),
    })
    .optional(),
  /**
   * 유저 리뷰 요약(data_request.include_reviews). 두 묶음이 온다 —
   * summary_filtered 는 전체, summary_language_specific 은 요청 언어(한국어)만이다.
   * 전체를 쓴다: 한국어 리뷰만 세면 표본이 20분의 1로 줄어 값이 튄다
   * (2026-09-15 실측, 팰월드: 전체 411,416건 94% 대 한국어 23,143건 95%).
   */
  reviews: z
    .object({
      summary_filtered: z
        .object({
          review_count: z.number().optional(),
          percent_positive: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
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
