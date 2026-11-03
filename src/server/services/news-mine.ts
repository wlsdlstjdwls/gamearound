// 맞춤 소식 화면(/news/mine)의 목록. 재료 읽기와 고르기는 메일과 같다(services/news-digest, lib/news/digest).
// 파일을 가른 이유는 services/news-digest 머리 주석(세션 모듈은 server-only).
import { getDb } from "@/server/db/client";
import { getCurrentUser } from "@/server/services/users";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { NEWS_DIGEST_PAGE_ITEMS, hasDigestTaste, pickDigest } from "@/lib/news/digest";
import type { NewsDto } from "@/server/services/games";
import { digestNewsDto, digestSince, loadDigestCandidates, loadDigestReaders } from "@/server/services/news-digest";

export type MyDigestNews = { items: NewsDto[]; hasTaste: boolean };

/** 맞춤 소식 화면. 지난 한 주에서 고른다(지난 묶음 시각과 상관없이 — 화면은 메일과 달리 다시 읽는 자리다) */
export async function listMyDigestNews(now: Date = new Date()): Promise<MyDigestNews> {
  const me = await getCurrentUser();
  if (!me) throw new Error(AUTH_MESSAGES.loginRequired);
  const db = getDb();
  const [readers, candidates] = await Promise.all([
    loadDigestReaders(db, { userId: me.id }),
    loadDigestCandidates(db, digestSince(now, null)),
  ]);
  const taste = readers[0]?.taste;
  if (!taste || !hasDigestTaste(taste)) return { items: [], hasTaste: false };
  return { items: pickDigest(candidates, taste, NEWS_DIGEST_PAGE_ITEMS).map(digestNewsDto), hasTaste: true };
}
