// GET /api/games/patch-body/[id] — 본문이 비어 있는 패치 노트의 원문을 그 자리에서 받아 준다(services/games/patch-body 머리 주석).
// 업데이트 노트 팝업(components/patch-list)이 연 순간 부른다. 공개 정보라 로그인을 묻지 않는다.
import { z } from "zod";
import { getPatchOriginalBody } from "@/server/services/games/patch-body";
import { PATCH_BODY_REVALIDATE_SECONDS } from "@/lib/cache";

const idSchema = z.string().uuid();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return new Response(null, { status: 400 });
  const body = await getPatchOriginalBody(parsed.data);
  // 빈 답은 CDN 에 담지 않는다 — 스팀이 잠깐 실패한 답이 하루 동안 모두에게 나가면 안 된다
  const cache = body.bodyEn ? `public, s-maxage=${PATCH_BODY_REVALIDATE_SECONDS}` : "no-store";
  return Response.json(body, { headers: { "Cache-Control": cache } });
}
