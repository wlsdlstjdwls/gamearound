// 서비스 변경 안내서 읽기. 올리기는 scripts/guide-upload 가 하고, 여기는 가장 늦게 올린 본문을 찾아 돌려주기만 한다.
// 판을 고르는 기준은 Blob 의 올린 시각 하나다 — 따로 표를 두면 올리기와 표 쓰기가 어긋날 자리가 하나 더 생긴다.
import "server-only";
import { list } from "@vercel/blob";
import { GUIDE_HTML_PREFIX } from "@/lib/admin/guide";

export type GuideInfo = { url: string; uploadedAt: Date };

/** 가장 늦게 올린 본문. 없으면 null */
export async function getLatestGuide(): Promise<GuideInfo | null> {
  const { blobs } = await list({ prefix: GUIDE_HTML_PREFIX });
  const latest = blobs.reduce<(typeof blobs)[number] | null>((best, b) => (!best || b.uploadedAt > best.uploadedAt ? b : best), null);
  return latest ? { url: latest.url, uploadedAt: latest.uploadedAt } : null;
}

/** 본문 HTML. Blob 주소는 관리자 화면 밖으로 내보내지 않으려고 서버가 대신 받아 넘긴다 */
export async function getLatestGuideHtml(): Promise<string | null> {
  const guide = await getLatestGuide();
  if (!guide) return null;
  const res = await fetch(guide.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`안내서 본문을 받지 못했어요(${res.status})`);
  return res.text();
}
