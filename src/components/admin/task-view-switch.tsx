"use client";
// 업무관리 보기 전환(2026-11-04): 칸반 | 일정(WBS). 메뉴 칸은 하나고 두 보기는 주소가 다르다(/admin/tasks, /admin/tasks/plan).
// 다른 경로로 가는 이동이라 loading.tsx 뼈대가 바로 선다 — 누른 순간 화면이 바뀌므로 낙관 표시를 따로 두지 않는다.
// 모양은 칸반 거르기 줄의 세그먼트와 같다(task-fields SEGMENT) — 같은 화면 안의 고르기라 같은 손맛이어야 한다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";

const VIEWS = [
  { href: ROUTES.adminTasks, label: M.viewBoard },
  { href: ROUTES.adminTasksPlan, label: M.viewPlan },
] as const;

export function TaskViewSwitch() {
  const pathname = usePathname();
  return (
    <nav aria-label={M.viewLabel} className={cn(SEGMENT, "w-fit")}>
      {VIEWS.map((v) => {
        const on = pathname === v.href;
        return (
          <Link key={v.href} href={v.href} aria-current={on ? "page" : undefined} className={cn(SEGMENT_ITEM, "flex-none px-3", on && SEGMENT_ITEM_ON)}>
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
