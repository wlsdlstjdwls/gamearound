// 유료 노출 자리 문구(2026-10-27). 공개 화면의 "광고" 표시와 관리자 화면 /admin/promotions.
import type { PromoSlot, PromoSource } from "@/server/db/schema";
import type { BoostState } from "./boost";

export const PROMO_MESSAGES = {
  /** 유료 자리 카드, 줄에 붙는 표시(기획서 4.1, 표시광고법: 돈을 받은 노출은 알아볼 수 있게) */
  ad: "광고",
  featuredTitle: "주목할 게임",
  /** 홍보 게시판 위 고정 카드 묶음의 머리(2026-10-29) */
  pinnedTitle: "지금 주목받는 홍보",
  pinnedCover: (title: string) => `${title} 대표 그림`,

  adminTitle: "광고 자리",
  adminLead: "인디 목록 맨 위와 홍보 게시판 위, 돈을 받고 내주는 두 자리예요. 산 광고는 저절로 걸리고, 시범이나 보상은 여기서 직접 걸어요. 숨기거나 반려한 글은 걸려 있어도 보이지 않아요.",
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
  adminViews: (views: string, clicks: string) => `노출 ${views} | 클릭 ${clicks}`,
} as const;

/** 광고 성과 화면(/indie/mine/ads, 기획서 4.4) */
export const PROMO_PERFORMANCE_MESSAGES = {
  title: "노출 성과",
  lead: "내 글이 노출 자리에서 얼마나 보이고 눌렸는지예요. 인디 게임은 노출 전 같은 기간과 나란히 보여 드려요.",
  empty: "아직 노출한 글이 없어요",
  emptyLead: "등록현황에서 공개 중인 게임을 더 알릴 수 있어요",
  toStats: "내 게임 통계로",
  views: "노출",
  clicks: "카드 클릭",
  ctr: "클릭률",
  plays: "플레이하기 클릭",
  likes: "새 찜",
  before: (n: string) => `노출 전 ${n}`,
  queued: "시작하면 숫자가 쌓여요",
  howCounted: "노출은 카드가 화면에 절반 넘게 보인 횟수예요. 같은 사람은 하루 한 번만 세고, 내가 본 것은 세지 않아요.",
  link: "노출 성과",
} as const;

export const PROMO_SLOT_LABEL: Record<PromoSlot, string> = {
  indie_top: "인디 목록 맨 위",
  promo_pin: "홍보 게시판 위 고정",
};

/** 누가 걸었나 — 관리자 목록 줄에 선다. 결제로 건 줄을 관리자가 회수하면 환불을 따로 해야 해서 눈에 띄어야 한다 */
export const PROMO_SOURCE_LABEL: Record<PromoSource, string> = {
  admin: "관리자",
  purchase: "결제",
  membership: "메이커 멤버십",
};

export const BOOST_STATE_LABEL: Record<BoostState, string> = {
  active: "노출 중",
  queued: "대기",
  ended: "끝남",
  revoked: "회수함",
};
