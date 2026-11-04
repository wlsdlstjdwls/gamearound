// /admin/tasks/plan — 옛 일정(WBS) 주소(2026-11-04 하루만 쓰였다). 일정은 칸반과 같은 경로의 ?mode=plan 으로 옮겼다(ROUTES.adminTasksPlan 주석).
// 지우지 않고 넘겨 준다: 프로그램 탭이 마지막 주소를 브라우저에 기억해 두어(program-shell saveTabs) 지우면 그 탭이 404 로 열린다(사용자 실측).
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function OldTasksPlanPage() {
  redirect(ROUTES.adminTasksPlan);
}
