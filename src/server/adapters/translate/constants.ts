// 번역 어댑터 상수(DeepL). 근거는 각 값 옆에.
//
// 왜 DeepL 인가(2026-11-03): 레포에 LLM 키를 넣지 않기로 했다(사용자 결정, AI Gateway 도 쓰지 않는다). 기계 번역 API 중
// DeepL API Free 는 한 달 무료 몫이 있고(2026-11-03 발급 키의 /v2/usage 실측 character_limit 1,000,000) **한도를 넘으면 과금하지 않고 456 으로 멈춘다** — 비용이 새어 나갈 길이 없다.
// 주간 맞춤 소식에 실리는 영문 제목만 번역하면 한 달 수만 자라 한도의 일부다(제목 80자 안팎 x 주 수백 건).

/** 키를 담는 환경변수. 없으면 번역을 건너뛰고 원문 제목을 그대로 쓴다 */
export const DEEPL_API_KEY_ENV = "DEEPL_API_KEY";

/** 무료 키는 끝이 ":fx" 이고 무료 주소로만 받는다. 유료 키는 유료 주소다(DeepL 문서 "API Free vs Pro") */
export const DEEPL_FREE_KEY_SUFFIX = ":fx";
export const DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";
export const DEEPL_PRO_URL = "https://api.deepl.com/v2/translate";

/** 한 요청에 실을 수 있는 글 수 상한(DeepL 문서: text 배열 최대 50개) */
export const DEEPL_MAX_TEXTS = 50;
/** 받는 말. 영문 기사 제목을 한국어로 */
export const DEEPL_TARGET_LANG = "KO";
/** 한도를 다 쓴 달에 DeepL 이 주는 상태 코드. 재시도할 일이 아니라 그달 번역을 멈춘다 */
export const DEEPL_QUOTA_EXCEEDED = 456;

/**
 * 이번 달 사용량 주소(GET, 글자를 먹지 않는다). 무료, 유료 주소가 번역과 같은 갈래로 갈린다.
 * 패치 번역(sync/patch-translate)이 회차 전에 남은 몫을 본다 — DeepL 의 한 달은 달력 달이 아니라 키 발급일 기준이라 우리 DB 합계만으로는 어긋난다.
 */
export const DEEPL_FREE_USAGE_URL = "https://api-free.deepl.com/v2/usage";
export const DEEPL_PRO_USAGE_URL = "https://api.deepl.com/v2/usage";

/**
 * 긴 글(패치 본문)을 자르는 조각 크기(글자). DeepL 요청 본문 상한은 128 KiB 다(DeepL 문서 "Request size").
 * 한글, 영문 섞인 글이 글자당 최대 3바이트에 JSON 이스케이프까지 붙어도 한 요청 몫(DEEPL_REQUEST_MAX_CHARS) 이 그 아래에 들게 잡았다.
 * 5,000 은 문단 여럿을 한 조각에 담을 만큼 커서 문맥이 끊기는 일이 드물다.
 */
export const DEEPL_CHUNK_MAX_CHARS = 5000;
/** 한 요청에 실을 글자 합 상한. 30,000자 x 3바이트 = 90 KB 로 128 KiB 아래다 */
export const DEEPL_REQUEST_MAX_CHARS = 30000;
/**
 * 긴 글 요청의 기다림 상한(ms). 기본 15초(adapters/http)는 제목 몇 줄 기준이다.
 * 본문 수천 자는 DeepL 쪽 처리에 10초를 넘기기도 해서 넉넉히 잡는다 — 크론 함수 한도(300초) 안에서 몇 건 몫이다.
 */
export const DEEPL_LONG_TIMEOUT_MS = 60_000;
