// DB 열거형 한 벌. **다른 스키마 파일을 하나도 import 하지 않는 잎(leaf) 파일이다.**
//
// 왜 갈랐나: schema-admin.ts 가 `sourceEnum("source")` 를 테이블 정의 자리에서 곧바로 호출하는데,
// 그 파일을 schema.ts 가 재수출하면서 순환이 생겼다. 테이블 참조(`() => games.id`)는 화살표라 호출이
// 미뤄져 순환을 견디지만, enum 은 그 자리에서 값이 필요해 아직 안 만들어진 것을 집는다.
// import 는 파일 어디에 적든 맨 위로 끌어올려지므로 재수출 위치를 옮기는 걸로는 풀리지 않는다.
//
// 그래서 열거형만 아래로 내렸다. 여기가 아무것도 import 하지 않는 한 어느 스키마 파일이든 안전하게 집어 쓴다.
// schema.ts 가 재수출하므로 호출부 import 경로(`@/server/db/schema`)는 그대로다.
import { pgEnum } from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", ["steam", "ps5", "ps4", "xbox", "switch", "switch2", "epic"]);

// wikidata 와 wikidata_game 을 가른 이유: 같은 백과사전이지만 조회 대상이 다르다.
// wikidata 는 회사 항목을, wikidata_game 은 게임 항목을 찾는다. 한 소스로 합치면
// game_source_refs 한 행에 회사 Q번호와 게임 Q번호가 섞이고, 디스패치도 갈 곳을 못 정한다.
export const sourceEnum = pgEnum("source", ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "hltb", "opencritic", "metacritic", "rss", "manual", "wikidata", "wikidata_game", "gamepass", "epic"]);

export const roleEnum = pgEnum("role", ["user", "game_company", "seller", "admin"]);

export const syncStatusEnum = pgEnum("sync_status", ["ok", "partial", "failed"]);

/**
 * 가격의 통화. 스토어가 그 나라에 파는 통화를 그대로 담는다 — 환산하지 않는다.
 * 한국에도 달러로만 파는 스토어가 있다(2026-09-14 확인). 그런 스토어는 원화 비교에 못 써서 결국 걷어냈다.
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
export const contentTypeEnum = pgEnum("content_type", ["game", "dlc", "edition", "bundle", "demo", "music", "software"]);

/**
 * 이 게임 행을 누가 만들었나 — 매장 설계서 §6.
 *
 * 크롤러가 만든 행과 매장이 만든 행은 믿을 수 있는 정도가 다르다. 그 차이를 감사 컬럼
 * (`created_source`)만으로 물으면 `shop:{uuid}` 같은 텍스트를 like 로 훑어야 해서 인덱스가 안 탄다.
 * "매장이 만든 게임" 은 목록, 매핑 배치, 관리자 화면이 상시로 묻는 질문이라 컬럼이어야 한다.
 */
export const gameOriginEnum = pgEnum("game_origin", ["crawler", "shop", "admin"]);

/**
 * 전체 목록과 검색에 나오나 — 매장 설계서 §7.
 *
 * 매장이 게임을 만드는 데 승인을 두지 않는 대신(§7) 오염을 이 컬럼이 막는다.
 * `shop_only` 는 매장 페이지와 그 매장의 상품에서만 보인다. 매핑 배치가 기존 게임을 찾아
 * 상품을 옮기거나, 크롤러 소스가 붙거나, 관리자가 확인하면 `public` 으로 승격한다.
 */
export const gameVisibilityEnum = pgEnum("game_visibility", ["public", "shop_only"]);

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

/**
 * 할인을 얼마나 기다리는 사람인가(온보딩 4단계). 값이 곧 price_alerts 의 기본 임계값으로 번역된다 —
 * 그 대응표는 lib/onboarding 이 들고 있다. 여기에 퍼센트를 적지 않는 이유는, 임계값은 우리가
 * 언제든 조정할 수 있는 정책이고 사람이 답한 것은 "성향" 이라 둘의 수명이 다르기 때문이다.
 *   full_price   신작이면 정가에도 산다
 *   wait_small   조금만 깎여도 산다
 *   wait_deep    반값은 돼야 산다
 *   historic_low 역대 최저가가 아니면 안 산다
 */
export const dealStyleEnum = pgEnum("deal_style", ["full_price", "wait_small", "wait_deep", "historic_low"]);

/**
 * 한 게임에 붙어 있을 수 있는 시간(온보딩 5단계). HLTB 의 main 값으로 거를 때 쓴다.
 * endless 를 medium/long 과 가르는 이유: 로그라이크, 대전, 라이브 서비스는 "몇 시간" 이 아예 없는
 * 축이라 시간으로 거르면 통째로 사라진다. 이 답을 고른 사람에게는 시간 필터를 걸지 않는다.
 */
export const playTimeStyleEnum = pgEnum("play_time_style", ["short", "medium", "long", "endless"]);
