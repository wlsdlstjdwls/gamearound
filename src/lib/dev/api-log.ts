// 개발용 API 호출 로그의 순수 판정부. 브라우저 fetch 를 가로채는 쪽은 components/dev/api-log.tsx 다.
// fitin-app 의 common_util_api_devlog 를 본떴다. 다른 점: 그쪽은 SPA 라 공통 fetch 래퍼 한 곳에서 찍으면 됐지만,
// 우리는 공통 래퍼가 없고(클라이언트 fetch 9곳 + 서버 액션 40여 파일) 서버 액션은 Next 가 만든 fetch 로 나간다.
// 그래서 호출부를 고치지 않고 window.fetch 를 개발 모드에서만 감싼다. 판정을 여기 떼어 둔 것은 테스트하려고다.

/** 콘솔에 찍을 요청의 갈래 */
export type ApiLogKind = "action" | "api" | "other";

// Next 가 서버 액션 요청에 붙이는 헤더. 값은 액션 ID(해시)라 이름은 알 수 없다 — 대신 인자를 찍는다
export const NEXT_ACTION_HEADER = "next-action";
// RSC 이동, 프리페치 요청 표지. 링크에 올리기만 해도 나가서 찍으면 로그가 묻힌다 — 건너뛴다
export const RSC_HEADER = "rsc";
export const RSC_QUERY = "_rsc";
// 정적 자산, HMR. 우리 API 가 아니다
const SKIP_PATH_PREFIXES = ["/_next/", "/__nextjs"] as const;
// 우리 라우트 핸들러 경로
const API_PATH_PREFIX = "/api/";
// 응답 본문을 콘솔에 붙일 최대 글자 수. 서버 액션 응답(RSC 흐름)이 수십 KB 일 때 콘솔이 굳지 않게 자른다
export const BODY_PREVIEW_MAX = 4000;

/** headers 가 무슨 꼴로 오든 소문자 이름으로 하나 읽는다 */
export function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  const hit = entries.find(([k]) => k.toLowerCase() === name);
  return hit ? String(hit[1]) : null;
}

/** 찍을지, 찍는다면 어느 갈래인지. null 이면 건너뛴다 */
export function classifyRequest(url: URL, headers: HeadersInit | undefined, origin: string): ApiLogKind | null {
  if (readHeader(headers, NEXT_ACTION_HEADER)) return "action";
  if (url.origin !== origin) return "other";
  if (SKIP_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) return null;
  if (readHeader(headers, RSC_HEADER) || url.searchParams.has(RSC_QUERY)) return null;
  if (url.pathname.startsWith(API_PATH_PREFIX)) return "api";
  return "other";
}

/** 같은 출처면 경로만 남긴다(가독성) */
export function shortUrl(url: URL, origin: string): string {
  return url.origin === origin ? `${url.pathname}${url.search}` : url.href;
}

/** 실패 유형. fitin-app 과 같은 어휘(상태코드, network, abort) */
export function errorType(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "abort";
  if (error instanceof TypeError) return "network";
  return "error";
}

/** 본문 텍스트를 JSON 이면 객체로, 아니면 잘라서 문자열로 */
export function previewBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text.length > BODY_PREVIEW_MAX ? `${text.slice(0, BODY_PREVIEW_MAX)}...(${text.length}자)` : text;
  }
}
