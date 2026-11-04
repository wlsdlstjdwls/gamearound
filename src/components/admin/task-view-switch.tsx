"use client";
// 업무관리 보기 전환(2026-11-04): 칸반 | 일정(WBS). 둘은 같은 경로의 주소 값이다(?mode=plan, ROUTES.adminTasksPlan 주석).
// 누른 순간 고른 칸이 먼저 바뀌고(useNavPicked), 결과 자리(PendingRegion)는 새 보기가 올 때까지 흐린 채 남는다 — 뼈대가 끼지 않아 깜빡이지 않는다.
// 모양은 칸반 거르기 줄의 세그먼트와 같다(task-fields SEGMENT) — 같은 화면 안의 고르기라 같은 손맛이어야 한다.
import Link from "next/link";
import { useNavPendingGo, useNavPicked } from "@/components/ui/nav-pending";
import { isPlainClick } from "@/components/ui/chip-nav";
import { SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";

export type TaskView = "board" | "plan";

const VIEWS: { key: TaskView; href: string; label: string }[] = [
  { key: "board", href: ROUTES.adminTasks, label: M.viewBoard },
  { key: "plan", href: ROUTES.adminTasksPlan, label: M.viewPlan },
];

export function TaskViewSwitch({ view }: { view: TaskView }) {
  const go = useNavPendingGo();
  // 이동 틀(NavPendingScope)의 무리 없는 이동("")으로 간다 — 누른 주소가 답이 올 때까지 켜짐을 쥔다
  const picked = useNavPicked("");
  return (
    <nav aria-label={M.viewLabel} className={cn(SEGMENT, "w-fit")}>
      {VIEWS.map((v) => {
        const on = picked ? picked === v.href : view === v.key;
        return (
          <Link
            key={v.key}
            href={v.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              if (!go || !isPlainClick(e) || on) return;
              e.preventDefault();
              go(v.href);
            }}
            className={cn(SEGMENT_ITEM, "flex-none px-3.5", on && SEGMENT_ITEM_ON)}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
