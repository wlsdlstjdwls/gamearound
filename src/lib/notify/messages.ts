// 알림이 회원, 관리자에게 실어 보내는 고정 글(2026-11-02). 템플릿 문구가 아니라 발송 틀이 붙이는 글이다.
export const NOTIFY_CONTENT_MESSAGES = {
  /** 메일 속 영상 자리. 메일은 영상을 재생하지 못해 첫 장면 그림 아래 이 링크를 단다(lib/notify/media) */
  emailVideoLink: "영상 보기",
  /** 메일 텍스트판의 영상 줄 머리 */
  plainVideo: "영상",
  /** 메일 텍스트판의 이미지 자리 */
  plainImage: "이미지",
  /** 메일 첫 장면 그림의 대체 글 */
  videoPosterAlt: "영상 첫 장면",
  /** 메일 바닥 한 줄(lib/notify/email-shell). 답장이 어디에도 닿지 않는다는 것만 말한다 */
  emailFooterNote: "이 메일은 보내기 전용이라 답장을 받을 수 없어요.",
} as const;
