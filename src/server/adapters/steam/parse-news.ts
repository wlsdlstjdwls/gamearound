// ISteamNews 응답 → PatchNote[]. 패치 기록 수집의 Steam 쪽 파서다.
//
// 본문(contents)은 읽지도 담지도 않는다(§10 저작권) — 요청 자체를 maxlength=1 로 잘라 보낸다.
// 우리가 남기는 것은 제목, 글 주소, 게시 시각뿐이다.
import { z } from "zod";
import { AdapterError, type PatchNote } from "../types";
import { patchVersionFromTitle } from "@/lib/patch-version";
import { STEAM_NEWS_TAG, steamNewsViewUrl } from "./constants";

const newsItemSchema = z.object({
  gid: z.union([z.string(), z.number()]),
  title: z.string(),
  /** 유닉스 초. 응답에 밀리초는 없다 */
  date: z.number(),
  /** 태그 필터를 서버가 걸어 주지만, 응답에 다른 태그가 섞여 오는 게시물이 있어 한 번 더 본다 */
  tags: z.array(z.string()).nullish(),
});

const newsResponseSchema = z.object({
  appnews: z
    .object({
      appid: z.number().nullish(),
      newsitems: z.array(newsItemSchema).nullish(),
    })
    .nullish(),
});

/**
 * 패치 공지 목록. 요청에 tags=patchnotes 를 걸어 보내지만 응답을 한 번 더 거른다 —
 * 태그 필터가 빠진 채 호출되면 일반 공지(신작 소식, 세일 안내)가 패치 기록으로 들어간다.
 */
export function parseSteamPatchNotes(raw: unknown, appid: string): PatchNote[] {
  const parsed = newsResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Steam 뉴스 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const items = parsed.data.appnews?.newsitems ?? [];

  const out: PatchNote[] = [];
  for (const item of items) {
    if (!(item.tags ?? []).includes(STEAM_NEWS_TAG)) continue;
    if (!Number.isFinite(item.date) || item.date <= 0) continue;
    const gid = String(item.gid);
    const title = item.title.trim();
    if (!gid || !title) continue;
    out.push({
      externalId: gid,
      title,
      version: patchVersionFromTitle(title),
      url: steamNewsViewUrl(appid, gid),
      publishedAt: new Date(item.date * 1000).toISOString(),
    });
  }
  return out;
}
