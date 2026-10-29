// 프로모션 진행상태 글 — 프로모션등록 그리드와 상품등록 화면의 걸린 프로모션 줄이 같이 쓴다.
// 진행상태는 진행 중, 중단 둘이다(2026-10-30 사용자). 딱지(배지)는 걷었다 — 채운 색, 알약 모두 거슬린다고 해 글자만 둔다(사용자 "진행 중 뱃지 그냥 없애라").
// 중단 사유(운영 중단, 가격변동 중단, 시작 전, 기간 종료)는 옆에 흐린 글로 붙인다.
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import type { PromotionStatus } from "@/lib/pricing/quote";

/** 그리드 정렬, 엑셀에 쓰는 글 */
export function statusText(s: PromotionStatus): string {
  return s.state === "live" ? M.statusLabels.live : `${M.statusLabels.stopped} | ${M.stopReasonLabels[s.reason]}`;
}

export function StatusTag({ status, reason = true }: { status: PromotionStatus; reason?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]">
      <span className={status.state === "live" ? "text-ink" : "text-dim"}>{M.statusLabels[status.state]}</span>
      {reason && status.state === "stopped" && <span className="text-[12px] text-dim">{M.stopReasonLabels[status.reason]}</span>}
    </span>
  );
}
