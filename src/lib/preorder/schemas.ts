// 관리자 판정 입력 검증 — 액션 하나가 잇기, 공개, 숨기기를 맡는다.
import { z } from "zod";
import { MAX_PARAM_LEN } from "@/lib/games-query";

export const PREORDER_DECISIONS = ["link", "publish", "hide"] as const;
export type PreorderDecision = (typeof PREORDER_DECISIONS)[number];

export const preorderModerationSchema = z.object({
  postId: z.string().uuid(),
  decision: z.enum(PREORDER_DECISIONS),
  /** link 일 때만 쓴다. 게임 주소의 slug(한글 주소도 있다) */
  gameSlug: z.string().trim().max(MAX_PARAM_LEN).optional(),
});
export type PreorderModerationInput = z.infer<typeof preorderModerationSchema>;
