// POST /api/revalidate — 크롤러(GitHub Actions) 완료 → 캐시 태그 무효화 (§4.4 7단계, §5.2)
// 헤더 x-crawl-secret === CRAWL_SECRET. body { tags: string[] }. 항상 `home` 태그도 무효화.
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  tags: z.array(z.string().trim().min(1).max(256)).max(1000),
});

function secretMatches(provided: string | null): boolean {
  const expected = process.env.CRAWL_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get("x-crawl-secret"))) {
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
