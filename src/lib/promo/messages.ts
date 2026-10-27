// 유료 노출 자리 문구(2026-10-27). 공개 화면의 "광고" 표시와 관리자 화면 /admin/promotions.
import type { PromoSlot } from "@/server/db/schema";
import type { BoostState } from "./boost";

export const PROMO_MESSAGES = {
  /** 유료 자리 카드, 줄에 붙는 표시(기획서 4.1, 표시광고법: 돈을 받은 노출은 알아볼 수 있게) */
  ad: "광고",
  featuredTitle: "주목할 게임",

  adminTitle: "유료 노출",
  adminLead: "인디 목록 맨 위와 홍보 게시판 위에 거는 유료 자리예요. 결제가 붙기 전에는 여기서 직접 걸어 효과를 재요. 숨기거나 반려한 글은 걸려 있어도 보이지 않아요.",
  grantTitle: "새로 걸기",
  slot: "자리",
  target: "대상",
  targetPlaceholder: "글을 골라 주세요",
  noCandidates: "걸 수 있는 공개 글이 없어요",
  days: "기간",
  daysOption: (n: number) => `${n}일`,
  note: "메모",
  notePlaceholder: "시범 대상, 협의 내용 등",
  grant: "걸기",
  granted: "걸었어요",
  revoke: "회수",
  revoked: "회수했어요",
  listTitle: "걸린 자리",
  empty: "아직 걸린 자리가 없어요",
  period: (from: string, to: string) => `${from} ~ ${to}`,
  notLive: "대상이 공개 상태가 아니라 보이지 않아요",
  capacity: (live: number, cap: number) => `지금 ${live}개 노출 중, 한 번에 ${cap}칸`,
  targetGone: "지워진 글",
  targetNotPublic: "공개 중인 글에만 걸 수 있어요",
  failed: "처리하지 못했어요",
} as const;

export const PROMO_SLOT_LABEL: Record<PromoSlot, string> = {
  indie_top: "인디 목록 맨 위",
  promo_pin: "홍보 게시판 위 고정",
};

export const BOOST_STATE_LABEL: Record<BoostState, string> = {
  active: "노출 중",
  queued: "대기",
  ended: "끝남",
  revoked: "회수함",
};
