// 프로모션 진행상태 딱지 — 프로모션등록 그리드, 상세와 상품등록 화면의 걸린 프로모션 줄이 같이 쓴다.
// 진행상태는 진행 중, 중단 둘이다(2026-10-30 사용자). 진행 중은 옅은 초록 알약에 점 하나(켜진 불) — 채운 진한 초록은 무겁고 탁해 보였다(사용자 "이쁘게").
// 점과 테두리로 "처리됨" 같은 옅은 초록 딱지와 갈린다.
// 중단 사유(운영 중단, 가격변동 중단, 시작 전, 기간 종료)는 딱지 옆 작은 글로 붙인다 — 사유마다 색을 달면 알록달록해 읽히지 않았다.
import { Tag } from "@/components/ui/tag";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import type { PromotionStatus } from "@/lib/pricing/quote";

/** 그리드 정렬, 엑셀에 쓰는 글 */
export function statusText(s: PromotionStatus): string {
  return s.state === "live" ? M.statusLabels.live : `${M.statusLabels.stopped} | ${M.stopReasonLabels[s.reason]}`;
}

export function StatusTag({ status, reason = true }: { status: PromotionStatus; reason?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {status.state === "live" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft py-0.5 pl-1.5 pr-2 text-[11.5px] font-semibold leading-none text-ok ring-1 ring-inset ring-[var(--ok-line)]">
          <span aria-hidden className="size-1.5 rounded-full bg-ok shadow-[0_0_0_2px_var(--ok-line)]" />
          {M.statusLabels.live}
        </span>
      ) : (
        <Tag tone="neutral">{M.statusLabels.stopped}</Tag>
      )}
      {reason && status.state === "stopped" && <span className="text-[12px] text-dim">{M.stopReasonLabels[status.reason]}</span>}
    </span>
  );
}
