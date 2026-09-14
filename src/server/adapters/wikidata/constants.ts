// 위키데이터 엔드포인트와 질의. 값의 근거(실측 날짜, 한계)를 주석으로 남긴다(§10).

export const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
export const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

/**
 * 회사로 인정할 상위 분류. 이 제약이 없으면 같은 이름의 게임, 앨범, 인물이 섞여 들어온다.
 * Q210167 = 비디오 게임 개발사, Q1137109 = 비디오 게임 배급사, Q4830453 = 기업.
 * 기업(Q4830453)까지 넓힌 이유: 닌텐도, 소니처럼 게임사로만 분류되지 않은 회사가 있다.
 */
export const COMPANY_CLASSES = ["Q210167", "Q1137109", "Q4830453"] as const;

/** 라벨 언어 우선순위. 한국어가 없으면 영어로 떨어진다 */
export const LABEL_LANGUAGES = "ko,en";

/**
 * 검색 API 에서 받아올 후보 수. 우리는 라벨이 정확히 일치하는 것만 남기므로 넉넉히 받아도 낭비가 아니다.
 * 같은 이름의 회사와 게임이 함께 올라오는 일이 흔해서 5건으로는 회사가 잘린다.
 */
export const SEARCH_LIMIT = 10;
/** 검증 SPARQL 에 한 번에 넣을 후보 상한. 이보다 많으면 어차피 모호해서 자동 확정하지 않는다 */
export const VERIFY_MAX_CANDIDATES = 10;

/**
 * 위키데이터는 UA 없는 요청과 과요청을 차단한다. 공개 엔드포인트는 동시성이 아니라
 * 간격으로 제한되므로 보수적으로 잡는다(회사는 수천 건 규모라 서두를 이유가 없다).
 *
 * 2초로는 모자랐다 — 20건 배치에서 8건이 검색 API 429 로 떨어졌다(2026-09-14 실측).
 * 회사 1건이 검색 최대 2회 + SPARQL 1회라 간격당 요청이 3회까지 몰린다. 5초로 올린다.
 */
export const WIKIDATA_MIN_INTERVAL_MS = 5000;
/** SPARQL 은 일반 REST 보다 느리다. 좁힌 질의는 실측 1.5초지만(2026-09-14) 여유를 둔다 */
export const WIKIDATA_TIMEOUT_MS = 30_000;

/**
 * 후보 Q번호를 받아 회사 속성을 채우는 질의.
 *
 * 라벨을 조건으로 스캔하는 질의(`?company rdfs:label ?l . FILTER(STR(?l) = "...")`)는
 * 분류 제약을 붙여도 공개 엔드포인트에서 30초 타임아웃이 났다(2026-09-14 실측).
 * 그래서 이름으로 후보를 찾는 일은 검색 API 에 맡기고, 여기서는 VALUES 로 못박은 소수만 확인한다.
 *
 * P17 국가, P571 설립, P159 본사, P856 공식 웹사이트, P297 ISO 3166-1 alpha-2.
 * 국가 코드는 국가 항목에 붙어 있어 한 단계 더 들어간다.
 */
export function companyDetailQuery(entityIds: readonly string[]): string {
  const values = entityIds.map((q) => `wd:${q}`).join(" ");
  const classes = COMPANY_CLASSES.map((q) => `wd:${q}`).join(" ");
  return `SELECT ?company ?labelEn ?labelKo ?descKo ?countryLabel ?countryCode ?inception ?hqLabel ?website WHERE {
  VALUES ?company { ${values} }
  VALUES ?cls { ${classes} }
  ?company wdt:P31/wdt:P279* ?cls .
  OPTIONAL { ?company rdfs:label ?labelEn . FILTER(lang(?labelEn) = "en") }
  OPTIONAL { ?company rdfs:label ?labelKo . FILTER(lang(?labelKo) = "ko") }
  OPTIONAL { ?company schema:description ?descKo . FILTER(lang(?descKo) = "ko") }
  OPTIONAL { ?company wdt:P17 ?country . OPTIONAL { ?country wdt:P297 ?countryCode } }
  OPTIONAL { ?company wdt:P571 ?inception }
  OPTIONAL { ?company wdt:P159 ?hq }
  OPTIONAL { ?company wdt:P856 ?website }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
LIMIT 200`;
}

/** 이름으로 후보 항목을 찾는 검색 API URL. 실측 0.7초(2026-09-14) */
export function searchUrl(name: string, language: string): string {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language,
    uselang: language,
    type: "item",
    limit: String(SEARCH_LIMIT),
    format: "json",
    origin: "*",
  });
  return `${WIKIDATA_API_URL}?${params.toString()}`;
}

/**
 * 게임으로 인정할 상위 분류. Q7889 = 비디오 게임.
 * 이 제약이 **반드시** 있어야 한다 — 같은 제목의 영화, 소설, 시리즈 문서가 그대로 걸린다
 * (2026-09-15 실측: 라벨 "Elden Ring" 을 그냥 찾으면 영화 기획 항목 Q134546417 이 먼저 나온다).
 */
export const GAME_CLASS = "Q7889";

/**
 * 후보 Q번호가 정말 게임인지 가른다. 검색 API 는 분류를 안 주므로 이 한 번이 꼭 필요하다.
 * 회사 경로와 같은 이유로 VALUES 로 못박는다 — 라벨을 조건으로 스캔하면 타임아웃이 난다.
 */
export function gameVerifyQuery(entityIds: readonly string[]): string {
  const values = entityIds.map((q) => `wd:${q}`).join(" ");
  return `SELECT ?item ?labelEn ?labelKo WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P31/wdt:P279* wd:${GAME_CLASS} .
  OPTIONAL { ?item rdfs:label ?labelEn . FILTER(lang(?labelEn) = "en") }
  OPTIONAL { ?item rdfs:label ?labelKo . FILTER(lang(?labelKo) = "ko") }
}`;
}

/**
 * 게임 한 항목에서 검색 별칭이 될 값을 모은다.
 *   P179 시리즈    "젤다의 전설", "철권"        — 연관검색어의 본줄기
 *   P144 원작      "해리 포터", "사이버펑크"     — 원작이 다른 매체인 게임
 *   skos:altLabel  "TOTK", "TK8", "botw 2"    — 약칭, 통칭
 * 한국어와 영어만 받는다. 다른 언어까지 받으면 별칭이 수십 개로 불어나고 검색에 잡음만 는다.
 * (2026-09-15 실측: 호그와트 레거시에서 "해리 포터", "Harry Potter", "Wizard Game" 이 나온다.)
 */
export function gameAliasQuery(entityId: string): string {
  return `SELECT ?series ?based ?alt WHERE {
  VALUES ?item { wd:${entityId} }
  OPTIONAL { ?item wdt:P179 ?s . ?s rdfs:label ?series . FILTER(lang(?series) in ("ko","en")) }
  OPTIONAL { ?item wdt:P144 ?b . ?b rdfs:label ?based . FILTER(lang(?based) in ("ko","en")) }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(lang(?alt) in ("ko","en")) }
} LIMIT 100`;
}
