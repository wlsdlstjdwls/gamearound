// 상품, 재고 축의 사용자 문구 — 설계서 §4, §11. 문체는 "-해요"(AGENTS §6).
//
// 매장 축 문구(messages.ts)와 파일을 가른 이유: 저쪽은 입점과 심사고 이쪽은 파는 물건이다.
// 한 파일에 두면 곧 300줄을 넘고, 고칠 때 엉뚱한 화면의 문장을 읽게 된다.

/** 매장주 콘솔(/vendor) */
export const VENDOR_MESSAGES = {
  title: "내 매장",
  lead: "내가 속한 매장이에요.",
  noShop: "아직 속한 매장이 없어요. 입점 신청부터 해 주세요.",
  noShopAction: "입점 안내 보기",
  pendingNote: "심사가 끝나면 판매 목록을 올릴 수 있어요.",
  roleOwner: "대표",
  roleManager: "매니저",
  roleStaff: "직원",
  openListings: "판매 목록",
  openPublic: "매장 페이지 보기",
} as const;

/** 판매 목록 화면(/vendor/[shopSlug]/listings) */
export const LISTING_MESSAGES = {
  title: "판매 목록",
  lead: "무엇을 얼마에 몇 개 파는지 적어요. 적은 그대로 매장 페이지와 게임 화면에 보여요.",
  empty: "아직 올린 물건이 없어요. 아래에서 하나 추가해 보세요.",

  addTitle: "물건 추가",
  productNameLabel: "상품 이름",
  productNameHint: "손님이 보는 이름이에요. 에디션과 기종까지 적으면 찾기 쉬워요.",
  barcodeLabel: "바코드",
  barcodeHint: "있으면 적어요. 바코드가 같으면 다른 매장과 같은 상품으로 묶여요.",
  hardwareLabel: "기종",
  hardwareNone: "고르지 않음",
  conditionLabel: "상태",
  conditionSealed: "미개봉",
  conditionNew: "새 제품",
  conditionUsed: "중고",
  priceLabel: "판매가",
  priceHint: "원 단위로 적어요.",
  onHandLabel: "수량",
  statusLabel: "공개",
  statusDraft: "작성 중",
  statusSelling: "판매 중",
  statusSoldout: "품절",
  statusHidden: "숨김",
  submit: "추가하기",

  stockLabel: "수량",
  stockSave: "저장",
  saved: "저장했어요.",
  added: "물건을 추가했어요.",
  removed: "내렸어요.",
  remove: "내리기",

  nameRequired: "상품 이름을 적어 주세요.",
  nameTooLong: "상품 이름이 너무 길어요.",
  barcodeInvalid: "바코드는 숫자 8~14자리예요.",
  priceInvalid: "판매가를 다시 확인해 주세요.",
  stockInvalid: "수량을 다시 확인해 주세요.",
  duplicate: "같은 상품, 같은 상태로 이미 올린 물건이 있어요.",
  badRequest: "잘못된 요청이에요.",
  notFound: "그 물건을 찾을 수 없어요.",

  /** 재고 표시. `available = onHand - held` 를 거쳐 낸다(설계서 §12.1) */
  availableSuffix: "개 있어요",
  soldout: "품절이에요",
} as const;

/** 게임 상세의 "파는 곳", 매장 페이지의 "파는 물건" */
export const SELLING_MESSAGES = {
  title: "파는 곳",
  lead: "이 게임을 실물로 파는 매장이에요.",
  empty: "아직 이 게임을 파는 매장이 없어요.",
  shopListingsTitle: "파는 물건",
  shopListingsEmpty: "아직 올라온 물건이 없어요.",
  more: "매장 페이지 보기",
} as const;
