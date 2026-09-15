// GET /api/news/thumbnail?u=<주소>&s=<서명> — 뉴스 썸네일을 서버가 받아 같은 출처로 흘려보낸다.
// 왜 필요한지, 왜 서명으로 잠그는지는 lib/news/thumbnail 상단에 있다.
import { NextResponse, type NextRequest } from "next/server";
import { THUMBNAIL_SIGNATURE_PARAM, THUMBNAIL_URL_PARAM, normalizeThumbnailUrl, thumbnailSignatureMatches } from "@/lib/news/thumbnail";
import { fetchNewsThumbnail } from "@/server/adapters/news-thumbnail";

/**
 * 한 번 정해진 썸네일 주소는 내용이 바뀌지 않는다 — 기사가 사진을 갈면 주소가 통째로 바뀐다.
 * 그래서 브라우저, CDN 모두 길게 들고 있어도 된다(s-maxage 30일).
 */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, immutable";

/** 실패도 잠깐은 기억한다 — 죽은 주소 하나 때문에 목록을 열 때마다 밖으로 왕복하지 않게 */
const FAILURE_CACHE_CONTROL = "public, max-age=600";

function empty(status: number, cacheControl: string): NextResponse {
  return new NextResponse(null, { status, headers: { "Cache-Control": cacheControl } });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get(THUMBNAIL_URL_PARAM);
  const signature = req.nextUrl.searchParams.get(THUMBNAIL_SIGNATURE_PARAM);
  if (!url || !thumbnailSignatureMatches(url, signature)) return empty(403, FAILURE_CACHE_CONTROL);

  // 서명이 맞아도 https 만 나간다 — 서명 키가 새더라도 내부망 주소(http://169.254...)로는 못 나가게 한다.
  // 저장된 주소의 형태를 고르는 일은 화면 쪽(normalizeThumbnailUrl)이 이미 했다
  const target = normalizeThumbnailUrl(url);
  if (!target || !target.startsWith("https://")) return empty(400, FAILURE_CACHE_CONTROL);

  try {
    const image = await fetchNewsThumbnail(target);
    if (!image) return empty(502, FAILURE_CACHE_CONTROL);
    return new NextResponse(image.bytes, {
      headers: { "Content-Type": image.contentType, "Cache-Control": CACHE_CONTROL },
    });
  } catch {
    // 원본이 죽었거나 시간이 다 된 경우. 화면은 대체 면으로 받는다(components/ui/image-fallback)
    return empty(502, FAILURE_CACHE_CONTROL);
  }
}
