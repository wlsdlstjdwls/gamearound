"use client";

// 개발 모드 전용 API 호출 로그. 브라우저 개발자도구 콘솔에 [API] 줄을 접힌 그룹으로 찍는다(fitin-app 을 본뜸).
// 대상: 클라이언트 fetch(/api/*), 서버 액션(Next-Action 헤더), 외부 출처 요청. RSC 이동, 프리페치, 정적 자산은 건너뛴다.
// 판정은 lib/dev/api-log 에 있다.
//
// 감싸기를 useEffect 가 아니라 모듈 최상단에서 하는 이유: 효과는 자식부터 돌아서, SessionProvider 의
// 첫 /api/auth/me 가 감싸기 전에 나가 버린다. 모듈은 하이드레이션 전에 평가되므로 첫 요청부터 잡힌다.
// 운영 빌드에서는 NODE_ENV 가 상수로 박혀 아래 블록이 통째로 빠지고, 레이아웃도 이 컴포넌트를 그리지 않는다.
// 서버 쪽(라우트 핸들러, 액션 안의 DB 질의)은 여기 안 보인다 — 그건 dev 터미널 몫이다.

import {
  classifyRequest,
  errorType,
  previewBody,
  shortUrl,
  type ApiLogKind,
} from "@/lib/dev/api-log";

// 콘솔 %c 스타일. 화면이 아니라 개발자도구라 globals.css 토큰을 쓸 수 없다.
// fitin-app 의 common_util_api_devlog 와 같은 값이다 — 두 프로젝트를 오가도 같은 모양으로 읽히게 맞췄다(2026-11-20 사용자 요청)
const STYLE = {
  tag: "color:#6b7280;font-weight:600;", // 회색 [API] 태그
  ok: "color:#10b981;font-weight:700;", // 초록 ✓
  fail: "color:#ef4444;font-weight:700;", // 빨강 ✗
  meta: "color:#9ca3af;font-weight:400;", // 소요시간 등 보조 정보
  type: "color:#f59e0b;font-weight:700;", // 에러 유형
} as const;

// 갈래 꼬리표. fitin-app 에는 없는 것 — 서버 액션은 URL 이 지금 화면 주소라 꼬리표 없이는 API 호출로 안 읽힌다.
// 보조 정보와 같은 회색으로 소요시간 뒤에 붙여 줄 모양은 fitin-app 과 같게 둔다
const KIND_SUFFIX: Record<ApiLogKind, string> = { action: " [action]", api: "", other: "" };

/** 성공 줄. fitin-app 의 common_util_logApiSuccess 와 같은 모양 */
function logSuccess(head: string, ms: number, suffix: string, sent: unknown, data: unknown): void {
  console.groupCollapsed(`%c[API]%c ✓ %c${head} %c(${ms}ms)${suffix}`, STYLE.tag, STYLE.ok, STYLE.ok, STYLE.meta);
  if (sent !== undefined) console.log("request:", sent);
  console.log("data:", data);
  console.groupEnd();
}

/**
 * 실패 줄. fitin-app 의 common_util_logApiError 와 같은 모양.
 * 취소(abort)만 회색으로 낮춘다 — 개발 모드는 효과를 두 번 돌려 첫 요청을 늘 취소하고, 검색 제안도 칠 때마다 앞 요청을 끊는다
 */
function logError(head: string, ms: number, suffix: string, type: string, sent: unknown, body: unknown, error: unknown): void {
  const tone = type === "abort" ? STYLE.meta : STYLE.fail;
  console.groupCollapsed(
    `%c[API]%c ✗ %c${head} %c(${ms}ms)${suffix} %c[type: ${type}]`,
    STYLE.tag, tone, tone, STYLE.meta, type === "abort" ? STYLE.meta : STYLE.type,
  );
  console.log("errorType:", type);
  if (sent !== undefined) console.log("request:", sent);
  if (body !== undefined) console.log("responseBody:", body);
  if (error !== undefined) console.log("error:", error);
  console.groupEnd();
}

// HMR 로 모듈이 다시 평가돼도 두 번 감싸지 않게 원본을 window 에 한 번만 남긴다
const ORIGINAL_KEY = "__gaOriginalFetch";

type PatchedWindow = Window & { [ORIGINAL_KEY]?: typeof fetch };

function requestBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof body === "string") return previewBody(body);
  if (body instanceof FormData) return Object.fromEntries(body.entries());
  if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
  return body;
}

async function responsePreview(res: Response): Promise<unknown> {
  try {
    return previewBody(await res.text());
  } catch {
    return undefined;
  }
}

function install(): void {
  const w = window as PatchedWindow;
  const original = w[ORIGINAL_KEY] ?? window.fetch.bind(window);
  w[ORIGINAL_KEY] = original;

  window.fetch = async (input, init) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    const headers = init?.headers ?? req?.headers;
    const kind = classifyRequest(url, headers, location.origin);
    if (!kind) return original(input, init);

    const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
    const head = `${method} ${shortUrl(url, location.origin)}`;
    const suffix = KIND_SUFFIX[kind];
    const sent = requestBody(init?.body);
    const startedAt = performance.now();
    const elapsed = () => Math.round(performance.now() - startedAt);

    try {
      const res = await original(input, init);
      const ms = elapsed();
      // 본문은 복제본에서 읽는다 — 호출부가 원본 스트림을 그대로 소비해야 한다. 기다리지 않아 응답 전달이 늦지 않는다.
      // 상태코드가 실패면 fitin-app 처럼 실패 줄로 찍는다(유형 자리에 상태코드)
      void responsePreview(res.clone()).then((data) => {
        if (res.ok) logSuccess(head, ms, suffix, sent, data);
        else logError(head, ms, suffix, String(res.status), sent, data, undefined);
      });
      return res;
    } catch (error) {
      logError(head, elapsed(), suffix, errorType(error), sent, undefined, error);
      throw error;
    }
  };
}

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") install();

/** 그리는 것은 없다. 레이아웃이 이 모듈을 클라이언트 번들에 싣게 하는 자리표시다 */
export function DevApiLog(): null {
  return null;
}
