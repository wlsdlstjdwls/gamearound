// GET /api/me/notifications — 헤더 종 팝오버(기획서 v2.0 M-03)가 열릴 때 묻는다. 비로그인은 빈 목록.
// 루트 레이아웃은 쿠키를 읽지 않아서(홈 캐시) 알림은 서버가 그려 줄 수 없다 — 팝오버가 열릴 때만 받는다.
import { listMyNotifications } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ items: await listMyNotifications() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
