// 광고, 멤버십 요금 안내 화면(/indie/mine/plans) 문구. 2026-10-28.
// 값은 문구에 박지 않는다 — 상품 표(lib/payments/products, lib/membership/plan)에서 읽어 함수 인자로 받는다.
// 쓰지 않는 말: "가장 많이 골라요"(판매량 근거 없음), "오늘만", "곧 마감"(마감이 없다). 표시광고법상 근거 없는 인기, 희소성 표시가 된다.

export const PLANS_MESSAGES = {
  title: "광고, 멤버십",
  lead: "내 게임을 더 많은 사람에게 보여 주는 방법이에요. 결제하면 바로 시작돼요.",
  toAds: "광고 성과",
  toHistory: "결제 내역",

  membershipName: "메이커 멤버십",
  membershipTag: "모든 혜택",
  perMonth: "매달",
  perDayApprox: (price: string) => `하루 약 ${price}`,
  credits: (n: number, value: string) => `광고 이용권 ${n}장(따로 사면 ${value})`,
  memberOnly: "멤버 전용",
  memberPerks: ["내 게임 통계 자세히", "이름 옆 메이커 꼬리표", "플레이테스트 모집 맨 위 고정"],
  membershipNow: "시작하는 순간 이용권이 바로 채워져요",
  membershipStart: "멤버십 시작하기",
  membershipActive: "이용 중",
  membershipCredits: (n: number) => `남은 이용권 ${n}장`,
  membershipManage: "내 멤버십 보기",

  bundleName: "광고 묶음 7일",
  bundleTag: "추천",
  bundleWhat: "인디 목록 맨 위와 게시판 홍보 글 고정을 함께",
  rate: (n: number) => `${n}% 할인`,
  saving: (amount: string) => `${amount} 아껴요`,
  bundleNow: "결제하면 바로 노출이 시작돼요",

  singleName: "낱개 7일",
  singleWhat: "인디 게임 부스트 또는 홍보 글 고정 하나",
  singleHint: (amount: string) => `둘 다 걸면 묶음이 ${amount} 싸요`,
  pick: "어디에 걸지 고르기",

  pickTitle: "어디에 걸까요",
  pickLead: "광고를 걸 글을 고르면 결제 화면에서 묶음으로 바꿀 수 있어요.",
  creditsLeft: (n: number) => `멤버십 이용권이 ${n}장 남았어요. 결제 화면에서 이용권으로 걸 수 있어요`,
  indieGroup: "내 인디 게임",
  promoGroup: "내 홍보 글",
  boost: "광고 걸기",
  pin: "고정하기",
  noIndie: "공개 중인 인디 게임이 없어요",
  noIndieAction: "게임 등록하기",
  noPromo: "공개 중인 홍보 글이 없어요",
  noPromoAction: "홍보 글 쓰기",
} as const;
