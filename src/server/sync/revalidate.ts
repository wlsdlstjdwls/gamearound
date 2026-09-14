// 캐시 무효화 — 변경된 게임의 태그만 앱에 알린다(§4.4-7, §4.5).
import { CRAWLER_USER_AGENT } from "@/server/adapters/types";
import { REVALIDATE_TAGS_PER_REQUEST } from "@/lib/cache";
import { REVALIDATE_TIMEOUT_MS } from "./constants";

export async function revalidateGameTags(slugs: string[], companySlugs: string[] = []): Promise<void> {
  if (slugs.length === 0 && companySlugs.length === 0) return;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRAWL_SECRET;
  if (!base || !secret) {
    console.warn("[sync] NEXT_PUBLIC_APP_URL / CRAWL_SECRET 없음 — revalidate 생략");
    return;
  }
  const tags = [...slugs.map((s) => `game:${s}`), ...companySlugs.map((s) => `company:${s}`)];
  const url = `${base.replace(/\/$/, "")}/api/revalidate`;
  // 시드가 많은 날엔 태그가 천 단위다 — 한 번에 보내면 라우트 검증에 걸려 400 이고
  // 그 실행의 무효화가 전부 날아간다. 나눠 보내고, 한 묶음이 실패하면 어디서 끊겼는지 남긴다.
  for (let i = 0; i < tags.length; i += REVALIDATE_TAGS_PER_REQUEST) {
    const chunk = tags.slice(i, i + REVALIDATE_TAGS_PER_REQUEST);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crawl-secret": secret, "User-Agent": CRAWLER_USER_AGENT },
      body: JSON.stringify({ tags: chunk }),
      signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`revalidate HTTP ${res.status} (${i + 1}~${i + chunk.length}/${tags.length})`);
  }
}
