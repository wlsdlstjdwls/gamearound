// 확인 팝업(ui/confirm-dialog 의 askConfirm)의 공통 낱말. 묻는 말은 부르는 쪽이 준다.
export const CONFIRM_MESSAGES = {
  ok: "확인",
  cancel: "취소",
  delete: "삭제",
  /** 묻는 말을 부르는 쪽이 제목으로 따로 주지 않았을 때의 제목. 지우기, 반려처럼 되돌리기 어려운 일과 그 밖의 확인을 가른다 */
  title: { danger: "한 번 더 확인해 주세요", primary: "진행할까요?" },
} as const;
