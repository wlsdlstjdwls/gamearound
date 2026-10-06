// 인디 홍보 글 검증 — 서버 액션과 폼이 같은 규칙을 본다(AGENTS §2). 순수 함수라 테스트로 고정한다.
//
// 바깥 주소는 https 만 받는다. 글이 승인 없이 바로 서므로 javascript:, data: 같은 주소가 링크로 박히면
// 누르는 사람이 당한다. 유튜브는 주소가 아니라 영상 ID 만 남긴다 — iframe 에 넣는 값을 우리가 정한다.
import { z } from "zod";
import { isDirectChildPath } from "@/lib/blob-path";
import {
  INDIE_BODY_MAX,
  INDIE_BODY_MIN,
  INDIE_DEVELOPER_MAX,
  INDIE_HIDE_REASON_MAX,
  INDIE_LINK_KINDS,
  INDIE_LINK_MAX,
  INDIE_PLATFORMS,
  INDIE_RELEASE_NOTE_MAX,
  INDIE_REPORT_REASON_MAX,
  INDIE_STAGES,
  INDIE_TAGLINE_MAX,
  INDIE_TITLE_MAX,
  INDIE_URL_MAX,
} from "./constants";
import { INDIE_FORM_MESSAGES as M } from "./messages";

/** 유튜브 영상 ID 는 11자 [A-Za-z0-9_-] 다 */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);

/**
 * 유튜브 주소에서 영상 ID 를 꺼낸다. watch?v=, youtu.be/, shorts/, embed/ 넷을 받는다.
 * 못 꺼내면 null — 호출부가 "주소를 확인해 주세요" 로 돌려보낸다.
 */
export function parseYoutubeId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
  const candidate =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? "");
  return YOUTUBE_ID.test(candidate) ? candidate : null;
}

/** https 주소인가. 사람이 적는 칸이라 앞뒤 공백은 봐준다 */
export function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

const linkSchema = z.object({
  kind: z.enum(INDIE_LINK_KINDS),
  url: z.string().trim().max(INDIE_URL_MAX, M.linkInvalid).refine(isHttpsUrl, M.linkInvalid),
});

export const indiePostSchema = z.object({
  title: z.string().trim().min(1, M.titleRequired).max(INDIE_TITLE_MAX, M.titleTooLong(INDIE_TITLE_MAX)),
  tagline: z.string().trim().min(1, M.taglineRequired).max(INDIE_TAGLINE_MAX, M.taglineTooLong(INDIE_TAGLINE_MAX)),
  developerName: z.string().trim().min(1, M.developerRequired).max(INDIE_DEVELOPER_MAX, M.developerTooLong(INDIE_DEVELOPER_MAX)),
  body: z.string().trim().min(INDIE_BODY_MIN, M.bodyTooShort(INDIE_BODY_MIN)).max(INDIE_BODY_MAX, M.bodyTooLong(INDIE_BODY_MAX)),
  stage: z.enum(INDIE_STAGES),
  platforms: z.array(z.enum(INDIE_PLATFORMS)).min(1, M.platformsRequired).transform((xs) => [...new Set(xs)]),
  releaseNote: z
    .string()
    .trim()
    .max(INDIE_RELEASE_NOTE_MAX, M.releaseNoteTooLong(INDIE_RELEASE_NOTE_MAX))
    .transform((s) => s || null),
  /** 빈칸이면 영상 없음. 적었는데 못 읽으면 막는다 — 조용히 버리면 "왜 영상이 안 뜨지" 가 된다 */
  youtube: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (!s) return null;
      const id = parseYoutubeId(s);
      if (!id) ctx.addIssue({ code: "custom", message: M.youtubeInvalid });
      return id;
    }),
  links: z.array(linkSchema).max(INDIE_LINK_MAX, M.tooManyLinks(INDIE_LINK_MAX)),
  gameId: z.uuid().nullable(),
});

export type IndiePostInput = z.infer<typeof indiePostSchema>;

export const indieReportSchema = z.object({
  postId: z.uuid(),
  reason: z.string().trim().min(1).max(INDIE_REPORT_REASON_MAX),
});

export const indieModerationSchema = z.object({
  postId: z.uuid(),
  decision: z.enum(["hide", "restore", "verify_link", "reject_link"]),
  reason: z.string().trim().max(INDIE_HIDE_REASON_MAX).optional(),
});

export type IndieModerationInput = z.infer<typeof indieModerationSchema>;

/** 그림 저장 경로 접두. 글 ID 를 박아 남의 글 경로로 토큰을 받거나 남의 그림을 등록하는 길을 막는다 */
export function indieImagePrefix(postId: string): string {
  return `indie/${postId}/`;
}

export function isOwnIndieImagePath(pathname: string, postId: string): boolean {
  return isDirectChildPath(pathname, indieImagePrefix(postId));
}

/** 업로드 토큰을 받을 때 브라우저가 싣는 값 */
export const indieImageUploadPayloadSchema = z.object({ postId: z.uuid() });

/** 올린 뒤 등록할 때 싣는 값. 크기는 브라우저가 줄인 결과다 */
export const indieImageRegisterSchema = z.object({
  postId: z.uuid(),
  url: z.url(),
  pathname: z.string().min(1).max(300),
  width: z.coerce.number().int().min(1).max(10_000),
  height: z.coerce.number().int().min(1).max(10_000),
});

export type IndieImageRegisterInput = z.infer<typeof indieImageRegisterSchema>;
