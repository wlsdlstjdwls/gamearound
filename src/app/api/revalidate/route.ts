// POST /api/revalidate — 크롤러(GitHub Actions) 완료 → 캐시 태그 무효화 (§4.4 7단계, §5.2)
// 헤더 x-crawl-secret === CRAWL_SECRET. body { tags: string[] }. 항상 `home` 태그도 무효화.
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { REVALIDATE_TAGS_PER_REQUEST } from "@/lib/cache";
import { secretMatches } from "@/lib/secret";

const BodySchema = z.object({
  tags: z.array(z.string().trim().min(1).max(256)).max(REVALIDATE_TAGS_PER_REQUEST),
});

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get("x-crawl-secret"), process.env.CRAWL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const tags = Array.from(new Set([...parsed.data.tags, "home"]));
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({ revalidated: true, tags });
}
