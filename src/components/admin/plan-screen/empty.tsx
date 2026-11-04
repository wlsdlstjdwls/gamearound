"use client";
// 일정이 하나도 없을 때(2026-11-04, 사용자 "일정이 없으니 자세히 버튼 쪽 행이 깨진다, 빈 문구를 모션으로, 거기서 바로 추가").
// 요약 띠, 범례, 간트를 세우지 않고 이 판 하나만 둔다 — 빈 요약 띠는 사람도 이정표도 없어 접기 단추만 떠 있었다.
// 그림은 사이트 공용 빈 화면 그림(ui/empty-scene, 손전등이 훑는 CSS 움직임)이다. 단추는 WBS 맨 아래 "새 일정" 과 같은 일을 한다:
// 줄을 만들고 그 자리 이름 칸을 연다.
import { buttonClass } from "@/components/ui/button";
import { EmptyScene } from "@/components/ui/empty-scene";
import { PlusIcon } from "@/components/ui/icons";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";

export function PlanEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="animate-fade-in flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <EmptyScene className="mb-1" />
      <h2 className="text-[17px] font-bold text-ink">{M.emptyTitle}</h2>
      <p className="max-w-[420px] text-[13.5px] leading-relaxed text-dim">{M.emptyBody}</p>
      {/* 공통코드관리(파트 더하기) 단추는 두지 않는다 — 상단 줄에 늘 있다(사용자 "빈 판에는 없어도 될 듯") */}
      <button type="button" onClick={onCreate} className={buttonClass({ variant: "primary", size: "md", className: "mt-1 gap-1.5" })}>
        <PlusIcon size={16} />
        {M.emptyCreate}
      </button>
    </section>
  );
}
