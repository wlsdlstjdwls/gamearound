// GET /api/admin/guide — 서비스 변경 안내서 본문(HTML). 관리자만 받는다.
// 화면(/admin/guide)이 iframe 으로 부르고, "새 창에서 열기" 도 이 주소다. 그래서 같은 출처 안에서만 끼워 넣게 하고, 저장해 두지 않게 한다.
import { NextResponse } from "next/server";
import { GUIDE_MESSAGES as M } from "@/lib/admin/messages";
import { getLatestGuideHtml } from "@/server/services/admin-guide";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new NextResponse(null, { status: STATUS_FORBIDDEN });
  const html = await getLatestGuideHtml();
  if (!html) return new NextResponse(M.empty, { status: STATUS_NOT_FOUND, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-frame-options": "SAMEORIGIN",
      "x-robots-tag": "noindex",
    },
  });
}
