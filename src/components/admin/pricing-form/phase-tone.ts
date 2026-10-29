// 할인 행사 단계 꼬리표 색 — 프로모션등록 그리드, 상세와 구독상품 화면의 행사 줄이 같이 쓴다.
// 두 곳이 따로 정해 같은 "진행 중" 이 화면마다 다른 색이었다.
// 진행 중만 채운 색이다 — 단계 넷 가운데 지금 손님에게 걸리는 것은 그 하나라 줄을 훑을 때 먼저 걸려야 한다(2026-10-30 사용자 "진행 중 뱃지 색상 다르게").
import type { TagTone } from "@/components/ui/tag";
import type { PromotionPhase } from "@/lib/pricing/quote";

export const PHASE_TONE: Record<PromotionPhase, TagTone> = { off: "neutral", upcoming: "info", live: "okSolid", ended: "outline" };
