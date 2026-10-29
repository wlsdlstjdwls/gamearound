// 프로모션 진행상태 딱지 — 프로모션등록 그리드, 상세와 상품등록 화면의 걸린 프로모션 줄이 같이 쓴다.
// 진행상태는 진행 중, 중단 둘이다(2026-10-30 사용자). 진행 중만 채운 색이다 — 지금 손님에게 걸리는 것이 줄을 훑을 때 먼저 걸려야 한다.
// 중단 사유(운영 중단, 가격변동 중단, 시작 전, 기간 종료)는 딱지 옆 작은 글로 붙인다 — 사유마다 색을 달면 알록달록해 읽히지 않았다.
import { Tag, type TagTone } from "@/components/ui/tag";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import type { PromotionStatus } from "@/lib/pricing/quote";

const STATUS_TONE: Record<PromotionStatus["state"], TagTone> = { live: "okSolid", stopped: "neutral" };

/** 그리드 정렬, 엑셀에 쓰는 글 */
export function statusText(s: PromotionStatus): string {
  return s.state === "live" ? M.statusLabels.live : `${M.statusLabels.stopped} | ${M.stopReasonLabels[s.reason]}`;
}

export function StatusTag({ status, reason = true }: { status: PromotionStatus; reason?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Tag tone={STATUS_TONE[status.state]}>{M.statusLabels[status.state]}</Tag>
      {reason && status.state === "stopped" && <span className="text-[12px] text-dim">{M.stopReasonLabels[status.reason]}</span>}
    </span>
  );
}
