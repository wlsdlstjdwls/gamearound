// GET /api/v1/games/[slug] — 공개 JSON 껍데기 (§5.2, 추후 앱용). 내부 id 제외한 DTO. 인증은 확장1에서 결정(§11-10)
import { NextResponse } from "next/server";
import { getGameBySlugCached, toPublicGameDto } from "@/server/services/games";
import { decodeSlugParam } from "@/lib/slug";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeSlugParam((await params).slug);
  const game = await getGameBySlugCached(slug);
  if (!game) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } });
  }
  return NextResponse.json(
    { data: toPublicGameDto(game) },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
