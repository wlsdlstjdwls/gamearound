// 내 게임 알리기 요금 안내 화면(/indie/mine/plans) 고정 문구. 2026-10-28.
// 카드 이름, 한 줄 정의, 혜택 줄, 단추 글, 멤버십 혜택은 관리자가 바꾸는 요금 설정(lib/pricing/settings 의 copy)으로 옮겼다
// (같은 날 사용자: "구독 멤버십도 문구부터 모든 설정을 관리자가"). 여기 남은 것은 값을 꾸미는 말과 화면 뼈대 글이다.
// 쓰지 않는 말: "가장 많이 골라요"(판매량 근거 없음), "오늘만", "곧 마감"(마감이 없다). 표시광고법상 근거 없는 인기, 희소성 표시가 된다.

export const PLANS_MESSAGES = {
  title: "내 게임 알리기",
  lead: "내 게임을 더 많은 사람에게 보여 주는 방법이에요. 결제하면 바로 시작돼요.",
  toAds: "노출 성과",
  toHistory: "결제 내역",

  membershipActive: "이용 중",
  membershipCredits: (n: number) => `남은 이용권 ${n}장`,
  membershipManage: "내 메이커 멤버십 보기",

  perMonth: "매달",
  firstMonth: "첫 달",
  from: "부터",
  perDayApprox: (price: string) => `하루 약 ${price}`,
  /** 첫 달 할인일 때 큰 값 아래 — 다음 달부터 낼 값을 숨기지 않는다 */
  thenMonthly: (price: string) => `다음 달부터 매달 ${price}`,
  rate: (n: number) => `${n}% 할인`,
  saving: (amount: string) => `${amount} 아껴요`,
  notOnSale: "지금은 판매하지 않아요",

  spotsEyebrow: "보이는 자리",
  spotsTitle: "걸면 여기서 먼저 보여요",
  spotsLead: "게임을 찾는 사람이 가장 먼저 지나가는 네 자리예요. 결제하면 바로 걸리고 7일 뒤 끝나요. 자동으로 다시 결제되지 않아요.",
  spotsRules: ["이 자리에는 법에 따라 \"광고\" 표시가 붙어요", "신청이 자리보다 많으면 한 시간마다 돌아가며 보여요", "명예의 전당, 슈퍼루키 순위와는 상관없어요"],
  spotAd: "광고",

  // 다른 화면에서 이 화면으로 이끄는 한 줄 판(components/payments/plan-nudge). 10-28 사용자: "메뉴로 따로 두기보다 다른 화면에서 자연스럽게"
  nudgeTitle: "내 게임을 더 많은 사람에게 보여 줄까요",
  /** 값은 말하지 않는다 — 들르는 자리에서 값부터 들이밀면 장사 판으로 읽힌다(10-28 사용자: "문구도 금액도 별로"). 값은 요금 화면에서 견준다 */
  nudgeLead: "게임을 찾으러 온 사람이 가장 먼저 지나가는 자리에 7일 동안 올려 둘 수 있어요",
  nudgeCta: "알리는 방법 보기",
  nudgeBoost: "더 알리기",

  /** 걸 글이 여럿일 때 카드 단추가 여는 시트 */
  pickTitle: "어디에 걸까요",
  indieGroup: "내 인디 게임",
  promoGroup: "내 홍보 글",
  /** 걸 글이 하나도 없을 때 카드 단추 대신 */
  noTarget: "알릴 공개 글이 아직 없어요",
  noIndieAction: "게임 등록하기",
  bundleNeedsPromo: "묶음은 홍보 글도 있어야 해요. 결제 화면에서 낱개로 걸 수 있어요",
} as const;

/**
 * "걸면 여기서 먼저 보여요" 판의 자리 넷. 화면 이름은 메뉴(lib/nav)의 낱말과 같게 둔다.
 * why 는 그 자리에 오는 사람이 누구인지만 말한다 — 몇 명이 본다는 숫자는 근거(노출 집계)가 쌓이기 전까지 적지 않는다.
 * shape 는 작은 화면 그림의 꼴(components/payments/plan-spots)
 */
export const PLAN_SPOTS = [
  { key: "indie-top", product: "인디 게임 부스트", name: "인디 게임 목록 맨 위", why: "인디 게임을 찾으러 온 사람이 가장 먼저 보는 \"주목할 게임\" 칸이에요", shape: "list" },
  { key: "home-row", product: "인디 게임 부스트", name: "홈 화면 인디 줄 첫 칸", why: "사이트에 들어온 사람이 홈을 내리다 처음 만나는 인디 게임이에요", shape: "row" },
  { key: "detail", product: "인디 게임 부스트", name: "같은 장르 게임 상세", why: "비슷한 게임을 보던, 이미 관심 있는 사람에게 \"이런 인디 게임은 어때요\" 로 떠요", shape: "detail" },
  { key: "promo-pin", product: "홍보 글 고정", name: "게시판 홍보 목록 맨 위", why: "새 글이 올라와도 밀려 내려가지 않아요", shape: "list" },
] as const;

export type PlanSpotShape = (typeof PLAN_SPOTS)[number]["shape"];
