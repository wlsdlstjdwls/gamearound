// next/image 로 최적화해도 되는 그림 주소인가 — next.config.ts 의 images.remotePatterns 와 같은 목록이어야 한다.
//
// 등록 안 된 호스트(닌텐도, PlayStation, Xbox 등)를 최적화 경로로 넘기면 next/image 가 "hostname is not configured" 로 던지고,
// 그 오류가 그림 하나가 아니라 감싼 클라이언트 트리를 통째로 무너뜨린다(2026-11-20 머리띠 자동완성에 닌텐도 그림이 뜨면 머리띠가 사라졌다).
// 그래서 등록된 호스트만 최적화하고 나머지는 unoptimized 로 원본을 그대로 띄운다. 게임 카드와 검색 자동완성이 같이 쓴다.
const OPTIMIZABLE_HOSTS = ["cdn.akamai.steamstatic.com", "shared.akamai.steamstatic.com", "cdn.cloudflare.steamstatic.com"];
/** remotePatterns 의 "**.public.blob.vercel-storage.com" 과 같은 꼬리 */
const OPTIMIZABLE_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isOptimizableImage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return OPTIMIZABLE_HOSTS.includes(hostname) || hostname.endsWith(OPTIMIZABLE_HOST_SUFFIX);
  } catch {
    return false;
  }
}
