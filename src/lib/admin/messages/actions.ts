// 관리자 동작 문구. 버튼 낱말과 그 동작이 끝났을 때 뜨는 말을 **나란히** 둔다 —
// "거절" 을 눌렀는데 "무르기 완료" 가 뜨면 같은 동작인지 알 수 없다.
//
// 매칭 큐와 상품 큐가 같은 일(후보를 잇거나 물린다)을 하면서 낱말이 달랐다(승인/거절 대 잇기/무르기).
// "잇기, 무르기" 로 맞췄다 — 승인은 무엇이 일어나는지 말해 주지 않고, 거절은 상대가 사람일 때 쓰는 말이다.
export const ADMIN_ACTION_MESSAGES = {
  link: "잇기",
  unlink: "무르기",
  /** 무르면 후보 이음이 지워진다. 스무 줄을 훑는 화면이라 확인은 이 자리만 묻는다 */
  unlinkConfirm: "이 후보를 무를까요? 이음이 지워져요.",
  linked: "이었어요",
  unlinked: "물렀어요",
  manualRefSaved: "스토어 번호를 손으로 이었어요",
  corrected: (before: string | null) => `고쳤어요 (고치기 전 값: ${before ?? "없음"})`,
  upgradeAdded: "업그레이드를 넣었어요",
  upgradeUpdated: "업그레이드를 고쳤어요",
  upgradeRemoved: "업그레이드를 뺐어요",
  aliasAdded: (alias: string) => `다른 이름 "${alias}" 을 넣었어요`,
  aliasExists: "이미 있는 이름이에요",
  aliasRemoved: "다른 이름을 뺐어요",
  productLinked: "상품에 게임을 이었어요",
  productUnlinked: "후보를 물렀어요",
  failed: "하지 못했어요",
  invalid: "잘못된 요청이에요",
  invalidInput: "입력값이 올바르지 않아요",
  invalidName: "이름이 올바르지 않아요",
  invalidUrl: "주소 형식이 올바르지 않아요",
  invalidField: "고칠 수 없는 칸이에요",
  externalIdRequired: "스토어 안 번호를 넣어 주세요",
} as const;
