// 관리자 동작 문구. 버튼 낱말과 그 동작이 끝났을 때 뜨는 말을 **나란히** 둔다 —
// "거절" 을 눌렀는데 "무르기 완료" 가 뜨면 같은 동작인지 알 수 없다.
//
// 낱말을 세 번째로 고쳤다(2026-09-21). "승인 / 거절" → "잇기 / 무르기" → **"맞아요 / 아니에요"**.
// 앞 두 벌이 실패한 이유는 같다 — 둘 다 **시스템이 하는 일**(레코드를 잇는다, 물린다)을 적었다.
// 이 큐에서 사람이 하는 일은 그게 아니라 "이 둘이 같은 것인가" 라는 질문에 답하는 것 하나다.
// 그래서 버튼은 그 질문의 답을 그대로 적는다. 뒤에서 무엇이 일어나는지는 화면 첫 줄(lead)이 말한다.
export const ADMIN_ACTION_MESSAGES = {
  link: "맞아요",
  unlink: "아니에요",
  /** 아니라고 하면 후보 이음이 지워진다. 스무 줄을 훑는 화면이라 확인은 이 자리만 묻는다 */
  unlinkConfirm: "다른 것으로 볼까요? 이어 둔 것이 지워져요.",
  linked: "이었어요",
  unlinked: "이어 두지 않았어요",
  manualRefSaved: "스토어 번호를 손으로 이었어요",
  corrected: (before: string | null) => `고쳤어요 (고치기 전 값: ${before ?? "없음"})`,
  upgradeAdded: "업그레이드를 넣었어요",
  upgradeUpdated: "업그레이드를 고쳤어요",
  upgradeRemoved: "업그레이드를 뺐어요",
  aliasAdded: (alias: string) => `다른 이름 "${alias}" 을 넣었어요`,
  aliasExists: "이미 있는 이름이에요",
  aliasRemoved: "다른 이름을 뺐어요",
  productLinked: "상품에 게임을 이었어요",
  productUnlinked: "이어 두지 않았어요",
  failed: "하지 못했어요",
  invalid: "잘못된 요청이에요",
  invalidInput: "입력값이 올바르지 않아요",
  invalidName: "이름이 올바르지 않아요",
  invalidUrl: "주소 형식이 올바르지 않아요",
  invalidField: "고칠 수 없는 칸이에요",
  externalIdRequired: "스토어 안 번호를 넣어 주세요",
} as const;
