// 광고, 멤버십 요금 안내 화면(/indie/mine/plans) 문구. 2026-10-28.
// 값은 문구에 박지 않는다 — 상품 표(lib/payments/products, lib/membership/plan)에서 읽어 함수 인자로 받는다.
// 쓰지 않는 말: "가장 많이 골라요"(판매량 근거 없음), "오늘만", "곧 마감"(마감이 없다). 표시광고법상 근거 없는 인기, 희소성 표시가 된다.
//
// 같은 날 둘째 요청(사용자: "요금제가 정확히 뭘 하는 건지 보기 어렵다"): 카드마다 한 줄 정의(summary)를 값 위에 두고,
// 줄마다 "이름: 무엇이 어디에" 로 적는다. 자리 설명은 아래 "광고는 어디에 보이나요" 판(SPOTS)이 그림과 함께 맡는다.

export const PLANS_MESSAGES = {
  title: "광고, 멤버십",
  lead: "내 게임을 더 많은 사람에게 보여 주는 방법이에요. 결제하면 바로 시작돼요.",
  toAds: "광고 성과",
  toHistory: "결제 내역",

  // 카드 순서는 싼 것부터(10-28 셋째 요청). 윗단은 아랫단의 모든 것에 무엇이 더해지는지를 "+" 줄로 말한다.
  // 이름(10-28 넷째 요청 "이쁘게, 통일성 있게"): 손전등 빛의 세기로 잇는다 — 스파크(한 번 반짝) → 스포트라이트(두 자리를 비춤) → 메이커(만드는 사람의 구독).
  // 메이커는 멤버 꼬리표 이름(membership/maker-badge)과 같아야 해서 빛 낱말로 바꾸지 않았다. 이름 위 작은 줄(eyebrow)이 기간과 크기를 같은 꼴로 말한다
  singleName: "스파크",
  singleEyebrow: "7일 | 광고 자리 하나",
  singleSummary: "필요할 때 한 번 반짝",
  singleIncludes: ["인디 게임 부스트나 홍보 글 고정 중 하나", "결제하면 바로 시작, 7일 뒤 끝나요"],
  singleCta: "스파크 걸기",

  bundleName: "스포트라이트",
  bundleEyebrow: "7일 | 광고 자리 둘",
  bundleTag: "추천",
  bundleSummary: "게임과 홍보 글을 함께 비춰요",
  bundleBase: "스파크에 더해",
  bundleAdds: (saving: string) => ["인디 게임 부스트와 홍보 글 고정을 둘 다", `따로 사는 것보다 ${saving} 할인`],
  bundleCta: "스포트라이트 걸기",

  membershipName: "메이커",
  membershipEyebrow: "매달 | 구독",
  membershipTag: "모든 혜택",
  membershipSummary: "스포트라이트를 매달, 멤버 전용 혜택까지",
  membershipBase: "스포트라이트에 더해",
  /** 이용권 줄. 한 장이 자리 하나 7일이라 두 장이면 스포트라이트와 같은 광고다 */
  membershipCreditsAdd: (n: number) => `매달 광고 이용권 ${n}장이 채워져요(스포트라이트를 매달)`,
  memberPerks: [
    "통계 자세히: 게임별 30일 그래프와 어디서 들어왔는지",
    "메이커 꼬리표: 게시판 글과 인디 게임 이름 옆에 보라색 표시",
    "플레이테스트 고정: 모집 글을 플레이테스트 모아 보기 맨 위에",
  ],
  perMonth: "매달",
  perDayApprox: (price: string) => `하루 약 ${price}`,
  credits: (n: number, value: string) => `광고 이용권 ${n}장(따로 사면 ${value})`,
  membershipNow: "시작하는 순간 이용권이 바로 채워져요",
  membershipStart: "메이커 시작하기",
  membershipActive: "이용 중",
  membershipCredits: (n: number) => `남은 이용권 ${n}장`,
  membershipManage: "내 멤버십 보기",

  rate: (n: number) => `${n}% 할인`,
  saving: (amount: string) => `${amount} 아껴요`,
  adNow: "결제하면 바로 노출이 시작돼요",
  singleHint: (amount: string) => `둘 다 걸 거면 스포트라이트가 ${amount} 싸요`,

  boostName: "인디 게임 부스트",
  pinName: "홍보 글 고정",

  spotsEyebrow: "광고 자리",
  spotsTitle: "걸면 여기서 먼저 보여요",
  spotsLead: "게임을 찾는 사람이 가장 먼저 지나가는 네 자리예요. 결제하면 바로 걸리고 7일 뒤 끝나요. 자동으로 다시 결제되지 않아요.",
  spotsRules: ["광고 자리에는 \"광고\" 표시가 붙어요", "광고가 자리보다 많으면 한 시간마다 돌아가며 보여요", "명예의 전당, 슈퍼루키 순위와는 상관없어요"],
  spotAd: "광고",

  // 다른 화면에서 이 화면으로 이끄는 한 줄 판(components/payments/plan-nudge). 10-28 사용자: "메뉴로 따로 두기보다 다른 화면에서 자연스럽게"
  nudgeTitle: "내 게임을 더 많은 사람에게 보여 줄까요",
  nudgeLead: (price: string) => `스파크 ${price}부터. 결제하면 바로 인디 목록 맨 위에 떠요`,
  nudgeCta: "광고 알아보기",
  nudgeBoost: "광고 걸기",

  /** 걸 글이 여럿일 때 카드 단추가 여는 시트 */
  pickTitle: "어디에 걸까요",
  indieGroup: "내 인디 게임",
  promoGroup: "내 홍보 글",
  /** 걸 글이 하나도 없을 때 카드 단추 대신 */
  noTarget: "광고를 걸 공개 글이 아직 없어요",
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
