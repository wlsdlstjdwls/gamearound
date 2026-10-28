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

  membershipName: "메이커 멤버십",
  membershipTag: "모든 혜택",
  membershipSummary: "매달 광고 2번과 멤버 전용 혜택 셋",
  perMonth: "매달",
  perDayApprox: (price: string) => `하루 약 ${price}`,
  credits: (n: number, value: string) => `광고 이용권 ${n}장(따로 사면 ${value})`,
  creditsWhat: (n: number, value: string) => `광고 이용권 ${n}장: 한 장으로 인디 게임 부스트나 홍보 글 고정을 7일 걸어요(따로 사면 ${value})`,
  memberOnly: "멤버 전용",
  memberPerks: [
    "통계 자세히: 게임별 30일 그래프와 어디서 들어왔는지",
    "메이커 꼬리표: 게시판 글과 인디 게임 이름 옆에 보라색 표시",
    "플레이테스트 고정: 모집 글을 플레이테스트 모아 보기 맨 위에",
  ],
  membershipNow: "시작하는 순간 이용권이 바로 채워져요",
  membershipStart: "멤버십 시작하기",
  membershipActive: "이용 중",
  membershipCredits: (n: number) => `남은 이용권 ${n}장`,
  membershipManage: "내 멤버십 보기",

  bundleName: "광고 묶음 7일",
  bundleTag: "추천",
  bundleSummary: "인디 게임 부스트와 홍보 글 고정을 함께",
  rate: (n: number) => `${n}% 할인`,
  saving: (amount: string) => `${amount} 아껴요`,
  bundleNow: "결제하면 바로 노출이 시작돼요",

  singleName: "낱개 7일",
  singleSummary: "둘 중 하나만 골라서",
  singleHint: (amount: string) => `둘 다 걸면 묶음이 ${amount} 싸요`,
  pick: "어디에 걸지 고르기",

  boostName: "인디 게임 부스트",
  pinName: "홍보 글 고정",
  boostShort: "인디 목록 맨 위, 홈 인디 줄 첫 칸, 같은 장르 게임 상세에 내 게임",
  pinShort: "게시판 홍보 목록 맨 위에 내 홍보 글",

  spotsTitle: "광고는 어디에 보이나요",
  spotsLead: "결제하면 바로 시작되고 7일 뒤 끝나요. 자동으로 다시 결제되지 않아요.",
  spotsRules: [
    "광고 자리에는 \"광고\" 표시가 붙어요",
    "광고가 자리보다 많으면 한 시간마다 돌아가며 보여요",
    "명예의 전당, 슈퍼루키 순위와는 상관없어요",
  ],
  spotAd: "광고",

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

/** "광고는 어디에 보이나요" 판의 자리 둘. 화면 이름은 메뉴(lib/nav)의 낱말과 같게 둔다 */
export const PLAN_SPOTS = [
  {
    key: "boost",
    name: "인디 게임 부스트",
    places: ["인디 게임 목록 맨 위 \"주목할 게임\" 칸", "홈 화면 인디 게임 줄 첫 칸", "같은 장르 게임 상세의 \"이런 인디 게임은 어때요\" 칸"],
    capacity: "한 번에 3개까지 보여요",
  },
  {
    key: "pin",
    name: "홍보 글 고정",
    places: ["게임 게시판 홍보 목록 맨 위"],
    capacity: "한 번에 2개까지 보여요",
  },
] as const;
