// OG 이미지 안에 외부 이미지(게임 커버)를 넣을 때 쓰는 로더.
//
// satori 에 원격 URL 을 그대로 넘기면, 그 이미지 하나가 실패했을 때 공유 이미지 전체가 500 이 된다.
// 커버가 없는 게임은 어차피 있고 스토어 CDN 이 항상 응답한다는 보장도 없으므로,
// 여기서 먼저 받아 보고 실패하면 null 을 돌려준다 — 호출부는 자리 표시자로 대체한다.
import { errorMessage } from "@/lib/errors";

/** 커버 하나 때문에 OG 생성이 오래 붙들리지 않게 하는 상한(ms) */
const COVER_TIMEOUT_MS = 3000;

export async function loadOgImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(COVER_TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const body = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${body}`;
  } catch (e) {
    console.warn("[og] 커버 로드 실패, 자리 표시자로 대체", errorMessage(e));
    return null;
  }
}
