// GET /api/admin/tasks/version — 업무관리 판 번호(server/services/admin-tasks/live). 열린 판(components/admin/use-work-live)이 짧게 묻는다.
// 판 자료는 주지 않는다 — 번호가 바뀌었을 때만 화면이 router.refresh 로 판을 다시 읽는다. DB 를 건드리지 않는 것이 이 길의 몫이다.
import { getCurrentUser } from "@/server/services/users";
import { readWorkVersion } from "@/server/services/admin-tasks";

export const dynamic = "force-dynamic"; // 묻는 순간의 번호여야 한다

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (user?.role !== "admin") return Response.json({ version: null }, { status: 403 });
  return Response.json({ version: await readWorkVersion() }, { headers: { "Cache-Control": "no-store" } });
}
