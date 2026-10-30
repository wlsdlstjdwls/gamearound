// 글쓰기, 댓글 검증 규칙 — 서버 액션과 글쓰기 화면이 같은 zod 스키마 하나를 쓴다(AGENTS.md 2장).
// 카테고리마다 필수 칸이 다르다(기획서 6.4): 리뷰는 스포 여부, 홍보는 홍보 유형(링크는 선택).
// 관련 게임(목업 S-14)은 리뷰, 공략에서 필수, 홍보에서 선택이다. 게임은 자동완성에서 고른 slug 로 온다 —
// 고른 slug 가 실제 게임인지는 서비스가 DB 로 다시 본다(services/community/posts).
import { z } from "zod";
import { COMMENT_BODY_MAX, POST_BODY_MAX, POST_CATEGORIES, POST_HTML_MAX, POST_TITLE_MAX, PROMO_TYPES, requiresGame } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { hasPostImage, isRichBody, richPlainText } from "@/lib/community/rich-text";

/** slug 입력 상한 — 주소창 손질로 들어오는 긴 문자열이 질의까지 가지 않게 */
const GAME_SLUG_MAX = 200;

const title = z.string().trim().min(1, M.titleRequired).max(POST_TITLE_MAX, M.titleTooLong);
/**
 * 본문은 에디터의 HTML 이다(lib/community/rich-text). 비었는지, 긴지는 태그를 걷은 글자로 잰다 — 빈 문단 "<p></p>" 도
 * 글자로는 9자라 그대로 재면 빈 글이 통과한다. 그림만 올린 글은 본문이 있는 것으로 본다. 옛 글자 본문도 같은 규칙으로 통과한다.
 */
const body = z
  .string()
  .trim()
  .max(POST_HTML_MAX, M.bodyTooLong)
  .superRefine((v, ctx) => {
    const text = isRichBody(v) ? richPlainText(v) : v;
    if (!text && !hasPostImage(v)) ctx.addIssue({ code: "custom", message: M.bodyRequired });
    else if (text.length > POST_BODY_MAX) ctx.addIssue({ code: "custom", message: M.bodyTooLong });
  });

export const postInputSchema = z
  .object({
    category: z.enum(POST_CATEGORIES, { message: M.categoryRequired }),
    title,
    body,
    /** "yes" | "no" | "" — 리뷰에서 고르지 않으면 빈 문자열로 와서 아래에서 막는다 */
    spoiler: z.enum(["yes", "no", ""]).default(""),
    promoType: z.enum([...PROMO_TYPES, ""]).default(""),
    link: z.string().trim().max(500).default(""),
    /** 관련 게임 slug. 고르지 않았으면 빈 문자열. 상한은 slug 컬럼이 실제로 갖는 길이보다 넉넉하게 */
    gameSlug: z.string().trim().max(GAME_SLUG_MAX).default(""),
    /** 라운지 글이 묶일 내 인디 게임 slug(2026-10-29). 비우면 내 모든 게임에 걸친 글. 내 글인지는 서비스가 DB 로 본다 */
    indieSlug: z.string().trim().max(GAME_SLUG_MAX).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.category === "review" && v.spoiler === "") ctx.addIssue({ code: "custom", path: ["spoiler"], message: M.spoilerRequired });
    if (v.category === "promo" && v.promoType === "") ctx.addIssue({ code: "custom", path: ["promoType"], message: M.promoTypeRequired });
    if (v.category === "promo" && v.link !== "" && !/^https?:\/\//i.test(v.link)) ctx.addIssue({ code: "custom", path: ["link"], message: M.linkInvalid });
    if (requiresGame(v.category) && v.gameSlug === "") ctx.addIssue({ code: "custom", path: ["gameSlug"], message: M.gameRequired });
  });

export type PostInput = z.infer<typeof postInputSchema>;

const commentBody = z.string().trim().min(1, M.commentRequired).max(COMMENT_BODY_MAX, M.commentTooLong);

/** 댓글 고치기(2026-10-30). 게시판 댓글과 인디 댓글이 같이 쓴다 */
export const commentEditSchema = z.object({ id: z.uuid(), body: commentBody });

export const commentInputSchema = z.object({
  postId: z.uuid(),
  body: commentBody,
  /** 답글이면 원댓글 id. 비우면 글에 바로 다는 댓글 */
  parentId: z.uuid().nullish(),
});
