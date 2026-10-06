// POST /api/games/view — 게임 상세 조회 한 번을 남긴다(server/game-views). 브라우저 sendBeacon 이 부른다.
//
// 서버 렌더가 아니라 브라우저가 부르게 한 이유: 검색엔진 봇 대부분은 스크립트를 돌리지 않아서
// 봇의 순회가 "사람이 본 게임" 으로 섞이지 않는다. 응답 본문은 쓰지 않는다 — beacon 은 답을 읽지 못한다.
import { z } from "zod";
import { GAME_VIEW_SLUG_MAX, recordGameView } from "@/server/game-views";

const bodySchema = z.object({ slug: z.string().trim().min(1).max(GAME_VIEW_SLUG_MAX) });

export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    // 본문이 JSON 이 아니면 아래 검증이 거른다
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return new Response(null, { status: 400 });
  await recordGameView(parsed.data.slug);
  return new Response(null, { status: 204 });
}
