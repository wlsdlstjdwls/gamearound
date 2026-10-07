// 위키데이터 엔드포인트와 질의. 값의 근거(실측 날짜, 한계)를 주석으로 남긴다(§10).

export const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
export const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

/**
 * 회사로 인정할 상위 분류. 이 제약이 없으면 같은 이름의 게임, 앨범, 인물이 섞여 들어온다.
 * Q210167 = 비디오 게임 개발사, Q1137109 = 비디오 게임 배급사, Q4830453 = 기업.
 * 기업(Q4830453)까지 넓힌 이유: 닌텐도, 소니처럼 게임사로만 분류되지 않은 회사가 있다.
 * Q783794 = 회사. 기업 아래에 있을 것 같지만 아니다(2026-10-07 실측: P279 가 조직 Q43229, Q3778211).
 * P31 이 회사 하나뿐인 항목(10:10 Games Q131830727, Funko Fusion 36건)이 이걸로만 통과한다.
 * 조직(Q43229)은 넣지 않는다 — 밴드, 학교까지 열린다.
 */
export const COMPANY_CLASSES = ["Q210167", "Q1137109", "Q4830453", "Q783794"] as const;

/**
 * 질의에서 받을 이름 언어(게임, 회사 공통). **mul 이 빠지면 안 된다.**
 *
 * 위키데이터는 라틴 문자권에서 표기가 같은 이름을 언어마다 두지 않고 다국어 라벨(mul) 하나로 옮겼다.
 * 그래서 영어 라벨이 **아예 없는** 항목이 흔하다 — 2026-09-17 실측:
 *   Q49740(마인크래프트)            라벨 43개, en 없음, mul = "Minecraft"
 *   Q111165107(카운터-스트라이크 2)  en 없음, mul = "Counter-Strike 2", mul 별칭 "CS2"
 * en 만 걸렀을 때 이 항목들은 한국어 라벨 하나만 남아 우리 영문 제목과 유사도 0.00 으로 떨어졌다.
 * 회사도 같다 — 우리가 가진 위키데이터 회사 101곳 중 22곳이 en 없이 mul 만 가졌고(밸브, 비헤이비어),
 * 그 결과 name_en 자리에 한국어 이름이 들어앉았다(2026-09-17 실측 13곳).
 *
 * 그렇다고 mul 로 갈아타면 안 된다 — 젤다는 en, ko, mul 을 다 가졌다. 셋을 다 받고
 * 겹치는 값은 호출부가 정규화로 접는다(spreadNames, collectAliases).
 */
export const SPARQL_NAME_LANGS = `"ko","en","mul"`;

/** 위 목록의 "영문 라벨 자리" 판 — 한국어 라벨은 따로 받으므로 여기서는 뺀다 */
export const SPARQL_EN_LANGS = `"en","mul"`;

/**
 * 라벨 언어 우선순위(SERVICE wikibase:label 용). 한국어가 없으면 영어, 그것도 없으면 다국어(mul).
 * mul 이 왜 필요한지는 SPARQL_NAME_LANGS 주석 참고 — 영어 라벨이 아예 없는 항목이 흔하다.
 */
export const LABEL_LANGUAGES = "ko,en,mul";

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

/**
 * 묶음 조회(lookupMany)의 검색 요청 간격. 위 5초는 이름 하나에 검색 두 번 + SPARQL 한 번이 몰리던
 * 옛 경로의 값이다. 묶음 경로는 검색만 먼저 줄 세우고 SPARQL 은 따로 몇 번만 치므로 간격당 요청이 하나다.
 * 2026-09-21 일괄 스크립트가 250ms 로 400개 이름을 돌려 429 없이 끝났다(918초). 크론은 매일 돌므로
 * 여유를 두어 두 배로 잡는다.
 */
export const WIKIDATA_SEARCH_INTERVAL_MS = 500;

/**
 * 상세 SPARQL 한 번에 담을 후보 Q번호 상한. 2026-09-21 실측으로 120개까지 한 번에 받았다(1.9초).
 * 한 회사가 여러 행으로 오므로 질의의 LIMIT 은 후보 수에 비례해 늘린다(SPARQL_ROWS_PER_CANDIDATE).
 */
export const SPARQL_BATCH_MAX_CANDIDATES = 100;
/**
 * 후보 하나가 차지할 수 있는 행 수의 넉넉한 상한. 회사 분류 셋 중 둘에 걸리고(x2) 영문 라벨 en, mul(x2),
 * 국가, 본사, 사이트가 둘씩이면 32행이다. 잘리면 뒤쪽 이름이 조용히 "못 좁힘" 으로 떨어지고
 * 한동안 다시 안 물으므로(COMPANY_MISS_RETRY_DAYS) 크게 잡는다. 행이 많아도 응답은 수백 KB 다.
 */
export const SPARQL_ROWS_PER_CANDIDATE = 50;
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
export function companyDetailQuery(entityIds: readonly string[], rowLimit = 200): string {
  const values = entityIds.map((q) => `wd:${q}`).join(" ");
  const classes = COMPANY_CLASSES.map((q) => `wd:${q}`).join(" ");
  return `SELECT ?company ?labelEn ?labelKo ?descKo ?countryLabel ?countryCode ?inception ?hqLabel ?website WHERE {
  VALUES ?company { ${values} }
  VALUES ?cls { ${classes} }
  ?company wdt:P31/wdt:P279* ?cls .
  OPTIONAL { ?company rdfs:label ?labelEn . FILTER(lang(?labelEn) in (${SPARQL_EN_LANGS})) }
  OPTIONAL { ?company rdfs:label ?labelKo . FILTER(lang(?labelKo) = "ko") }
  OPTIONAL { ?company schema:description ?descKo . FILTER(lang(?descKo) = "ko") }
  OPTIONAL { ?company wdt:P17 ?country . OPTIONAL { ?country wdt:P297 ?countryCode } }
  OPTIONAL { ?company wdt:P571 ?inception }
  OPTIONAL { ?company wdt:P159 ?hq }
  OPTIONAL { ?company wdt:P856 ?website }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANGUAGES}". }
}
LIMIT ${rowLimit}`;
}

/**
 * 한글 제목으로 후보를 찾는 전문 검색 URL(CirrusSearch).
 *
 * wbsearchentities 를 쓰지 않는 이유는 그것이 **접두 일치**이기 때문이다. 한국어 라벨은
 * 콜론을 달고 있는데("젤다의 전설: 브레스 오브 더 와일드") 스토어 제목에는 없어서
 * 첫 낱말 뒤에서 바로 어긋난다 — language 를 ko 로 바꿔도 0건이다(2026-09-17 실측).
 *
 * 2026-09-17 실측, 질의 "젤다의 전설 브레스 오브 더 와일드":
 *   wbsearchentities language=en  0건
 *   wbsearchentities language=ko  0건
 *   list=search(이 경로)          Q17185964 단독 1건
 *
 * 대신 이 경로는 낱말 단위 검색이라 엉뚱한 항목도 섞여 온다 — 분류 확인(gameVerifyQuery)과
 * 제목 정확 일치 검사를 반드시 뒤에 붙인다. 응답에 라벨이 없어서 그 검사는 검증 단계가 맡는다.
 */
export function fulltextSearchUrl(name: string): string {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: name,
    srlimit: String(SEARCH_LIMIT),
    // 0 = 항목(Q) 이름공간. 안 막으면 속성(P), 토론 문서가 섞인다
    srnamespace: "0",
    format: "json",
    origin: "*",
  });
  return `${WIKIDATA_API_URL}?${params.toString()}`;
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
 * 별칭 질의 한 항목이 받을 이름 상한. UNION 이라 한 행이 이름 하나다 —
 * 실측 5행(PUBG), 많아야 수십 행이라 200 이면 잘릴 일이 없다.
 */
export const ALIAS_QUERY_LIMIT = 200;



/**
 * 후보 Q번호가 정말 게임인지 가른다. 검색 API 는 분류를 안 주므로 이 한 번이 꼭 필요하다.
 * 회사 경로와 같은 이유로 VALUES 로 못박는다 — 라벨을 조건으로 스캔하면 타임아웃이 난다.
 *
 * altLabel 까지 받는 이유: 전문 검색 경로는 응답에 이름이 없어서 "우리 제목과 같은가" 를
 * 여기서 판정해야 한다. 라벨만 보면 통칭으로 등록된 항목을 놓친다.
 * 별칭 하나가 한 행이라 같은 항목이 여러 줄로 온다 — 호출부가 항목별로 접는다.
 */
export function gameVerifyQuery(entityIds: readonly string[]): string {
  const values = entityIds.map((q) => `wd:${q}`).join(" ");
  return `SELECT ?item ?labelEn ?labelKo ?alt WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P31/wdt:P279* wd:${GAME_CLASS} .
  OPTIONAL { ?item rdfs:label ?labelEn . FILTER(lang(?labelEn) in (${SPARQL_EN_LANGS})) }
  OPTIONAL { ?item rdfs:label ?labelKo . FILTER(lang(?labelKo) = "ko") }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(lang(?alt) in (${SPARQL_NAME_LANGS})) }
}`;
}

/**
 * 게임 한 항목에서 검색 별칭이 될 값을 모은다.
 *   rdfs:label     "배틀그라운드", "마인크래프트"  — 그 나라에서 부르는 이름
 *   P179 시리즈    "젤다의 전설", "철권"        — 연관검색어의 본줄기
 *   P144 원작      "해리 포터", "사이버펑크"     — 원작이 다른 매체인 게임
 *   skos:altLabel  "TOTK", "TK8", "botw 2"    — 약칭, 통칭
 * 한국어, 영어, 다국어(mul)만 받는다 — 나머지 언어까지 받으면 별칭이 수십 개로 불어나고 검색에 잡음만 는다.
 * mul 을 넣는 이유는 SPARQL_NAME_LANGS 주석 참고("CS2" 같은 약칭이 거기 들어 있다).
 * (2026-09-15 실측: 호그와트 레거시에서 "해리 포터", "Harry Potter", "Wizard Game" 이 나온다.)
 *
 * **항목 자신의 라벨(rdfs:label)이 여기 있어야 한다.** 스토어가 영문 제목만 주는 게임이 본편의
 * 89%(2026-09-22 실측 14,114/15,888)라, 한국 사람이 치는 말은 제목 어디에도 없고 별칭에만 있다.
 * 예전에는 altLabel 만 받아서 "배틀그라운드" 가 통째로 빠졌다 — 위키데이터 Q28937399 는
 * 한국어 라벨이 "배틀그라운드", altLabel 이 "배그" 라서 약칭만 들어오고 정식 통칭이 없었다.
 * 그래서 "배그" 로는 찾히고 "배틀그라운드" 로는 0건이었다(2026-09-22 실측).
 *
 * UNION 으로 이름 하나를 한 행에 두는 이유: OPTIONAL 네 개를 나열하면 값들이 곱해진다
 * (시리즈 3 × 원작 3 × altLabel 20 = 180행). 그 곱이 LIMIT 을 넘기면 뒤쪽 이름이 조용히 잘린다.
 */
export function gameAliasQuery(entityId: string): string {
  return `SELECT ?name WHERE {
  VALUES ?item { wd:${entityId} }
  { ?item rdfs:label ?name }
  UNION { ?item skos:altLabel ?name }
  UNION { ?item wdt:P179 ?s . ?s rdfs:label ?name }
  UNION { ?item wdt:P144 ?b . ?b rdfs:label ?name }
  FILTER(lang(?name) in (${SPARQL_NAME_LANGS}))
} LIMIT ${ALIAS_QUERY_LIMIT}`;
}
