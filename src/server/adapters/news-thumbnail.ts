// 뉴스 썸네일 바이트를 원본 매체에서 가져오기만 한다(DB 를 건드리지 않는다).
// 왜 어댑터인가: 밖으로 나가는 요청은 전부 이 계층을 지난다 — 타임아웃, UA, 프록시 판정이 한 곳에 있어야 한다.
// json/text 가 아니라 raw 를 쓰는 이유: 이미지라 파싱할 것이 없고, 상태 코드는 호출부(라우트)가 직접 옮긴다.
import { sniffImageType } from "@/lib/news/thumbnail";
import { createHttpClient } from "./http";

/** 원본이 늦으면 기다리지 않는다 — 썸네일 한 장 때문에 함수를 오래 붙들지 않는다 */
const TIMEOUT_MS = 8_000;

/**
 * 받아 줄 최대 크기. 목록 썸네일은 72px 자리라 원본이 아무리 커도 이 선을 넘을 이유가 없다.
 * 넘으면 버린다 — 우리 대역폭으로 남의 큰 파일을 날라 주지 않는다.
 */
export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const http = createHttpClient({
  source: "rss",
  label: "뉴스 썸네일",
  timeoutMs: TIMEOUT_MS,
  headers: { Accept: "image/*" },
});

export interface FetchedThumbnail {
  bytes: ArrayBuffer;
  contentType: string;
}

/** 이미지가 아니거나(매체가 차단 페이지를 주는 경우) 너무 크면 null */
export async function fetchNewsThumbnail(url: string): Promise<FetchedThumbnail | null> {
  const res = await http.raw(url);
  if (!res.ok) return null;

  // 크기를 미리 알려주면 받기 전에 끊는다 — 큰 파일은 바이트를 읽는 것 자체가 비용이다
  const declaredLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_THUMBNAIL_BYTES) return null;

  const declared = res.headers.get("content-type") ?? "";
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_THUMBNAIL_BYTES) return null;

  // 선언을 그대로 믿지 않는 이유는 sniffImageType 주석에 있다(게임메카는 jpg 를 octet-stream 으로 준다)
  const contentType = declared.startsWith("image/") ? declared : sniffImageType(bytes);
  if (!contentType) return null;
  return { bytes, contentType };
}
