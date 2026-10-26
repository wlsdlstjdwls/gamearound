// 글쓰기, 댓글 검증 규칙 — 서버 액션과 글쓰기 화면이 같은 zod 스키마 하나를 쓴다(AGENTS.md 2장).
// 카테고리마다 필수 칸이 다르다(기획서 6.4): 리뷰는 스포 여부, 홍보는 홍보 유형(링크는 선택).
import { z } from "zod";
import { COMMENT_BODY_MAX, POST_BODY_MAX, POST_CATEGORIES, POST_TITLE_MAX, PROMO_TYPES } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";

const title = z.string().trim().min(1, M.titleRequired).max(POST_TITLE_MAX, M.titleTooLong);
const body = z.string().trim().min(1, M.bodyRequired).max(POST_BODY_MAX, M.bodyTooLong);

export const postInputSchema = z
  .object({
    category: z.enum(POST_CATEGORIES, { message: M.categoryRequired }),
    title,
    body,
    /** "yes" | "no" | "" — 리뷰에서 고르지 않으면 빈 문자열로 와서 아래에서 막는다 */
    spoiler: z.enum(["yes", "no", ""]).default(""),
    promoType: z.enum([...PROMO_TYPES, ""]).default(""),
    link: z.string().trim().max(500).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.category === "review" && v.spoiler === "") ctx.addIssue({ code: "custom", path: ["spoiler"], message: M.spoilerRequired });
    if (v.category === "promo" && v.promoType === "") ctx.addIssue({ code: "custom", path: ["promoType"], message: M.promoTypeRequired });
    if (v.category === "promo" && v.link !== "" && !/^https?:\/\//i.test(v.link)) ctx.addIssue({ code: "custom", path: ["link"], message: M.linkInvalid });
  });

export type PostInput = z.infer<typeof postInputSchema>;

export const commentInputSchema = z.object({
  postId: z.uuid(),
  body: z.string().trim().min(1, M.commentRequired).max(COMMENT_BODY_MAX, M.commentTooLong),
});
