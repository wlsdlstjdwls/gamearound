// gamearound DB 스키마 — 설계서 §3.2 그대로. 확장1 테이블은 미정의(§3.3 컬럼만 문서화).
import {
  pgTable, pgEnum, uuid, text, integer, numeric, boolean,
  timestamp, date, jsonb, primaryKey, index, uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
// 발견 요약의 형태는 sync/discover 가 정한다. 타입만 가져오므로 런타임 의존은 생기지 않는다 —
// 여기서 모양을 한 번 더 적으면 두 곳이 말없이 어긋난다
import type { DiscoveryLog } from "@/server/sync/discover";
import { auditColumns } from "./audit";

// 매장 도메인은 파일을 갈라 둔다(schema-shops.ts). 여기서 재수출하므로 호출부 import 경로는 그대로다 —
// `@/server/db/schema` 하나만 보면 된다.
export * from "./schema-shops";

export const platformEnum = pgEnum("platform", ["steam", "ps5", "ps4", "xbox", "switch", "switch2", "epic", "gog"]);
// wikidata 와 wikidata_game 을 가른 이유: 같은 백과사전이지만 조회 대상이 다르다.
// wikidata 는 회사 항목을, wikidata_game 은 게임 항목을 찾는다. 한 소스로 합치면
// game_source_refs 한 행에 회사 Q번호와 게임 Q번호가 섞이고, 디스패치도 갈 곳을 못 정한다.
export const sourceEnum = pgEnum("source", ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "hltb", "opencritic", "metacritic", "rss", "manual", "wikidata", "wikidata_game", "gamepass", "epic", "gog"]);
export const roleEnum = pgEnum("role", ["user", "game_company", "seller", "admin"]);
export const syncStatusEnum = pgEnum("sync_status", ["ok", "partial", "failed"]);
/**
 * 가격의 통화. 스토어가 그 나라에 파는 통화를 그대로 담는다 — 환산하지 않는다.
 * GOG 는 한국에도 USD 로 판다(2026-09-14 확인: currencyCode=KRW 로 조회하면 0건).
 * 임의 환율로 바꿔 적으면 화면 가격과 실제 결제액이 어긋나고, 그건 가격 알림 서비스에서 제일 하면 안 되는 일이다.
 */
export const currencyEnum = pgEnum("currency", ["KRW", "USD", "JPY"]);

/**
 * 가격이 어느 나라 스토어의 것인지. 같은 게임, 같은 기기라도 스토어가 나라별로 따로라
 * 가격도 판매 여부도 다르다 — 한국 eShop 미발매작이 일본 eShop 에는 있다(2026-09-14).
 *
 * 왜 platform 을 늘리지 않았나: 기기는 그대로 Switch 다. 지역은 "어디서 파느냐" 라는 다른 축이고,
 * 이 축을 platform 에 접으면(switch_jp 같은 값) 기기별 필터, 배지가 전부 지역만큼 늘어난다.
 */
export const regionEnum = pgEnum("region", ["KR", "JP"]);
/** 화면과 수집의 기준 지역. 이 값이 아닌 행은 "참고 가격" 으로만 보여 준다 */
export const HOME_REGION = "KR" as const;

/**
 * 게임 레코드의 성격. DLC 를 별도 테이블이 아니라 games 행으로 담는 이유(기획서 5.4):
 * price_snapshots, price_alerts, wishlists 가 전부 game_platforms 에 붙어 있어
 * DLC 를 분리하면 가격 이력과 알림 경로를 통째로 복제해야 한다.
 * edition(디럭스판), bundle(묶음)은 지금 채우지 않지만 어휘를 미리 열어 둔다 — 나중에 enum 을 늘리면 마이그레이션이 또 필요하다.
 * demo(체험판)를 지우지 않고 분류로 빼는 이유: 체험판 935건 중 253건은 우리가 직접 수집한
 * 가격이 붙어 있다. 지우면 그 수집 결과까지 날아간다. 목록은 content_type='game' 만 보므로
 * 분류만 옮기면 본편인 척 섞이는 문제는 사라지고, 나중에 체험판 화면이 필요해지면 그대로 쓴다.
 * music(사운드트랙)도 같은 이유로 둔다: 스팀 출시예정 목록 100건 중 7건이 독립 상품으로 나온
 * 사운드트랙이었다(2026-09-16 실측). 본편에 딸린 사운드트랙은 dlc 로 오지만 이쪽은 부모 없이
 * 혼자 서서, 가르지 않으면 출시예정 목록이 OST 로 찬다.
 */
export const contentTypeEnum = pgEnum("content_type", ["game", "dlc", "edition", "bundle", "demo", "music"]);
/** 회사가 이 게임에 대해 가진 역할. 같은 회사가 개발과 배급을 겸하면 행 2개가 된다 */
export const companyRoleEnum = pgEnum("company_role", ["developer", "publisher"]);
/**
 * 세대 간 업그레이드 방식. Switch 2 Edition 전용이 아니라 세대 중립으로 둔다 —
 * PS4 에서 PS5 로의 무료 업그레이드, Xbox Smart Delivery 가 같은 모양이다.
 */
export const upgradeKindEnum = pgEnum("upgrade_kind", ["free", "paid", "subscription_included"]);
/**
 * 유저 점수의 척도. 스토어마다 재는 방식이 달라 값만으로는 무슨 뜻인지 알 수 없다.
 *   positive_ratio = 긍정 리뷰 비율(Steam. "94% 가 긍정적")
 *   star_average   = 5점 만점 평균 별점(Xbox. "3.9 / 5")
 * 한 숫자로 합치지 않는 이유: "94% 가 좋다고 했다" 와 "평균 3.9점" 은 다른 사실이다.
 * 화면이 이 값을 보고 문장을 고른다.
 */
export const userScoreKindEnum = pgEnum("user_score_kind", ["positive_ratio", "star_average"]);
/**
 * 밸브가 매긴 스팀덱 구동 등급. 우리가 판정한 값이 아니라 밸브의 검증 결과를 그대로 옮긴다.
 *   verified    밸브가 검증했고 손댈 것 없이 돌아간다
 *   playable    돌아가지만 손이 간다(작은 글씨, 가상 키보드 필요 등)
 *   unsupported 안 돌아간다
 * "모름"(밸브가 아직 안 봤다)은 값으로 두지 않고 NULL 이다 — §7 의 "null 로 덮지 않는다" 규칙을
 * 그대로 태우기 위해서다. 등급을 아는 행이 응답 한 번 어긋났다고 "모름" 으로 내려가면 안 된다.
 */
export const deckCompatEnum = pgEnum("deck_compat", ["verified", "playable", "unsupported"]);
/**
 * 사양이 어느 OS 의 것인가. 스팀은 pc/mac/linux 세 덩어리로 주는데 "pc" 는 사실 윈도우라
 * 우리 어휘에서는 windows 로 적는다 — mac 도 linux 도 PC 다.
 */
export const osFamilyEnum = pgEnum("os_family", ["windows", "mac", "linux"]);
/** 최소 사양인가 권장 사양인가. 권장은 표본 60건 중 49건에만 있었다(2026-09-18 실측) — 없는 것이 정상이다 */
export const requirementTierEnum = pgEnum("requirement_tier", ["minimum", "recommended"]);
/** 판정이 견주는 부품. 메모리, 저장공간은 숫자라 후보가 필요 없고 이 둘만 "A 또는 B" 로 온다 */
export const partKindEnum = pgEnum("part_kind", ["cpu", "gpu"]);

export type Platform = (typeof platformEnum.enumValues)[number];
export type SourceName = (typeof sourceEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type SyncStatus = (typeof syncStatusEnum.enumValues)[number];
export type UserScoreKind = (typeof userScoreKindEnum.enumValues)[number];
export type DeckCompat = (typeof deckCompatEnum.enumValues)[number];
export type OsFamily = (typeof osFamilyEnum.enumValues)[number];
export type RequirementTier = (typeof requirementTierEnum.enumValues)[number];
export type PartKind = (typeof partKindEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
export type Region = (typeof regionEnum.enumValues)[number];
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type CompanyRole = (typeof companyRoleEnum.enumValues)[number];
export type UpgradeKind = (typeof upgradeKindEnum.enumValues)[number];

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleKo: text("title_ko"),
  titleEn: text("title_en").notNull(),
  description: text("description"),
  // 가로 배너(460×215, Steam header.jpg) — 카드, 목록용
  coverUrl: text("cover_url"),
  // 세로 아트(600×900, Steam library_capsule) — 상세 헤더의 세로 슬롯용. 없으면 coverUrl 로 폴백
  portraitUrl: text("portrait_url"),
  developer: text("developer"),
  publisher: text("publisher"),
  // 멀티플레이 정보 — 기획서 3-6
  localMaxPlayers: integer("local_max_players"),
  onlineMaxPlayers: integer("online_max_players"),
  supportsSolo: boolean("supports_solo").default(true),
  supportsCoop: boolean("supports_coop").default(false),
  supportsPvp: boolean("supports_pvp").default(false),
  isRetro: boolean("is_retro").default(false),
  /** 본편인지 DLC 인지. 목록, 검색, 홈은 game 만 본다(lib/games-query.ts 한 곳에서 거른다) */
  contentType: contentTypeEnum("content_type").default("game").notNull(),
  /** DLC 가 가리키는 본편. contentType 이 game 이면 null. 본편이 지워지면 DLC 도 같이 지운다 */
  parentGameId: uuid("parent_game_id").references((): AnyPgColumn => games.id, { onDelete: "cascade" }),
  /**
   * 검색용 정규화 제목 — 소문자 + 영숫자, 한글, 가나, 한자 외 전부 제거.
   * "엘든 링" / "ELDEN RING:" 처럼 공백, 구두점만 다른 질의를 흡수한다(§4.2 normalizeTitle 의 DB 판).
   * [:alnum:] 은 C.UTF-8 에서 한글, 가나, 한자를 포함하고 공백, ™, : 는 제외한다(2026-09-14 확인).
   * 한/영을 한 컬럼에 합치지 않는 이유: similarity() 가 긴 문자열에서 희석돼 한글 질의가 임계값 아래로 떨어진다.
   * 생성 컬럼이라 크롤러가 따로 갱신하지 않는다 — title_en/title_ko 만 쓰면 자동으로 따라온다.
   */
  titleEnNorm: text("title_en_norm").generatedAlwaysAs(
    sql`lower(regexp_replace(title_en, '[^[:alnum:]]+', '', 'g'))`,
  ),
  titleKoNorm: text("title_ko_norm").generatedAlwaysAs(
    sql`lower(regexp_replace(coalesce(title_ko, ''), '[^[:alnum:]]+', '', 'g'))`,
  ),
  ...auditColumns(),
}, (t) => [
  index("games_title_en_idx").on(t.titleEn),
  // 목록 쿼리가 매번 content_type='game' 으로 거르고, 상세는 parent_game_id 로 DLC 를 모은다
  index("games_content_parent_idx").on(t.contentType, t.parentGameId),
]);

/**
 * 검색 별칭 — 제목 어디에도 없는 말로 게임을 찾게 하는 유일한 경로.
 *
 * 왜 필요한가: 검색은 정규화 제목 두 컬럼만 본다. 그래서 "해리포터" 로는 "호그와트 레거시" 가
 * 영원히 안 나온다 — 부분일치도 trigram 도 **같은 글자가 하나도 없으면** 손을 못 쓴다.
 * 시리즈명, 원작명, 약칭, 흔한 오표기는 제목에서 끌어낼 수 있는 값이 아니라 사람이 아는 값이다.
 *
 * 크롤러는 이 테이블을 쓰지 않는다. 그래서 data_corrections 잠금도 걸지 않는다 —
 * 덮어쓸 상대가 없다. 나중에 자동 출처(위키데이터 P179 시리즈 등)를 붙이면
 * 그때 출처 컬럼을 더하고 수동 행을 지키는 규칙을 같이 만든다.
 */
export const gameAliases = pgTable("game_aliases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  alias: text("alias").notNull(),
  /**
   * 이 별칭을 누가 넣었나. 자동 수집이 자기가 넣은 것만 지우고 다시 쓰기 위해 필요하다 —
   * 사람이 넣은 별칭("manual")은 어떤 수집도 건드리지 않는다.
   */
  source: sourceEnum("source").default("manual").notNull(),
  /** games.title_en_norm 과 **같은 식**이어야 한다 — 질의는 한쪽만 정규화해 두 컬럼에 함께 던진다 */
  aliasNorm: text("alias_norm").generatedAlwaysAs(
    sql`lower(regexp_replace(alias, '[^[:alnum:]]+', '', 'g'))`,
  ),
  ...auditColumns(),
}, (t) => [
  // 같은 게임에 같은 별칭을 두 번 넣지 못하게 — 원문이 아니라 정규화본으로 막는다
  // ("해리 포터" 와 "해리포터" 는 질의에서 어차피 같은 값이 된다).
  // game_id 로 시작하므로 "이 게임의 별칭들" 조회도 이 인덱스가 받는다 — 인덱스를 따로 두지 않는다
  uniqueIndex("game_aliases_game_norm_uq").on(t.gameId, t.aliasNorm),
]);

export const genres = pgTable("genres", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  ...auditColumns(),
});

export const gameGenres = pgTable("game_genres", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  genreId: integer("genre_id").references(() => genres.id).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.gameId, t.genreId] })]);

export const gamePlatforms = pgTable("game_platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  platform: platformEnum("platform").notNull(),
  storeExternalId: text("store_external_id"),
  storeUrl: text("store_url"),
  releaseDate: date("release_date"),
  currentVersion: text("current_version"),
  /**
   * 가격은 통화의 최소 단위 정수다 — KRW 는 원(소수 없음), USD 는 센트(6.99달러 = 699).
   * 소수를 쓰지 않는 이유: 부동소수 반올림이 알림 임계값 비교에 섞이면 안 된다.
   */
  listPrice: integer("list_price"),
  currentPrice: integer("current_price"),
  discountPct: integer("discount_pct"),
  // 할인 기간, 행사명 (기획서 3-2 "할인 가격 그래프", dekudeals 참고). 소스가 주는 만큼만 채운다:
  // steam=IStoreBrowseService active_discounts(종료시각+행사 토큰), xbox=Availability.Conditions(시작, 종료), 그 외 null
  discountStartsAt: timestamp("discount_starts_at", { withTimezone: true }),
  discountEndsAt: timestamp("discount_ends_at", { withTimezone: true }),
  discountName: text("discount_name"),
  /** 위 가격 두 개의 통화. 비교, 집계는 같은 통화끼리만 한다(services 의 DISPLAY_CURRENCY) */
  currency: currencyEnum("currency").default("KRW").notNull(),
  metacriticScore: integer("metacritic_score"),
  opencriticScore: integer("opencritic_score"),
  /**
   * 그 스토어에서 실제로 산 사람들이 매긴 점수 — 평론가 점수(위 둘)와 다른 축이다.
   *
   * 0~100 정수 하나로 저장하고 뜻은 user_score_kind 가 말한다. 별점은 20을 곱해 넣는다
   * (3.9 -> 78). 소수 한 자리까지만 오는 값이라 되돌릴 때 손실이 없고, 척도가 다른 스토어끼리도
   * "높은 쪽" 을 고를 수 있다. 화면에 적을 때는 kind 를 보고 원래 말로 되돌린다.
   *
   * 채우는 소스(2026-09-15 실측): steam = GetItems 의 reviews.summary_filtered(가격 배치에 얹혀 추가 요청 0),
   * xbox = displaycatalog 의 MarketProperties[].UsageData 중 AllTime(역시 추가 요청 0).
   * PlayStation 도 값은 있으나(콘셉트 페이지 HTML 의 averageRating) 응답이 건당 1MB 라 가격 경로에 얹지 않는다.
   * 닌텐도, Epic, GOG 는 공개된 유저 점수가 없다.
   */
  userScore: integer("user_score"),
  userScoreKind: userScoreKindEnum("user_score_kind"),
  /** 그 점수를 만든 사람 수. 100명의 90점과 5만명의 90점은 다른 값이라 함께 적는다 */
  userScoreCount: integer("user_score_count"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),  // UI "갱신 시각" 표시 원천
  syncStatus: syncStatusEnum("sync_status").default("ok"),
  /**
   * 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값(xbox Properties.HasAddOns).
   * DLC 목록을 못 가져오는 플랫폼에서도 유무 배지는 띄우기 위한 것 — 목록과 별개의 신호다.
   */
  hasAddOns: boolean("has_add_ons"),
  /**
   * 이 본편의 DLC 목록을 스토어에 마지막으로 물어본 시각.
   * 배치 조회(steam GetItems)는 자식이 부모를 가리키는 방향만 주고 본편이 가진 DLC 목록은 주지 않아,
   * 목록은 단건 요청(appdetails)을 한 번 더 보내야 얻는다. 요청이 비싸므로 언제 물어봤는지를 남겨
   * 같은 본편을 매 실행 다시 묻지 않는다(sync/dlc-list 의 DLC_LIST_REFRESH_DAYS).
   */
  dlcListedAt: timestamp("dlc_listed_at", { withTimezone: true }),
  /**
   * 이 가격을 파는 스토어의 나라. 한 게임, 한 기기라도 나라 수만큼 행이 생긴다
   * (닌텐도 스위치 = 한국 eShop 행 + 일본 eShop 행). 통화도 그 나라의 것이다.
   */
  region: regionEnum("region").default("KR").notNull(),
  /**
   * 스토어가 쓰는 "작품" 코드. nsuid 같은 판매 단위 ID 와 다르다 — 그쪽은 나라마다 다른 값이지만
   * 이 코드는 같은 작품이면 나라가 달라도 같다(2026-09-14 실측: 한국 SKU HACPA5WZA 와
   * 일본 icode A5WZA 가 같은 No Man's Sky).
   *
   * 쓰는 곳: 일본 eShop 에서 발견한 상품이 우리가 이미 아는 게임인지 판정한다. 제목으로는 못 한다 —
   * 일본 제목이 가타카나면("ア フォルド エーパート") 영문 카탈로그와 유사도가 0 이다.
   * 지금은 닌텐도만 채운다. 다른 스토어가 같은 성격의 코드를 주면 그때 같이 쓴다.
   */
  titleCode: text("title_code"),
  /**
   * 이 행의 패치 기록을 스토어에 마지막으로 물어본 시각.
   * dlc_listed_at 과 같은 성격이다 — 패치 목록도 게임 1개가 요청 1회라(steam ISteamNews, gog changelog)
   * 매 실행 전부 다시 묻지 않도록 언제 물어봤는지를 남긴다(sync/patch-list 의 PATCH_LIST_REFRESH_DAYS).
   */
  patchListedAt: timestamp("patch_listed_at", { withTimezone: true }),
  /**
   * 이 행의 사양을 스토어에 마지막으로 물어본 시각. dlc_listed_at, patch_listed_at 과 같은 성격이다 —
   * 사양은 배치로 못 받아 게임 1개가 요청 1회다(GetItems 에는 requirement 계열 키가 없다, 2026-09-18 실측).
   *
   * 다른 둘보다 이 값이 더 중요하다: 사양은 **거의 안 변한다**. 재발매나 대규모 패치 때만 바뀌므로
   * 한 바퀴 돌고 나면 다시 물을 일이 거의 없다(REQUIREMENTS_REFRESH_DAYS).
   */
  requirementsListedAt: timestamp("requirements_listed_at", { withTimezone: true }),
  /**
   * 스팀덱 구동 등급(밸브 판정). 값의 뜻은 deckCompatEnum 주석에 있다.
   *
   * 여기(game_platforms)에 두는 이유: 같은 게임이라도 이 사실은 스팀 스토어의 성질이다.
   * 게임 위에 올리면 PS 탭을 보는 사람에게도 덱 배지가 뜬다 — 구독 배지를 플랫폼 행에 매단 것과 같은 이유다.
   *
   * 수집 원가 0(2026-09-18 실측): GetItems 의 platforms 안에 이미 실려 온다. 요청도 파라미터도 늘지 않고
   * 파서가 버리던 값을 주울 뿐이다. 응답은 SteamOS, 스팀 머신 등급도 같이 주지만 담지 않는다 —
   * 지금 화면이 답하는 질문은 "내 덱에서 돌아가나" 하나뿐이고, 안 쓰는 열은 소급 백필 대상만 늘린다.
   */
  deckCompat: deckCompatEnum("steam_deck_compat"),
  /**
   * 그 OS 에서 **네이티브로** 돌아가는가(스토어가 말한 값 그대로).
   *
   * 사양보다 이 값이 먼저다(설계 §5): 맥 빌드가 없으면 맥 사양을 견줄 이유가 자체가 없다.
   * Proton, 게임 포팅 툴킷 같은 우회 실행은 여기 담지 않는다 — 우리가 보증할 수 있는 사실이 아니다.
   * 모르는 스토어는 NULL 로 남는다(콘솔은 이 축이 아예 없다).
   */
  nativeWindows: boolean("native_windows"),
  nativeMac: boolean("native_mac"),
  nativeLinux: boolean("native_linux"),
  ...auditColumns(),
}, (t) => [
  uniqueIndex("gp_game_platform_region_uq").on(t.gameId, t.platform, t.region),
  index("gp_title_code_idx").on(t.titleCode),
]);

/**
 * 게임 사양 — 스토어가 적어 둔 최소, 권장 사양. 설계 문서 §2.
 *
 * 한 게임에 행이 최대 6개다(OS 3 × 등급 2). game_platforms 가 아니라 game 에 매다는 이유:
 * 사양은 그 스토어에서 파는 조건이 아니라 **그 게임이 도는 조건**이다. 같은 게임을 스팀에서 사든
 * 에픽에서 사든 요구 사양은 같다. 대신 어느 스토어가 알려 준 값인지는 platform 으로 남긴다 —
 * 스토어마다 적어 둔 값이 조금씩 다르고, 나중에 어느 쪽을 믿을지 고를 때 필요하다.
 *
 * **rawHtml 을 버리지 않는다.** 파서는 반드시 고치게 된다(라벨이 개발사 손글씨다). 원문이 있으면
 * 스팀에 수만 번 다시 묻는 대신 DB 를 한 번 훑어 다시 돌린다 — 그 차이가 이 컬럼의 값어치다.
 *
 * "A 또는 B" 를 담는 자리(game_requirement_parts)는 아직 만들지 않았다. 판정(2단계)에 가서야
 * 필요하고, 그때까지 이 표의 *_text 는 사람이 읽을 문구로 화면에 그대로 선다.
 */
export const gameRequirements = pgTable("game_requirements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  /** 이 사양을 알려 준 스토어. 값이 다를 때 출처를 되짚을 유일한 단서다 */
  platform: platformEnum("platform").notNull(),
  osFamily: osFamilyEnum("os_family").notNull(),
  tier: requirementTierEnum("tier").notNull(),
  /** 스토어가 준 원문 HTML. 재파싱의 근거라 절대 비우지 않는다(위 주석) */
  rawHtml: text("raw_html").notNull(),
  osText: text("os_text"),
  cpuText: text("cpu_text"),
  gpuText: text("gpu_text"),
  directxText: text("directx_text"),
  /** 라벨을 모르는 줄(Sound Card, Network)과 라벨 없는 줄("64-bit 필요")이 모인다 */
  noteText: text("note_text"),
  /**
   * 숫자로 뽑힌 값. **단위가 없으면 null 이다** — 실측 표본의 "256 RAM" 처럼 단위를 안 적은 사양이 있고,
   * 짐작해서 채우면 판정이 조용히 틀린 답을 낸다.
   */
  ramMb: integer("ram_mb"),
  vramMb: integer("vram_mb"),
  storageMb: integer("storage_mb"),
  /** 어느 파서 판이 뽑았나. 파서를 고친 뒤 재파싱 대상을 이 값으로 고른다 */
  parseVersion: integer("parse_version").notNull(),
  /** 판정에 쓰는 네 칸(OS, CPU, GPU, RAM) 중 몇 할을 건졌나. 0.00~1.00 */
  parseConfidence: numeric("parse_confidence", { precision: 3, scale: 2 }),
  ...auditColumns(),
}, (t) => [
  // 같은 게임, 같은 스토어, 같은 OS, 같은 등급은 한 행이다 — 다시 물어보면 덮어쓴다
  uniqueIndex("gr_game_platform_os_tier_uq").on(t.gameId, t.platform, t.osFamily, t.tier),
]);

/**
 * 내 기기 — 설계 문서 §4. "이 게임이 내 PC 에서 도나" 의 한쪽 항이다.
 *
 * **여러 대를 등록한다.** 데스크탑과 노트북의 답이 다르고, 사용자가 묻는 게임도 그때그때 다르다.
 *
 * 부품을 티어가 아니라 **사전 열쇠**로 저장하는 이유: 티어표는 앞으로 계속 손본다.
 * 티어를 박아 두면 표를 고칠 때 등록된 기기를 전부 다시 계산해야 하는데, 열쇠로 두면
 * 판정할 때 그때의 표를 본다 — 사전이 좋아지면 이미 등록된 기기의 판정도 같이 좋아진다.
 * (사양 쪽 후보 행에는 반대로 티어를 박는다. 거기는 SQL 이 걸러야 해서다 — 두 선택의 이유가 다르다.)
 *
 * 비회원은 이 표에 행이 없다. 브라우저에 기기 하나를 두고 판정도 브라우저에서 한다(lib/hardware/verdict).
 * 로그인을 요구하면 이 기능을 아무도 안 쓴다는 것이 설계의 전제다.
 */
export const userDevices = pgTable("user_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  /** "집 데스크탑", "회사 노트북". 기기가 여럿일 때 사람이 고를 수 있는 유일한 단서다 */
  label: text("label").notNull(),
  osFamily: osFamilyEnum("os_family").notNull(),
  /** 사전 열쇠(lib/hardware 의 normalizeModelKey). 못 고른 부품은 null 이고 그 부위는 판정에서 빠진다 */
  cpuModelKey: text("cpu_model_key"),
  gpuModelKey: text("gpu_model_key"),
  ramMb: integer("ram_mb"),
  storageFreeMb: integer("storage_free_mb"),
  /**
   * 값을 누가 넣었나 — "manual"(사람이 고름) 또는 "detected"(브라우저가 추측).
   * 가르는 이유는 설계 §4 에 있다: 자동 감지는 틀린다(사파리는 GPU 를 "Apple GPU" 로 뭉개고,
   * deviceMemory 는 8GB 에서 막힌다). 틀린 판정이 나왔을 때 원인을 여기서 찾는다.
   */
  source: text("source").default("manual").notNull(),
  /** 기본 기기. 상세 화면이 아무것도 안 골랐을 때 이 기기로 답한다 */
  isPrimary: boolean("is_primary").default(false).notNull(),
  ...auditColumns(),
}, (t) => [index("ud_user_idx").on(t.userId)]);

/**
 * 사양 한 칸이 말하는 부품 후보들 — 설계 문서 §2 의 "A 또는 B 를 담는 자리".
 *
 * 왜 컬럼 하나로 안 되나: 실제 문구가 이렇게 온다.
 *   Graphics: NVIDIA GEFORCE GTX 1060 3 GB or AMD RADEON RX 580 4 GB
 * 한 칸에 후보가 둘이고, 판정은 **후보 중 하나만 넘으면 충족**이다.
 * 한 문자열로 두면 인텔 쓰는 사람에게 라이젠 기준을 들이대게 된다.
 *
 * `tier` 를 여기 박아 두는 이유: 사전을 코드에 두었기 때문이다(lib/hardware 머리 주석).
 * SQL 이 사전을 못 보므로 매칭 시점의 티어를 행에 적어 둬야 3단계의 "내 기기로 돌아가는 게임만"
 * 필터가 질의로 선다. 사전이 바뀌면 재매칭이 이 값을 갈아 준다 — 그래서 match_version 이 있다.
 */
export const gameRequirementParts = pgTable("game_requirement_parts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  requirementId: integer("requirement_id").references(() => gameRequirements.id, { onDelete: "cascade" }).notNull(),
  kind: partKindEnum("kind").notNull(),
  /** 스토어 문구에서 이 후보에 해당하는 조각. 화면은 이것을 보여 준다 */
  rawText: text("raw_text").notNull(),
  /** 사전에서 찾은 모델의 열쇠. 못 찾으면 null 이고 그 후보는 판정에서 빠진다 */
  modelKey: text("model_key"),
  tier: integer("tier"),
  /** 이 후보 카드에 딸려 온 비디오 메모리. 게임이 요구하는 VRAM 이 아니라 그 카드의 사양이다 */
  vramMb: integer("vram_mb"),
  /** 첫 후보가 아니면 참. "A 또는 B" 의 B 쪽이다 */
  isAlternative: boolean("is_alternative").default(false).notNull(),
  matchVersion: integer("match_version").notNull(),
  ...auditColumns(),
}, (t) => [
  index("grp_requirement_idx").on(t.requirementId),
  // 3단계 목록 필터가 "이 티어 이하를 요구하는 게임" 을 고른다
  index("grp_kind_tier_idx").on(t.kind, t.tier),
]);

/**
 * 가격 이력. 통화 컬럼을 따로 두지 않는다 — 스냅샷은 언제나 game_platforms 한 행에 매달려 있고,
 * 한 스토어가 파는 통화는 바뀌지 않는다. 통화는 그 행에서 읽는다.
 */
export const priceSnapshots = pgTable("price_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  price: integer("price").notNull(),
  discountPct: integer("discount_pct").default(0),
  // 그래프에서 할인 구간을 그리기 위해 스냅샷에도 남긴다(당시 행사 종료 예정 시각, 행사명)
  discountEndsAt: timestamp("discount_ends_at", { withTimezone: true }),
  discountName: text("discount_name"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  ...auditColumns(),
}, (t) => [index("ps_gp_captured_idx").on(t.gamePlatformId, t.capturedAt)]);

export const gameSourceRefs = pgTable("game_source_refs", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  source: sourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),
  url: text("url"),
  /**
   * 매칭한 순간 그 스토어가 부르던 제목. 검수 큐에서 우리 제목과 나란히 보여 준다 —
   * 이게 없으면 검수자가 "이 후보가 같은 게임인가" 를 링크를 열어 봐야만 알 수 있다.
   * 실제로 Escape from Tarkov 에 닌텐도의 "Escape from Tarkan" 이 붙어 검수 큐에 올라왔다(2026-09-14).
   * 표시용 기록이라 스토어가 제목을 바꿔도 따라가지 않는다 — 그때 무엇을 보고 판단했는지가 남아야 한다.
   */
  matchedTitle: text("matched_title"),
  // "auto" | "manual" | "pending" | "none" — pending = 유사도 0.7~0.9 관리자 검수 큐 (§4.2), none = 미매칭 기록(재검색 방지, 수집 대상 아님)
  matchedBy: text("matched_by").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  // 마지막 매칭 시도 시각 — matched_by="none" 행의 재검색 주기 판단용(NONE_RETRY_DAYS)
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  ...auditColumns(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.source] }),
  index("gsr_source_matched_checked_idx").on(t.source, t.matchedBy, t.checkedAt),
]);

/**
 * 발견했지만 수집하지 않기로 한 외부 SKU.
 *
 * 왜 따로 두나: game_source_refs 는 (game_id, source) 가 PK 라 "이미 아는 게임의 두 번째 SKU"
 * (에디션 판, Windows 판)를 담을 자리가 없다. 그렇다고 그냥 버리면 발견이 매 실행 이 SKU 를
 * 신규로 집어 시드 몫을 먹는다 — 이런 SKU 는 계속 쌓이므로 결국 신규 게임이 다시 0건이 된다.
 */
export const discoveryIgnores = pgTable("discovery_ignores", {
  source: sourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),
  /** 같은 게임이라고 판단한 상대. 판단을 나중에 되짚을 수 있게 남긴다(신규 게임이면 null) */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.source, t.externalId] })]);

export const playtimes = pgTable("playtimes", {
  gameId: uuid("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  mainStoryHours: numeric("main_story_hours", { precision: 5, scale: 1 }),
  mainExtraHours: numeric("main_extra_hours", { precision: 5, scale: 1 }),
  completionistHours: numeric("completionist_hours", { precision: 5, scale: 1 }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  ...auditColumns(),
});

export const news = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  sourceName: text("source_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ...auditColumns(),
}, (t) => [index("news_game_pub_idx").on(t.gameId, t.publishedAt)]);

/**
 * 패치 기록 — 설계서 §3.3 의 patch_notes(확장1).
 *
 * body_md 를 두지 않는다(§10 저작권). 뉴스와 같은 규칙이다 — 제목, 링크, 게시 시각까지만 남기고
 * 본문은 스토어 페이지로 보낸다. 이 테이블이 대답하는 질문은 "언제, 얼마나 자주 고쳤나" 이지
 * "무엇을 고쳤나" 가 아니다. 후자를 우리가 보관하면 그건 남의 글을 옮겨 적는 일이다.
 *
 * games 가 아니라 game_platforms 에 매다는 이유: 같은 게임이라도 스토어마다 패치 시점이 다르다.
 * "플랫폼별 패치 속도 비교"(기획서 v2 2번)는 이 축이 없으면 아예 계산되지 않는다.
 */
export const patchNotes = pgTable("patch_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  /** 이 기록을 준 스토어. 한 게임이 두 스토어에 다 있으면 기록도 스토어 수만큼 따로 쌓인다 */
  source: sourceEnum("source").notNull(),
  /**
   * 스토어 안에서 이 패치를 가리키는 값. 재수집할 때 같은 패치를 두 번 넣지 않기 위한 키다.
   * steam = 공지 gid, gog = 게시일(+버전) — 변경 기록이 글 단위 id 를 주지 않아 날짜로 만든다.
   */
  externalId: text("external_id").notNull(),
  /** 스토어가 말한 버전. 제목에서 읽어낸 값이라 안 적는 게시물에서는 null 이다 */
  version: text("version"),
  title: text("title").notNull(),
  /** 본문이 있는 스토어 페이지. 글 단위 주소가 없는 소스(gog 변경 기록)는 null */
  url: text("url"),
  /**
   * 한글 제목과 한글 요약. 스토어가 한국어 패치 노트를 주지 않아서(2026-09-15 실측:
   * Steam 이벤트를 l=koreana 로 불러도 영어가 온다) 우리가 만들어 채운다.
   *
   * **본문은 여전히 저장하지 않는다.** 요약은 본문을 읽고 우리가 새로 쓴 글이고,
   * 전문 번역은 본문을 한글로 옮겨 담는 일이라 §10 의 전제를 깬다 — 그래서 요약만 둔다.
   * 제목을 따로 두는 이유: 목록 한 줄이 "버전, 제목, 종류, 날짜" 라 제목만 한글이어도 화면이 읽힌다.
   *
   * 미생성은 null 이고 화면은 원문으로 폴백한다 — 채우는 일이 밀려도 목록은 그대로 선다.
   */
  titleKo: text("title_ko"),
  summaryKo: text("summary_ko"),
  /** 이 한글을 누가 썼나. 나중에 모델을 바꾸면 어느 판으로 쓴 것인지 되짚을 수 있어야 한다 */
  summaryModel: text("summary_model"),
  summarizedAt: timestamp("summarized_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ...auditColumns(),
}, (t) => [
  uniqueIndex("patch_notes_platform_external_uq").on(t.gamePlatformId, t.externalId),
  index("patch_notes_platform_pub_idx").on(t.gamePlatformId, t.publishedAt),
]);

// 자체 인증(§6 개정 2026-09-11, 외부 인증 SaaS 미사용). email은 소문자 정규화 후 저장(unique).
// passwordHash는 nullable — 확장 지점: SNS/OAuth 계정은 비밀번호 없이 가입 가능. provider 연결은 별도 auth_accounts 테이블로 추가 예정.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").default("user").notNull(),
  displayName: text("display_name"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  ...auditColumns(),
});

// 서버 세션(쿠키에는 랜덤 토큰, DB에는 sha256 해시만). 만료, 강제 로그아웃은 행 삭제로 처리.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) hex
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  ...auditColumns(),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]);

export const wishlists = pgTable("wishlists", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.userId, t.gameId] })]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  ...auditColumns(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  platform: platformEnum("platform"),          // null = 모든 플랫폼
  minDiscountPct: integer("min_discount_pct").default(1), // 1 = 할인 발생 시
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns(),
}, (t) => [index("pa_game_active_idx").on(t.gameId, t.isActive)]);

export const alertDeliveries = pgTable("alert_deliveries", {
  alertId: uuid("alert_id").references(() => priceAlerts.id, { onDelete: "cascade" }).notNull(),
  snapshotId: integer("snapshot_id").references(() => priceSnapshots.id).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.alertId, t.snapshotId] })]);

export const syncLogs = pgTable("sync_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  source: sourceEnum("source").notNull(),
  status: syncStatusEnum("status").notNull(),
  processed: integer("processed").default(0),
  failed: integer("failed").default(0),
  errorSample: text("error_sample"),
  // 카탈로그 발견을 돌린 실행만 채운다(그 외에는 null). 한 컬럼에 묶은 이유:
  // 이 값들은 따로 질의하는 지표가 아니라 "이 실행의 발견이 어디서 멈췄나" 를 함께 읽는 한 덩어리다.
  // 포화 여부는 discovery->>'stoppedBy' = 'budget' 으로 센다.
  discovery: jsonb("discovery").$type<DiscoveryLog>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...auditColumns(),
});

export const dataCorrections = pgTable("data_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => users.id).notNull(),
  table: text("table").notNull(),
  rowId: text("row_id").notNull(),
  field: text("field").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  lockField: boolean("lock_field").default(true), // true면 크롤러가 덮어쓰지 않음
  ...auditColumns(),
});

// ---- 회사 (기획서 F1, F2, F4) ----
// games.developer/publisher 자유 텍스트를 지우지 않고 남겨 둔 이유: 회사 매칭에 실패한 표기의 보존처이자
// 백필이 끝나기 전까지의 화면 폴백이다.
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKo: text("name_ko"),
  countryCode: text("country_code"),      // ISO 3166-1 alpha-2. 필터 키
  countryNameKo: text("country_name_ko"), // "일본" 등 표시용
  foundedAt: date("founded_at"),
  hqNameKo: text("hq_name_ko"),
  websiteUrl: text("website_url"),
  description: text("description"),
  wikidataId: text("wikidata_id").unique(), // Q번호. 재조회 키
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [index("companies_country_idx").on(t.countryCode)]);

/**
 * 스토어마다 같은 회사를 다르게 적는다 — steam "FromSoftware, Inc.", xbox "UBISOFT"(전부 대문자).
 * 정규화한 표기를 여기에 쌓아 두 번째부터는 외부 질의 없이 회사를 찾는다.
 */
export const companyAliases = pgTable("company_aliases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  aliasNorm: text("alias_norm").notNull().unique(), // lib/company-name.ts 의 normalizeCompanyName 결과
  aliasRaw: text("alias_raw").notNull(),
  source: sourceEnum("source").notNull(),
  ...auditColumns(),
});

export const gameCompanies = pgTable("game_companies", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  role: companyRoleEnum("role").notNull(),
  ...auditColumns(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.companyId, t.role] }),
  index("gc_company_role_idx").on(t.companyId, t.role),
]);

// ---- 구독 서비스 (기획서 F7 을 Game Pass 전용이 아니라 일반화) ----
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(), // "gamepass_console" 등. 코드가 참조하는 안정적 식별자
  labelKo: text("label_ko").notNull(),
  /**
   * 카탈로그 수집이 "어느 기기의 행과 맞출지" 정할 때만 쓴다(run-subscriptions).
   * 게임 단건이 포함 여부를 알려주는 구독(PS Plus, EA Play)은 기기가 이미 정해진 행에 붙으므로
   * 이 값이 필요 없고, 한 기기로 적을 수도 없다(PS Plus 는 ps4, ps5 양쪽이다) — 그래서 null 을 허용한다.
   */
  platform: platformEnum("platform"),
  catalogId: text("catalog_id"),       // Game Pass 컬렉션 GUID 등 수집 키
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns(),
});

/**
 * 포함 여부를 행 삭제가 아니라 removedAt 으로 표시한다.
 * 이탈 자체가 사용자에게 가치 있는 정보이고("곧 빠져요"), 일시적 수집 실패로 행이 사라지는 사고도 막는다.
 */
export const gameSubscriptions = pgTable("game_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [
  index("gs_sub_removed_idx").on(t.subscriptionId, t.removedAt),
  index("gs_gp_idx").on(t.gamePlatformId),
]);

// ---- 세대 간 업그레이드 (기획서 F6) ----
export const upgrades = pgTable("upgrades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  fromPlatform: platformEnum("from_platform").notNull(),
  toPlatform: platformEnum("to_platform").notNull(),
  kind: upgradeKindEnum("kind").notNull(),
  price: integer("price"),               // KRW. kind 가 paid 일 때만 의미가 있다
  storeExternalId: text("store_external_id"),
  storeUrl: text("store_url"),
  note: text("note"),                    // "원본 소유 필요" 같은 조건
  ...auditColumns(),
}, (t) => [uniqueIndex("upgrades_game_from_to_uq").on(t.gameId, t.fromPlatform, t.toPlatform)]);

// ---- relations (drizzle relational query API 용) ----
export const gamesRelations = relations(games, ({ many, one }) => ({
  platforms: many(gamePlatforms),
  sourceRefs: many(gameSourceRefs),
  genres: many(gameGenres),
  news: many(news),
  playtime: one(playtimes, { fields: [games.id], references: [playtimes.gameId] }),
  companies: many(gameCompanies),
  upgrades: many(upgrades),
  requirements: many(gameRequirements),
  parent: one(games, { fields: [games.parentGameId], references: [games.id], relationName: "gameDlc" }),
  dlcs: many(games, { relationName: "gameDlc" }),
}));
export const gamePlatformsRelations = relations(gamePlatforms, ({ one, many }) => ({
  game: one(games, { fields: [gamePlatforms.gameId], references: [games.id] }),
  snapshots: many(priceSnapshots),
  subscriptions: many(gameSubscriptions),
  patchNotes: many(patchNotes),
}));
export const companiesRelations = relations(companies, ({ many }) => ({
  games: many(gameCompanies),
  aliases: many(companyAliases),
}));
export const companyAliasesRelations = relations(companyAliases, ({ one }) => ({
  company: one(companies, { fields: [companyAliases.companyId], references: [companies.id] }),
}));
export const gameCompaniesRelations = relations(gameCompanies, ({ one }) => ({
  game: one(games, { fields: [gameCompanies.gameId], references: [games.id] }),
  company: one(companies, { fields: [gameCompanies.companyId], references: [companies.id] }),
}));
export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  games: many(gameSubscriptions),
}));
export const gameSubscriptionsRelations = relations(gameSubscriptions, ({ one }) => ({
  gamePlatform: one(gamePlatforms, { fields: [gameSubscriptions.gamePlatformId], references: [gamePlatforms.id] }),
  subscription: one(subscriptions, { fields: [gameSubscriptions.subscriptionId], references: [subscriptions.id] }),
}));
export const upgradesRelations = relations(upgrades, ({ one }) => ({
  game: one(games, { fields: [upgrades.gameId], references: [games.id] }),
}));
export const gameRequirementsRelations = relations(gameRequirements, ({ one, many }) => ({
  game: one(games, { fields: [gameRequirements.gameId], references: [games.id] }),
  parts: many(gameRequirementParts),
}));

export const gameRequirementPartsRelations = relations(gameRequirementParts, ({ one }) => ({
  requirement: one(gameRequirements, { fields: [gameRequirementParts.requirementId], references: [gameRequirements.id] }),
}));

export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  gamePlatform: one(gamePlatforms, { fields: [priceSnapshots.gamePlatformId], references: [gamePlatforms.id] }),
}));
export const gameSourceRefsRelations = relations(gameSourceRefs, ({ one }) => ({
  game: one(games, { fields: [gameSourceRefs.gameId], references: [games.id] }),
}));
export const gameGenresRelations = relations(gameGenres, ({ one }) => ({
  game: one(games, { fields: [gameGenres.gameId], references: [games.id] }),
  genre: one(genres, { fields: [gameGenres.genreId], references: [genres.id] }),
}));
export const genresRelations = relations(genres, ({ many }) => ({ games: many(gameGenres) }));
export const newsRelations = relations(news, ({ one }) => ({
  game: one(games, { fields: [news.gameId], references: [games.id] }),
}));
export const patchNotesRelations = relations(patchNotes, ({ one }) => ({
  gamePlatform: one(gamePlatforms, { fields: [patchNotes.gamePlatformId], references: [gamePlatforms.id] }),
}));
export const playtimesRelations = relations(playtimes, ({ one }) => ({
  game: one(games, { fields: [playtimes.gameId], references: [games.id] }),
}));
export const usersRelations = relations(users, ({ many }) => ({
  wishlists: many(wishlists),
  pushSubscriptions: many(pushSubscriptions),
  priceAlerts: many(priceAlerts),
  sessions: many(sessions),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  game: one(games, { fields: [wishlists.gameId], references: [games.id] }),
}));
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));
export const priceAlertsRelations = relations(priceAlerts, ({ one, many }) => ({
  user: one(users, { fields: [priceAlerts.userId], references: [users.id] }),
  game: one(games, { fields: [priceAlerts.gameId], references: [games.id] }),
  deliveries: many(alertDeliveries),
}));
export const alertDeliveriesRelations = relations(alertDeliveries, ({ one }) => ({
  alert: one(priceAlerts, { fields: [alertDeliveries.alertId], references: [priceAlerts.id] }),
  snapshot: one(priceSnapshots, { fields: [alertDeliveries.snapshotId], references: [priceSnapshots.id] }),
}));
