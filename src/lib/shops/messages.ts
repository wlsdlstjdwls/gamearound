// 매장 축의 사용자 문구 한 곳 — 설계서 §11. 화면과 검증이 같은 문장을 본다(AGENTS §2).
// 문체는 "-해요" 로 맞춘다(AGENTS §6).

/** 입점 랜딩(/business) — 매장을 데려오는 화면이라 "무엇이 되는가" 부터 말한다 */
export const BUSINESS_MESSAGES = {
  title: "게임 매장을 손님에게 알려요",
  lead: "동네 게임 매장, 중고 게임 판매처를 찾는 사람에게 우리 매장을 보여줘요. 입점은 무료예요.",
  ctaJoin: "입점 신청하기",
  ctaStatus: "신청 상태 보기",
  points: [
    {
      title: "찾는 사람에게 보여요",
      body: "게임 상세 화면의 '파는 곳' 과 매장 찾기에 매장이 함께 서요. 가격 비교를 보러 온 사람이 곧 살 사람이에요.",
    },
    {
      title: "재고는 매장이 정해요",
      body: "무엇을 얼마에 파는지, 지금 몇 개 있는지 매장이 직접 적어요. 우리가 임의로 고치지 않아요.",
    },
    {
      title: "직원 계정을 따로 둬요",
      body: "매장 계정을 나눠 쓰지 않아요. 직원마다 계정이 있고, 누가 무엇을 고쳤는지 기록이 남아요.",
    },
  ],
  /** 수수료와 결제는 A(안내) 단계에 없다. 없는 것을 있는 것처럼 적지 않는다(설계서 §12) */
  feeTitle: "지금은 결제도 수수료도 없어요",
  feeBody: "손님이 매장 정보를 보고 직접 찾아가거나 연락해요. 예약과 결제는 매장이 원할 때 뒤에 붙일 계획이에요.",
  stepsTitle: "입점은 이렇게 해요",
  steps: [
    "가입하고 입점 신청서를 적어요.",
    "우리가 사업자 정보를 확인해요. 보통 1~2일 걸려요.",
    "승인되면 매장 페이지가 열리고 판매 목록을 올릴 수 있어요.",
  ],
} as const;

/** 신청 폼, 상태 화면, 검증이 함께 쓰는 문구 */
export const SHOP_MESSAGES = {
  joinTitle: "입점 신청",
  joinLead: "심사에 필요한 것만 물어요. 승인 뒤에 매장 소개와 영업시간을 채울 수 있어요.",
  statusTitle: "신청 상태",

  shopTypeLabel: "매장 갈래",
  shopTypeBusiness: "사업자 매장",
  shopTypePersonal: "개인 판매자",
  /** 개인 판매자는 중고거래를 켜는 날 열린다(설계서 §3). 막는 이유를 화면에서 읽히게 한다 */
  shopTypePersonalClosed: "개인 판매자 입점은 아직 열지 않았어요.",
  nameLabel: "매장 이름",
  slugLabel: "매장 주소",
  slugHint: "영문 소문자, 숫자, 붙임표만 써요. 승인 뒤에는 바꾸기 어려워요.",
  bizRegNoLabel: "사업자등록번호",
  addressTypeLabel: "매장 형태",
  addressTypeOffline: "오프라인 매장",
  addressTypeOnlineOnly: "온라인만",
  addressTypeNone: "매장 없음",
  addressLabel: "주소",
  addressDetailLabel: "상세 주소",
  phoneLabel: "연락처",
  descriptionLabel: "매장 소개",
  submit: "신청서 내기",

  nameTooShort: "매장 이름은 두 글자 이상이어요.",
  nameTooLong: "매장 이름이 너무 길어요.",
  slugTooShort: "매장 주소는 세 글자 이상이어요.",
  slugTooLong: "매장 주소가 너무 길어요.",
  slugCharset: "매장 주소는 영문 소문자, 숫자, 붙임표만 쓸 수 있어요.",
  slugReserved: "이 주소는 쓸 수 없어요. 다른 주소를 적어 주세요.",
  slugTaken: "이미 쓰고 있는 주소예요. 다른 주소를 적어 주세요.",
  bizRegNoInvalid: "사업자등록번호는 숫자 10자리예요.",
  addressRequired: "오프라인 매장은 주소가 있어야 해요.",
  phoneInvalid: "연락처를 다시 확인해 주세요.",
  descriptionTooLong: "매장 소개가 너무 길어요.",
  reasonRequired: "사유를 적어 주세요. 매장주 화면에 그대로 보여요.",
  badRequest: "잘못된 요청이에요.",

  /** 한 사람이 매장을 여럿 내는 길은 아직 없다. 막는 이유를 그 자리에서 말한다 */
  alreadyApplied: "이미 낸 신청서가 있어요. 상태를 확인해 주세요.",
  applied: "신청서를 냈어요. 심사 결과를 알려 드릴게요.",

  statusPending: "심사 중이에요",
  statusPendingNote: "사업자 정보를 확인하고 있어요. 보통 1~2일 걸려요.",
  statusActive: "승인됐어요",
  statusActiveNote: "매장 페이지가 열렸어요. 판매 목록을 올릴 수 있어요.",
  statusSuspended: "멈춰 있어요",
  reasonLabel: "사유",
  reapply: "신청서 고쳐서 다시 내기",
  viewMyShop: "내 매장 페이지 보기",
  noApplication: "아직 낸 신청서가 없어요.",
} as const;

/**
 * 매장 찾기(/shops)와 매장 페이지(/shops/[slug]).
 *
 * 설계서 §11 은 매장 찾기를 "거리순" 으로 그렸다. 지금은 못 한다 — 입점 신청서가 주소를 글로만 받고
 * 좌표(shops.lat, lng)를 채우는 자리가 아직 없다. 지오코딩을 붙이기 전까지는 이름순으로 세우고,
 * 찾는 일은 검색어(이름, 주소)가 맡는다. 거리순인 척하는 정렬을 먼저 만들지 않는다.
 */
export const SHOP_DIRECTORY_MESSAGES = {
  title: "매장 찾기",
  lead: "입점한 게임 매장이에요. 파는 물건은 매장이 직접 올려요.",
  searchLabel: "매장 이름이나 주소로 찾기",
  searchPlaceholder: "매장 이름, 주소",
  searchSubmit: "찾기",
  countSuffix: "곳",
  empty: "찾는 조건에 맞는 매장이 없어요.",
  emptyAll: "아직 입점한 매장이 없어요.",
  emptyAction: "입점 안내 보기",
  onlineOnly: "온라인만 팔아요",
  noAddress: "매장 주소가 없어요",
  phoneLabel: "연락처",
  hoursLabel: "영업시간",
  aboutLabel: "매장 소개",
  /** 판매 목록은 2단계(상품, 재고) 몫이다. 빈 자리를 감추지 않고 언제 채워지는지 말한다 */
  listingsTitle: "파는 물건",
  listingsEmpty: "아직 올라온 물건이 없어요.",
  backToDirectory: "매장 찾기로",
  suspendedNotice: "지금은 쉬고 있는 매장이에요.",
} as const;

/** 관리자 심사 화면(/shops/admin) */
export const SHOP_ADMIN_MESSAGES = {
  // 관리자 메뉴(ADMIN_NAV.shops)와 **같은 말**이어야 한다 — 메뉴에서 본 이름과
  // 들어간 화면 제목이 다르면 같은 곳인지 의심하게 된다.
  title: "입점 신청",
  lead: "매장이 낸 신청서를 확인하고 승인하거나 반려해요. 반려와 정지에는 사유를 적어요. 사유는 매장주에게 그대로 보여요.",
  pendingTab: "심사 대기",
  activeTab: "운영 중",
  suspendedTab: "정지",
  empty: "여기에 해당하는 매장이 없어요.",
  approve: "승인",
  reject: "반려",
  suspend: "정지",
  reactivate: "정지 풀기",
  reasonPlaceholder: "사유 (매장주에게 그대로 보여요)",
  approved: "승인했어요.",
  rejected: "반려했어요.",
  suspended: "정지했어요.",
  reactivated: "정지를 풀었어요.",
  ownerLabel: "대표 계정",
  appliedAtLabel: "신청",
} as const;
