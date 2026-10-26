// 게시글, 댓글 숨김 요청의 모양(/admin/posts). 서버 액션이 검사한다 — 화면은 버튼 둘이라 따로 고를 값이 없다.
// lib/community/schemas 에 넣지 않은 이유: 그 파일은 글쓰기 화면과 서버가 나눠 쓰는 사용자 입력 규칙이고, 이것은 운영진 동작이다.
import { z } from "zod";

export const contentModerationSchema = z.object({
  kind: z.enum(["post", "comment"]),
  id: z.uuid(),
  decision: z.enum(["hide", "restore"]),
});

export type ContentModerationInput = z.infer<typeof contentModerationSchema>;
