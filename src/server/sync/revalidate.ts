// 캐시 무효화 — 변경된 게임의 태그만 앱에 알린다(§4.4-7, §4.5).
import { CRAWLER_USER_AGENT } from "@/server/adapters/types";
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
  const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-crawl-secret": secret, "User-Agent": CRAWLER_USER_AGENT },
    body: JSON.stringify({ tags }),
    signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`revalidate HTTP ${res.status}`);
}
