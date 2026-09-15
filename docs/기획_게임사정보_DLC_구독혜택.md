# 게임사 정보, DLC, 구독 혜택 확장 기획

작성 2026-09-14. 근거 설계서는 `docs/손전등_개발설계서.md`. 이 문서는 코드 작성 전 단계이며, 여기서 DB 와 코드를 바꾸지 않는다.

## 1. 배경과 범위

### 1.1 사용자 요구 원문

> https://psprices.com/ , https://steamdb.info/sales/ , https://steamsale.windbell.co.kr/ , https://steamdb.info/ , https://isthereanydeal.com/ , https://directg.net/index.php
>
> 위 사이트들에서 정보를 끌어오던, 벤치마킹을 하던 판단해서 해줘
>
> 해당 게임 개발사의 국가 / 게임회사의 대한 정보 / 게임회사 화면도 따로 만들자 / 해당 게임회사의 다른 게임들 등
>
> 각 게임들의 dlc 여부와 dlc 종류 가격 등
>
> 닌텐도의 경우는 닌텐도2에디션 무료/유료 업데이트 유무 등 가격 등
>
> xbox는 게임패스로 플레이 가능한지
>
> 기타 더 고려해야할 사항이 있는지 체크좀

### 1.2 요구 번호표

| 번호 | 요구 |
|---|---|
| F1 | 개발사, 배급사의 국가 |
| F2 | 게임 회사 자체 정보(설립, 본사, 웹사이트, 한국어 회사명 등) |
| F3 | 게임 회사 전용 화면 신설 |
| F4 | 같은 회사의 다른 게임 목록 |
| F5 | 게임별 DLC 유무, 종류, 개별 가격과 할인 |
| F6 | Nintendo Switch 2 Edition 의 무료, 유료 업그레이드 여부와 가격 |
| F7 | Xbox Game Pass 로 플레이 가능한지 |
| F8 | 그 밖에 고려할 사항 |

### 1.3 이번 문서가 다루지 않는 것

- 실제 마이그레이션 실행, 어댑터 구현, 화면 구현. 모두 후속 작업이다.
- PlayStation Store 어댑터 본체 구현. 별도 스파이크로 분리한다(4.2).
- 가격 비교 쇼핑(키 판매처 연동). 3.1 에서 제외 판정한다.

## 2. 현행 실사 결과

### 2.1 DB 스키마 현황 (`src/server/db/schema.ts`, 260줄)

있는 것

- `games` 는 `developer`, `publisher` 를 **자유 텍스트 1개 컬럼**으로 보관한다. 회사 엔티티가 없다.
- `gamePlatforms` 는 플랫폼별 가격, 할인 기간, 행사명, 점수, `lastSyncedAt` 을 가진다.
- `priceSnapshots`, `gameSourceRefs`, `playtimes`, `news`, `wishlists`, `priceAlerts`, `syncLogs`, `dataCorrections`.
- `platformEnum` 에 `switch`, `switch2` 가 이미 분리돼 있다.
- `sourceEnum` 은 steam, psstore, xbox, nintendo, hltb, opencritic, metacritic, rss, manual.

없는 것

- 회사 엔티티, 회사 별칭, 게임과 회사의 다대다 관계, 국가 코드.
- DLC 표현 수단. `games` 에 본편과 DLC 를 구분하는 컬럼이 없고 부모 참조도 없다.
- 구독 서비스(Game Pass 등) 포함 여부를 담을 자리.
- 플랫폼 간 업그레이드(Switch 에서 Switch 2 로) 관계.

### 2.2 어댑터별 수집 필드 현황

`src/server/adapters/types.ts` 의 `StoreSnapshot` 이 계약이다. `meta` 안에 `developer`, `publisher` 가 문자열로 들어오고 국가는 없다.

| 소스 | 파일 | 현재 수집 | 상태 |
|---|---|---|---|
| steam | `src/server/adapters/steam/` | 제목, 설명, 가로 아트, 세로 아트, developer, publisher, 장르, 멀티플레이, 가격, 할인 기간, 행사명 | 활성 |
| xbox | `src/server/adapters/xbox.ts` | ProductId, 제목, DeveloperName, PublisherName, 가격, 할인 기간, 출시일 | 활성 |
| nintendo | `src/server/adapters/nintendo.ts` | 제목, 정가, 세일가, 발매일, 대상 본체, 퍼블리셔, 장르, 인원 | 활성이나 2026-09-14 기준 사이트가 503 |
| psstore | `src/server/adapters/psstore.ts` | 없음(스텁) | 비활성. `getDisabledReason()` 에 사유 기록 |
| hltb, opencritic, metacritic, rss | 각 파일 | 플레이타임, 점수, 뉴스 | opencritic 은 키 없으면 비활성 |

### 2.3 화면 현황

- `src/lib/routes.ts` 의 `ROUTES` 에 회사 경로가 없다. `gamePath(slug)` 만 있다.
- `src/server/services/games/dto.ts` 의 `GameDetail` 은 `developer`, `publisher` 를 문자열로 내려준다. 링크가 아니다.
- 게임 상세는 `src/app/(public)/games/[slug]/page.tsx`, 목록은 `games/page.tsx`, 필터는 `src/components/game-filters.tsx`.
- 공통 프리미티브는 `src/components/ui/` 에 `Page`, `Card`, `SectionHead`, `Button`, `ChipLink`, `ChipButton`, `Clamp`, `FadeImage` 가 이미 있다.

### 2.4 sync 반영 규칙 (`src/server/sync/`)

`AGENTS.md` 7절과 `src/server/sync/constants.ts` 에 명시된 규칙을 신규 데이터에도 그대로 적용한다.

- 외부 값이 `null` 이면 기존 값을 덮지 않는다(할인 메타만 예외).
- `data_corrections.lock_field` 가 잠근 필드는 건드리지 않는다.
- 값이 실제로 달라질 때만 UPDATE 하고 그때만 `changedSlugs` 에 넣는다.
- 항목 하나의 실패가 배치를 멈추지 않는다. `recordError` 로 표본만 남긴다.
- `BATCH_SIZE` 는 steam 1500, xbox 200, nintendo 120, psstore 200. steam 의 병목은 수집이 아니라 게임당 DB 왕복(주석에 실측 0.87초/건)이다. **DLC 를 게임 레코드로 늘리면 이 병목이 그대로 커진다**(7.3).

### 2.5 [미확인] 항목

- store.nintendo.co.kr 이 2026-09-14 에도 503 이라 Switch 2 Edition 과 업그레이드 팩 상품 구조를 실물로 확인하지 못했다.
- PlayStation Store 의 현재 유효한 persisted GraphQL 해시. 공개 엔드포인트는 `{"message":"Query not whitelisted"}` 로 거부한다(2026-09-14 실측).
- ~~IsThereAnyDeal API v2 의 무료 키 발급 조건과 상업적 이용 약관.~~ 2026-09-15 에 ITAD 를 제외로 판정해(3.1) 확인할 이유가 사라졌다.
- Game Pass 컬렉션 GUID 의 공식 문서. 동작은 확인했으나 마이크로소프트가 문서화한 계약은 아니다. 바뀔 수 있다는 전제로 붙인다.
- Xbox 의 개별 DLC 목록과 가격을 주는 엔드포인트. `HasAddOns` 로 유무만 확인했다.

## 3. 벤치마킹 분석

### 3.1 사이트별 판정

| 사이트 | 우리 요구와 겹치는 것 | 배울 점 | 데이터 확보 경로 | 리스크 | 판정 |
|---|---|---|---|---|---|
| steamdb.info | 세일 목록, 역대 최저가, DLC 및 패키지 목록 | 세일 표의 정렬 축(할인율, 평점, 최저가 갱신 여부), 본편 아래 DLC 를 접는 구조 | 공식 API 없음. 약관이 스크래핑을 금지하고 Cloudflare 로 차단 | 높음 | UI 벤치마킹 |
| psprices.com | 플랫폼 횡단 가격, 회사별 게임 목록, DLC 가격, 지역별 가격 | 회사 화면 구성(회사 헤더, 게임 그리드, 할인중 필터), 본편과 DLC 를 한 화면에 묶는 방식 | 공개 API 없음 | 중간 | UI 벤치마킹 |
| isthereanydeal.com | 스토어 횡단 최저가, 역대 최저가, 대기열 알림, 번들 | 역대 최저가 표기 문법, 알림 조건 UI | 공식 API v2 존재. 키 필요(실측 403) | 집계본이라 우리 1차 값과 충돌 | 제외(2026-09-15 확정) |
| steamsale.windbell.co.kr | 한국어 스팀 세일 목록 | 한국 사용자 대상 세일 목록의 밀도와 문구 | 공개 API 없음 | 중간 | UI 벤치마킹 |
| directg.net | 한국 키 판매처 가격 | 없음 | 리셀러라 가격 신뢰도와 지역 키 문제가 섞인다 | 높음 | 제외 |

판정 원칙은 하나다. 공식 API 나 명시적으로 허용된 피드가 있는 곳만 데이터 인출 후보로 둔다.
6개 중 그 조건을 만족하는 곳은 IsThereAnyDeal 하나였고, 그마저도 F1 부터 F7 을 직접 채우지는 못한다.

**2026-09-15 에 IsThereAnyDeal 도 제외로 바꿨다.** 그 API 는 IsThereAnyDeal 자신의 공식이지 스토어의 공식이 아니다.
ITAD 도 우리처럼 스토어를 모으는 집계 사이트고, 우리는 이미 Steam, PlayStation, Xbox, 닌텐도, GOG, Epic 을 1차로 직접 받는다.
집계본을 다시 받으면 한 다리 건넌 값이라 정확도가 떨어지고 우리 값과 충돌만 난다.
**결과적으로 6곳 전부 수집원이 아니다. 전부 화면 참고용이다.**
steamdb 와 windbell 의 접근 실측, 축 비교는 `벤치마킹_steamdb_windbell_2026-09-15.md` 에 있다.

### 3.2 결론: 요구는 벤치마킹이 아니라 새 소스로 푼다

F1 부터 F7 은 위 사이트에서 끌어올 대상이 아니라, **이미 쓰는 1차 스토어 API 와 새 공개 소스 2개**로 푼다. 아래는 2026-09-14 에 직접 호출해 확인한 사실이다.

| 확인 항목 | 결과 |
|---|---|
| Steam `appdetails` 의 `dlc` 배열 | 있음. ELDEN RING(1245620) 에서 `[3655690, 2778590, 2778580]` |
| Steam DLC 단건 조회 | `type: "dlc"`, `fullgame: {appid, name}` 로 본편 역참조, `price_overview` 로 가격 제공 |
| Xbox Display Catalog 의 `Properties.HasAddOns` | 있음. 스타워즈 아웃로(9NLHVWSFB0FC) 에서 `True` |
| Xbox Game Pass 카탈로그 | `https://catalog.gamepass.com/sigls/v2?id=<컬렉션GUID>&language=ko-kr&market=KR` 가 한국 시장 제품 ID 목록을 돌려준다. 콘솔, PC 컬렉션 모두 응답 확인 |
| Wikidata SPARQL 로 회사 정보 | 됨. "FromSoftware, Inc." 질의에서 Q2414469, 한국어명 "프롬소프트웨어", 국가 "일본", 설립 1986-11-01, 본사 "도쿄도" |
| Steam 검색의 developer 필터 | 안 됨. `?developer=FromSoftware&json=1` 이 빈 결과. 회사별 게임 목록은 우리 DB 로 만들어야 한다 |
| Xbox 제품의 `PublisherAddress` | 표본에서 `null`. 국가 출처로 쓸 수 없다 |
| Xbox 제품의 `PublisherWebsiteUri` | 있음. `https://ubisoft.com`. 회사 웹사이트 보강용 |
| PlayStation Store GraphQL | `Query not whitelisted` 로 거부 |
| IsThereAnyDeal API | `403 Missing api key` |

## 4. 요구사항별 데이터 출처 가용성

### 4.1 가용성 표

| 요구 | 플랫폼 | 필요한 원천 | 1순위 경로 | 대안 | 판정 |
|---|---|---|---|---|---|
| F1 국가 | 공통 | 회사명에서 국가 | Wikidata SPARQL(P17 국가, P571 설립, P159 본사). 실측 확인 | 관리자 수동 입력 | 가능 |
| F2 회사 정보 | 공통 | 한국어 회사명, 설립일, 본사, 웹사이트 | Wikidata(라벨, P571, P159, P856) | Xbox `PublisherWebsiteUri` 로 웹사이트 보강 | 가능 |
| F3 회사 화면 | 해당 없음 | 회사 엔티티 | 5.1 의 `companies` 테이블 | 없음 | 조건부(F1, F2 선행) |
| F4 다른 게임 | 공통 | 회사와 게임의 관계 | 우리 DB 의 `games.developer`, `games.publisher` 를 정규화해 `game_companies` 로 승격 | 없음 | 가능 |
| F5 DLC | steam | DLC 목록, 종류, 가격 | `appdetails.dlc` 로 목록, DLC 단건의 `type`, `fullgame`, `price_overview` | GetItems 배치(100건/요청)로 가격만 갱신 | 가능 |
| F5 DLC | xbox | DLC 유무 | `Properties.HasAddOns`(실측 True) | 개별 목록 엔드포인트는 [미확인] | 조건부(유무만) |
| F5 DLC | nintendo | DLC 목록, 가격 | 상품 페이지 파싱 | 사이트 503 이라 미확인 | 불가(선행: 사이트 복구) |
| F5 DLC | psstore | DLC 목록, 가격 | 어댑터 자체가 스텁 | 없음 | 불가(선행: psstore 어댑터) |
| F6 Switch 2 업그레이드 | nintendo | 업그레이드 팩 상품, 무료 여부, 가격 | store.nintendo.co.kr 상품 파싱 | 관리자 큐레이션 | 불가(선행: 사이트 복구, 상품 구조 확인) |
| F7 Game Pass | xbox | 포함 제품 ID 목록, 티어 | `catalog.gamepass.com/sigls/v2` 의 콘솔, PC 컬렉션. 실측 확인 | 없음 | 가능 |

### 4.2 확보 불가 항목과 대체안

**F6 Switch 2 Edition (불가, 선행 작업 필요)**

닌텐도 한국 스토어가 503 이다(2026-09-14 재확인). 확인해야 할 것은 둘이다. 첫째, Switch 2 Edition 이 별도 상품인지 기존 상품의 변형인지. 둘째, 업그레이드 팩이 독립 상품 ID 를 갖는지, 무료 업그레이드는 상품 자체가 없는지.

사이트 복구 전까지의 대체안은 **관리자 큐레이션**이다. 5.1 의 `upgrades` 테이블에 관리자가 직접 넣고 `data_corrections.lock_field` 로 잠근다. Switch 2 Edition 대상 타이틀은 수십 종 규모라 수동으로도 감당된다. 사이트가 복구되면 같은 테이블을 어댑터가 채우되 잠긴 행은 건드리지 않는다.

**F5 의 psstore, nintendo 분 (불가)**

psstore 어댑터가 스텁인 한 PlayStation DLC 는 원천이 없다. psstore 스파이크를 별도 과제로 두고, 그전까지 DLC 는 steam 과 xbox 만 채운다. 화면은 확인된 플랫폼만 표시하도록 설계해 빈 플랫폼이 결함처럼 보이지 않게 한다(6.2).

**F5 의 xbox DLC 목록 (조건부)**

`HasAddOns` 로 유무는 즉시 되지만 개별 DLC 목록과 가격은 별도 엔드포인트가 필요하고 아직 확인하지 못했다. 1단계는 유무 배지만 내고, 2단계에서 목록을 조사한다.

## 5. 데이터 모델 설계

### 5.1 신규 테이블

**companies** — 회사 엔티티

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| id | uuid PK | 아니오 | |
| slug | text unique | 아니오 | `/companies/<slug>` 경로 |
| nameEn | text | 아니오 | 정규 영문명 |
| nameKo | text | 예 | Wikidata 한국어 라벨 |
| countryCode | text(2) | 예 | ISO 3166-1 alpha-2. 필터 키 |
| countryNameKo | text | 예 | "일본" 등 표시용 |
| foundedAt | date | 예 | 설립일 |
| hqNameKo | text | 예 | 본사 소재 |
| websiteUrl | text | 예 | |
| description | text | 예 | 짧은 소개 |
| wikidataId | text unique | 예 | Q번호. 재조회 키 |
| lastSyncedAt | timestamptz | 예 | 신선도 표기 |

로고 컬럼은 1단계에서 두지 않는다. 사유는 10절 4번.

**company_aliases** — 표기 흔들림 흡수

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| id | int PK | 아니오 | |
| companyId | uuid FK | 아니오 | |
| aliasNorm | text unique | 아니오 | 정규화한 표기(소문자, 법인 접미어 제거) |
| aliasRaw | text | 아니오 | 원문 표기 |
| source | sourceEnum | 아니오 | 어느 스토어가 준 표기인지 |

**game_companies** — 게임과 회사의 다대다

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| gameId | uuid FK | 아니오 | |
| companyId | uuid FK | 아니오 | |
| role | companyRoleEnum(developer, publisher) | 아니오 | 같은 회사가 두 역할을 겸하면 행 2개 |

PK 는 (gameId, companyId, role).

**subscriptions** — 구독 서비스 마스터 (F7 의 일반화)

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| id | int PK | 아니오 | |
| key | text unique | 아니오 | `gamepass_console`, `gamepass_pc`, `ps_plus_extra`, `ea_play` 등 |
| labelKo | text | 아니오 | 화면 배지 문구 |
| platform | platformEnum | 아니오 | |
| catalogId | text | 예 | Game Pass 컬렉션 GUID 등 수집 키 |
| isActive | boolean | 아니오 | 수집 대상 여부 |

**game_subscriptions** — 포함 여부와 이력

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| id | int PK | 아니오 | |
| gamePlatformId | uuid FK | 아니오 | 플랫폼 단위로 붙는다 |
| subscriptionId | int FK | 아니오 | |
| addedAt | timestamptz | 아니오 | 처음 포함이 확인된 시각 |
| removedAt | timestamptz | 예 | 카탈로그에서 사라진 시각. **행을 지우지 않는다** |

`removedAt` 을 두는 이유는 둘이다. 카탈로그 이탈 자체가 사용자에게 가치 있는 정보이고("곧 빠져요" 알림의 재료), 일시적 수집 실패로 행이 통째로 사라지는 사고를 막는다.

**upgrades** — 세대 간 업그레이드 (F6 의 일반화)

| 컬럼 | 타입 | 널 | 용도 |
|---|---|---|---|
| id | int PK | 아니오 | |
| gameId | uuid FK | 아니오 | 본편 |
| fromPlatform | platformEnum | 아니오 | `switch` |
| toPlatform | platformEnum | 아니오 | `switch2` |
| kind | upgradeKindEnum(free, paid, subscription_included) | 아니오 | 무료, 유료, 구독 포함 |
| price | integer | 예 | KRW. kind 가 paid 일 때만 |
| storeExternalId | text | 예 | 업그레이드 팩 상품 ID |
| storeUrl | text | 예 | |
| note | text | 예 | 조건(원본 소유 필요 등) |

Switch 2 전용이 아니라 `fromPlatform`, `toPlatform` 으로 일반화한 이유는 PS4 에서 PS5 로의 무료 업그레이드, Xbox Smart Delivery 가 같은 모양이기 때문이다. 지금 Switch 2 만 채우더라도 스키마는 세대 중립으로 둔다.

### 5.2 기존 테이블 변경

**games**

| 컬럼 | 타입 | 이유 |
|---|---|---|
| contentType | contentTypeEnum(game, dlc, edition, bundle) | DLC 를 게임 레코드로 담기 위한 구분자. 기본 `game` |
| parentGameId | uuid FK(games.id) | DLC 가 가리키는 본편. `game` 이면 null |

`developer`, `publisher` 텍스트 컬럼은 **지우지 않는다**. `game_companies` 백필이 끝나기 전까지 화면 폴백이자, 회사 매칭에 실패한 표기의 보존처다.

**game_platforms**

| 컬럼 | 타입 | 이유 |
|---|---|---|
| hasAddOns | boolean | Xbox `Properties.HasAddOns`. DLC 목록을 못 가져오는 플랫폼에서도 유무 배지는 띄운다 |

### 5.3 회사 엔티티 정규화와 별칭 정책

문제는 실측으로 이미 드러났다. 같은 게임에서 Steam 은 developer 를 `FromSoftware, Inc.` 로, publisher 를 `FromSoftware, Inc.` 와 `Bandai Namco Entertainment` 두 개로 준다. Xbox 는 `MASSIVE ENTERTAINMENT`(전부 대문자), `UBISOFT` 로 준다. 같은 회사가 스토어마다 다른 문자열이 된다.

정규화 절차는 `src/lib/company-name.ts` 같은 순수 함수로 두고 테스트를 붙인다.

1. 유니코드 NFKC 정규화, 소문자화, 공백 압축.
2. 법인 접미어 제거: `inc`, `inc.`, `co., ltd`, `ltd`, `llc`, `gmbh`, `s.a.` 등. 목록은 상수로 둔다.
3. 구두점 제거 후 남은 문자열이 `aliasNorm`.

매칭 순서

1. `company_aliases.aliasNorm` 조회. 맞으면 끝.
2. 없으면 Wikidata 에 질의한다(라벨 또는 별칭 완전 일치에 더해 비디오게임 회사 하위 분류 제약). 히트가 **정확히 1건**일 때만 자동 확정하고 별칭을 저장한다.
3. 0건이거나 2건 이상이면 회사를 만들지 않고 `pending` 으로 남긴다. 관리자 화면에서 검수한다. 게임 매칭이 이미 `auto`, `manual`, `pending`, `none` 어휘를 쓰므로(`MATCHED_FOR_SYNC`) 같은 어휘를 재사용한다.

병합 정책은 관리자 전용이다. 회사 A 를 회사 B 로 병합하면 `game_companies` 와 `company_aliases` 를 B 로 옮기고 A 를 지운다. 병합은 `data_corrections` 에 기록한다.

폴백은 조용하게 둔다. 매칭되지 않은 게임은 `games.developer` 텍스트를 그대로 보여주되 링크를 걸지 않는다. "회사 정보 없음" 같은 결함처럼 보이는 문구를 넣지 않는다.

### 5.4 DLC 모델링 선택지 비교

| 선택지 | 내용 | 장점 | 단점 |
|---|---|---|---|
| A. games 레코드로 (`contentType` + `parentGameId`) | DLC 도 games 행 1개 | 가격, 스냅샷, 할인, 위시리스트, 알림, 관리자 보정 인프라를 **하나도 안 고치고** 재사용 | games 행 수가 늘어 sync 의 게임당 DB 왕복 병목이 커진다. 목록과 검색에서 DLC 를 걸러내는 조건이 모든 쿼리에 붙는다 |
| B. 별도 `dlcs` 테이블 | DLC 전용 테이블과 전용 가격 컬럼 | 목록, 검색이 자동으로 본편만 본다 | `price_snapshots`, `price_alerts`, `wishlists`, sync 반영 로직을 전부 이중화해야 한다. "DLC 할인 알림"을 원하는 순간 A 로 회귀한다 |

**추천은 A** 이고 근거는 둘이다. 첫째, `price_snapshots` 와 `price_alerts` 가 `gamePlatformId` 에 붙어 있어 DLC 를 별도 테이블로 빼면 알림과 이력 경로가 통째로 복제된다. 둘째, Steam 이 DLC 를 본편과 같은 appid 체계로 주고 `fullgame` 으로 부모를 알려주므로(실측 확인) A 가 원천 구조와 그대로 맞는다.

A 의 단점은 이렇게 막는다.

- 목록, 검색, 홈의 기본 조건에 `contentType = 'game'` 을 넣는다. 이 조건은 `src/lib/games-query.ts` 한 곳에 두고 테스트를 추가한다(이미 `games-query.test.ts` 가 있다).
- `games (content_type, parent_game_id)` 복합 인덱스를 만든다.
- sync 는 DLC 를 **본편이 이미 수집 대상일 때만** 따라 넣는다. 카탈로그 발견(`discover`)은 DLC 를 넣지 않는다.

### 5.5 마이그레이션과 백필 개요

1. `companies`, `company_aliases`, `game_companies` 생성. 읽는 코드가 없어 무해하다.
2. 백필 스크립트. `games.developer`, `games.publisher` 의 distinct 값을 정규화해 Wikidata 로 조회한다. 1건 히트만 자동 확정하고 나머지는 pending 목록으로 관리자에게 넘긴다.
3. `games` 에 `contentType`(기본 `game`), `parentGameId` 추가. 기존 행은 전부 `game` 이라 백필이 없다.
4. `games-query` 에 `contentType = 'game'` 조건 추가. **3번보다 먼저 배포하면 안 된다**(컬럼이 없어 쿼리가 깨진다).
5. `subscriptions`, `game_subscriptions` 생성 후 `subscriptions` 시드(Game Pass 콘솔, PC).
6. `game_platforms.hasAddOns` 추가.
7. `upgrades` 생성.

SQL 은 이 문서에서 실행하지 않는다. drizzle 마이그레이션으로 낸다.

## 6. 화면 설계

문구는 "-해요"체로 쓰고 가운뎃점과 화살표 글자를 쓰지 않는다. 기존 프리미티브(`Page`, `Card`, `SectionHead`, `ChipLink`, `Clamp`, `FadeImage`)를 그대로 쓰고 새 프리미티브는 만들지 않는다.

### 6.1 회사 화면 (F3)

`ROUTES` 에 `company: "/companies"` 를 추가하고 `companyPath(slug)` 를 `gamePath` 와 같은 모양으로 둔다.

- `/companies` 는 회사 목록이다. 국가 칩 필터(`ChipLink`), 보유 게임 수 순 정렬, 페이지네이션(`src/components/pagination.tsx` 재사용).
- `/companies/[slug]` 는 회사 상세다.
  - 헤더 `Card` 에 회사명(한국어명이 있으면 한국어, 없으면 영문), 국가, 설립 연도, 본사, 공식 사이트 링크. 외부 링크는 `sr-only` 로 "(새 창에서 열림)".
  - 요약 줄은 "게임 N개, 지금 할인 중 M개".
  - `SectionHead` "이 회사의 게임" 아래 기존 `GameCard` 그리드. 개발작과 배급작은 탭으로 나눈다(`platform-tabs.tsx` 패턴).
  - 빈 상태는 `EmptyState` 로 "아직 회사 정보를 못 모았어요. 게임 목록만 보여드릴게요."

진입 경로는 게임 상세의 개발사, 배급사 칩이다. 회사 목록은 처음에는 헤더 메뉴에 올리지 않고, 회사 수가 충분해지면 올린다.

### 6.2 게임 상세 확장

- 개발사, 배급사를 `ChipLink` 로 바꾸고 국가를 함께 적는다. 예를 들어 "프롬소프트웨어 (일본)". 매칭 실패 시 링크 없는 텍스트로 폴백한다.
- `SectionHead` "DLC" 블록에 `parentGameId` 가 이 게임인 레코드를 가격, 할인과 함께 목록으로 낸다. 제목이 길면 `Clamp` 로 자른다. DLC 가 0건인데 `hasAddOns` 가 true 면 "DLC 가 있어요. 목록은 아직 모으는 중이에요." 로 적는다.
- Game Pass 는 Xbox 플랫폼 행 옆에 정적 텍스트 배지로 붙인다. 문구는 "Game Pass 로 플레이할 수 있어요". 티어가 둘 다면 "콘솔 | PC" 로 파이프 구분한다.
- Switch 2 업그레이드는 `switch` 플랫폼 행 아래 한 줄로 붙인다. kind 별 문구는 free 가 "Switch 2 로 무료 업그레이드할 수 있어요", paid 가 "Switch 2 업그레이드 팩 12,000원", subscription_included 가 "Nintendo Switch Online 가입자는 무료예요".
- 기간 표기는 물결(`~`)로 잇는다.

### 6.3 목록, 검색 필터

| 필터 | 비용 | 판단 |
|---|---|---|
| 회사별 | `game_companies` 조인 1회. 회사 화면이 이미 같은 쿼리를 쓴다 | 넣는다 |
| 국가별 | `game_companies` 에 `companies` 까지 2단 조인. 인덱스 `companies(country_code)` 필요 | 2단계 |
| Game Pass 포함만 | `game_subscriptions` 에 `removed_at is null` 조인. 인덱스 `(subscription_id, removed_at)` | 넣는다. 칩 하나로 충분 |
| DLC 있는 게임만 | `hasAddOns` 또는 자식 존재 여부. 수요가 불확실 | 보류 |

`src/lib/games-query.ts` 가 이미 필터 조합을 다루므로 거기에 추가하고 테스트를 같이 쓴다.

## 7. 수집 파이프라인 설계

### 7.1 신규 소스 2개

`sourceEnum` 에 `wikidata`, `gamepass` 를 추가하고 `src/server/adapters/index.ts` 레지스트리에 등록한다. `sync/` 로직은 건드리지 않는다(AGENTS.md 5절).

**wikidata 어댑터** (`src/server/adapters/wikidata/`)

- 엔드포인트, SPARQL 템플릿, 회사 분류 제약은 그 폴더의 `constants.ts` 에만 둔다.
- UA 는 `CRAWLER_USER_AGENT` 를 쓴다. Wikidata 는 UA 없는 요청을 거부한다.
- `minIntervalMs` 는 보수적으로 2000. 회사 수는 수천 규모라 서두를 이유가 없다.
- 라이선스는 유리하다. Wikidata 본문 데이터는 CC0 라 표기 의무가 없다. 다만 로고 이미지는 파일마다 라이선스가 달라 1단계에서 수집하지 않는다.

**gamepass 어댑터** (`src/server/adapters/gamepass.ts`)

- `catalog.gamepass.com/sigls/v2` 로 컬렉션별 제품 ID 목록을 받는다. 컬렉션 GUID 는 이 파일 상수에 두고 실측 날짜를 근거 주석으로 단다.
- 요청량은 컬렉션 수만큼, 즉 2회에서 4회다. 사실상 공짜다.
- 반환 목록에 없는데 우리 DB 에서 `removed_at is null` 인 행은 `removedAt` 을 찍는다. **목록이 비어 오면 아무것도 지우지 않는다**. 수집 실패와 카탈로그 비움을 구분할 수 없기 때문이다. 이 임계값은 `sync/constants.ts` 에 `GAMEPASS_MIN_CATALOG_SIZE` 로 둔다.

### 7.2 기존 어댑터에 붙는 것

| 어댑터 | 추가 | 호출량 증가 |
|---|---|---|
| steam | `appdetails` 의 `dlc` 배열을 `StoreSnapshot.meta` 에 실어 보낸다. DLC 가격은 기존 GetItems 배치(100건/요청)에 DLC appid 를 섞는다 | 요청 수는 DLC 비율만큼 늘지만 배치 단위라 완만하다 |
| xbox | `Properties.HasAddOns` 를 스냅샷에 추가 | 0. 이미 받고 있는 응답의 필드다 |
| nintendo | 업그레이드 팩 상품 파싱 | 사이트 복구 후 산정 |

`StoreSnapshot` 에 추가할 선택 필드는 셋이다. `meta.dlcExternalIds?: string[]`(본편이 알려주는 DLC 목록), `parentExternalId?: string | null`(DLC 가 알려주는 본편), `hasAddOns?: boolean | null`. 모두 선택 필드라 주지 않는 소스는 `undefined` 로 두고, 2.4 의 널 비덮어쓰기 규칙이 그대로 적용된다.

### 7.3 병목 관리

`BATCH_SIZE.steam = 1500` 의 근거 주석이 말하듯 병목은 게임당 DB 왕복이다. DLC 를 games 레코드로 늘리면 이 병목이 그대로 커진다. 대응은 셋이다.

- DLC 는 본편이 수집 대상일 때만 등록한다. 카탈로그 발견은 DLC 를 넣지 않는다.
- `sync/constants.ts` 에 `DLC_PER_GAME_MAX` 를 둔다. DLC 가 수십 개인 타이틀이 배치를 잡아먹지 않게 상한을 걸고, 초과분은 `recordError` 로 표본만 남긴다.
- 이미 다음 과제로 잡혀 있는 "반영 단계 배치화"를 DLC 확장보다 **먼저** 한다. 순서를 바꾸면 배치 시간이 먼저 터진다.

### 7.4 수집 주기 분리

| 데이터 | 변동 빈도 | 주기 |
|---|---|---|
| 가격, 할인 | 수시 | 현행 하루 3회 유지 |
| Game Pass 카탈로그 | 월 2회 안팎 | 하루 1회. 요청 2회에서 4회라 비용이 없다 |
| 회사 정보 | 거의 안 바뀜 | 주 1회, 그것도 `lastSyncedAt` 이 오래된 것부터 N개씩 |
| 업그레이드 정보 | 출시 시점에만 | 주 1회 또는 관리자 입력 |

`sync/constants.ts` 에 소스별 주기를 상수로 두고 `src/app/api/cron/daily/route.ts` 가 요일로 분기한다.

## 8. 추가 고려사항 (F8)

| 항목 | 왜 중요한가 | 지금인가 나중인가 |
|---|---|---|
| 구독 서비스 일반화 | Game Pass 만 특별 취급하면 PS Plus 카탈로그, EA Play 를 붙일 때 스키마를 다시 짜게 된다. 5.1 에서 이미 일반화했다 | 지금. 스키마만 |
| 에디션, 번들, 시즌 패스의 경계 | 디럭스 에디션은 DLC 가 아니라 별도 상품이고 시즌 패스는 DLC 묶음이다. `contentType` 에 `edition`, `bundle` 을 미리 넣어둔 이유다 | 지금은 enum 만. 분류 로직은 나중 |
| 역대 최저가 | `price_snapshots` 가 이미 쌓이고 있어 계산만 하면 된다. 벤치마크 사이트 전부가 핵심 기능으로 삼는다 | 다음 순번. 별도 과제 |
| 지역과 통화 | 지금은 전부 KRW 기준이다. 지역별 가격 비교는 psprices 의 핵심이지만 스토어별 지역 계정이 필요해 비용이 크다 | 나중. 지금은 한국 가격 기준임을 화면에 명시 |
| 무료 배포 기간 | Epic 무료 배포 같은 것. 소스가 또 늘어난다 | 나중 |
| 한국어 지원 여부 | Steam `supported_languages` 에 이미 들어온다. 한국 사용자에게 가치가 크고 비용이 거의 없다 | 다음 순번. DLC 와 함께 |
| 연령 등급 | Steam `required_age`, `ratings` 에 있다 | 나중 |
| 크로스바이, 하위 호환 | Xbox `XboxConsoleGenCompatible`, `XboxCrossGenSetId` 로 일부 확인된다. `upgrades` 테이블과 겹친다 | 나중 |
| 점수 라이선스 | Metacritic, OpenCritic 점수 재배포는 약관 확인이 필요하다. 현재도 이미 표시 중이라 소급 확인이 필요하다 | 확인 필요. 별도 과제 |
| 신선도 표기 | `lastSyncedAt` 과 `src/components/freshness-badge.tsx` 가 이미 있다. 회사 정보와 Game Pass 여부에도 같은 배지를 붙인다 | 지금 |
| 크롤링 예절과 약관 | steamdb 와 psprices 를 데이터 인출 대상에서 제외한 판단(3.1)을 문서로 남겨 나중에 뒤집히지 않게 한다 | 지금. 결정 완료 |
| 플랫폼 로고 상표 | Game Pass 배지에 마이크로소프트 로고를 쓰면 상표 문제가 된다. **텍스트 배지만 쓴다** | 지금. 결정 완료 |
| 관리자 보정과 잠금 | 회사 국가와 업그레이드 정보는 오류가 눈에 띄는 데이터다. `data_corrections.lock_field` 를 신규 테이블에도 적용한다 | 지금 |
| 캐시 무효화 범위 | 회사 화면은 게임 1건이 바뀌어도 무효화 대상이다. `changedSlugs` 방식에 회사 slug 를 더해야 한다 | 지금. 설계에 포함 |

## 9. 로드맵

| Phase | 포함 | 선행 조건 | 난이도 | 단독 배포 가능 |
|---|---|---|---|---|
| P0 | sync 반영 단계 배치화 | 없음 | 중 | 예 |
| P1 | F7 Game Pass (어댑터, 테이블, 배지, 필터) | 없음 | 하 | 예 |
| P2 | F1, F2, F4 회사 엔티티, 정규화, 백필 | 없음 | 중 | 예. 화면 없이 데이터만 |
| P3 | F3 회사 화면, 게임 상세의 회사 링크 | P2 | 하 | 예 |
| P4 | F5 DLC (steam 목록과 가격, xbox 유무) | P0 | 중 | 예 |
| P5 | F6 Switch 2 업그레이드 (관리자 큐레이션 먼저, 어댑터는 사이트 복구 후) | 닌텐도 사이트 복구 | 중 | 예 |
| P6 | 역대 최저가, 한국어 지원 표시 | P0 | 중 | 예 |

P1 을 맨 앞에 둔 이유는 요청 2회에서 4회로 끝나고 기존 파이프라인을 거의 안 건드리며 사용자에게 바로 보이는 가치가 크기 때문이다. P0 을 P4 앞에 둔 이유는 7.3 에 적었다.

## 10. 결정이 필요한 사항

1. **DLC 를 games 레코드로 담을까(A), 별도 테이블로 뺄까(B)?**
   추천은 A. 가격, 알림, 위시리스트 인프라를 그대로 쓴다. 대신 목록 쿼리에 `contentType = 'game'` 조건이 전부 붙는다.

2. **회사 정보의 원천을 Wikidata 로 갈까, IGDB 로 갈까?**
   추천은 Wikidata. 키가 필요 없고 CC0 이며 한국어 회사명이 바로 나온다(실측 확인). IGDB 는 country 필드가 정돈돼 있지만 Twitch 계정 등록과 키 관리가 붙는다. 커버리지가 부족하면 그때 IGDB 를 2순위 소스로 더한다.

3. **Switch 2 업그레이드를 관리자 수동 입력으로 먼저 열까, 닌텐도 사이트 복구를 기다릴까?**
   추천은 수동 입력 먼저. 대상 타이틀이 수십 종이고 사이트 복구 시점을 알 수 없다. 스키마와 화면을 먼저 내고 어댑터는 나중에 같은 테이블을 채운다.

4. **회사 로고를 수집할까?**
   추천은 1단계에서 하지 않는 것. Wikidata 로고 파일은 개별 라이선스가 달라 일괄 재배포가 위험하다. 회사 화면은 이름, 국가, 설립만으로도 충분히 선다.

5. **P0(반영 단계 배치화)을 먼저 할까, P1(Game Pass)을 먼저 할까?**
   추천은 P1 먼저. P1 은 배치 부하를 거의 늘리지 않아 P0 와 독립이다. P0 는 P4(DLC) 직전에만 끝나 있으면 된다.
