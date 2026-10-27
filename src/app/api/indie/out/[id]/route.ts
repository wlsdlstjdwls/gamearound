// GET /api/indie/out/[id]?i=<링크 순번> — 인디 글 바깥 링크(플레이하기, 구매, 공식 사이트)로 넘겨 주며 클릭을 센다(2026-10-27, 기획서 3장 1번).
//
// 목적지는 주소창이 아니라 글에서 다시 읽는다 — 받은 주소로 넘기면 열린 리다이렉트다(lib/routes 의 indieOutPath).
// 세기는 넘겨 준 뒤(after) 한다: 세는 DB 왕복이 바깥 스토어가 뜨는 시간을 늦추지 않게. 세기가 실패해도 사람은 이미 넘어갔다.
// 공개 글이 아니거나 순번이 틀리면 404 다. 302 인 이유: 글쓴이가 주소를 고치면 다음 클릭부터 새 곳으로 가야 해서 영구 이동(301)으로 굳히면 안 된다.
import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordIndieLinkClick, resolveIndieOutLink } from "@/server/services/indie";

export const dynamic = "force-dynamic";

const idSchema = z.uuid();
const indexSchema = z.coerce.number().int().min(0);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = idSchema.safeParse((await params).id);
  const index = indexSchema.safeParse(req.nextUrl.searchParams.get("i"));
  if (!id.success || !index.success) return new NextResponse(null, { status: 404 });
  const link = await resolveIndieOutLink(id.data, index.data);
  if (!link) return new NextResponse(null, { status: 404 });
  after(() => recordIndieLinkClick(id.data, link.kind, link.authorUserId).catch(() => {}));
  return NextResponse.redirect(link.url, { status: 302, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
