"use client";
// 업무 일정 WBS 목록 칸(2026-11-04). 정렬은 끈다 — 이 표의 순서는 번호(계층) 그 자체라, 머리를 눌러 섞으면 하위가 상위와 떨어진다.
import type { GridCol } from "@/components/admin/screen/data-grid";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { planState, spanDays, type PlanRow, type PlanState } from "@/lib/admin/plan";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TRACK_COLOR } from "./gantt";

/** 상태 딱지 색. 진행 파랑, 지연 빨강, 예정은 테두리만, 완료는 회색 — 초록은 쓰지 않는다(no-green-badges) */
const STATE_TONE: Record<PlanState, TagTone> = { todo: "outline", doing: "acc", late: "danger", done: "neutral" };

type Name = (group: string, code: string) => string;

export function planColumns({ name, who, today }: { name: Name; who: (id: string | null) => string; today: string }): GridCol<PlanRow>[] {
  return [
    { key: "no", label: M.colNo, width: "64px", value: (r) => r.no, sortable: false },
    {
      key: "title",
      label: M.colTitle,
      width: "minmax(180px,2fr)",
      value: (r) => r.title,
      sortable: false,
      mobile: "title",
      render: (r) => (
        <span className="block min-w-0" style={{ paddingLeft: r.depth * 14 }}>
          <Clamp className={cn(r.hasChildren && "font-semibold")}>{r.title}</Clamp>
        </span>
      ),
    },
    {
      key: "track",
      label: M.colTrack,
      width: "64px",
      align: "center",
      value: (r) => name("PLAN_TRACK", r.track),
      sortable: false,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: TRACK_COLOR[r.track] }} aria-hidden />
          {name("PLAN_TRACK", r.track)}
        </span>
      ),
    },
    { key: "kind", label: M.colKind, width: "64px", align: "center", value: (r) => name("PLAN_KIND", r.kind), sortable: false },
    { key: "start", label: M.colStart, width: "96px", align: "center", value: (r) => r.start ?? "", sortable: false },
    { key: "end", label: M.colEnd, width: "96px", align: "center", value: (r) => (r.kind === "milestone" ? "" : (r.end ?? "")), sortable: false },
    { key: "days", label: M.colDays, width: "52px", align: "right", value: (r) => (r.start && r.end ? spanDays(r.start, r.end) : null), sortable: false, mobile: "hide" },
    { key: "who", label: M.colAssignee, width: "84px", align: "center", value: (r) => who(r.assigneeId), sortable: false },
    {
      key: "pct",
      label: M.colProgress,
      width: "112px",
      value: (r) => r.pct,
      text: (r) => `${r.pct}%`,
      sortable: false,
      // 숫자만 두면 줄끼리 견주기 어렵다 — 갈래 색 작은 막대를 곁들인다
      render: (r) => (
        <span className="flex w-full items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: TRACK_COLOR[r.track] }} />
          </span>
          <span className="w-9 text-right tabular-nums">{r.pct}%</span>
        </span>
      ),
    },
    {
      key: "state",
      label: M.colState,
      width: "64px",
      align: "center",
      value: (r) => name("PLAN_STATE", planState(r, today)),
      sortable: false,
      render: (r) => {
        const s = planState(r, today);
        return <Tag small tone={STATE_TONE[s]}>{name("PLAN_STATE", s)}</Tag>;
      },
    },
    { key: "output", label: M.colOutput, width: "minmax(120px,1fr)", value: (r) => r.output ?? "", sortable: false, mobile: "hide" },
  ];
}
