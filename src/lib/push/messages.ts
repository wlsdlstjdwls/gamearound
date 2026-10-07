// 웹푸시 구독 문구 단일 원천(규약 §2). 설정의 토글과 온보딩 알림 단계가 같은 말을 쓴다 —
// 같은 브라우저 상태(지원 안 함, 차단, 켜짐)를 두 화면이 다른 말로 부르면 사람이 둘을 다른 일로 읽는다.
export const PUSH_MESSAGES = {
  status: {
    checking: "상태를 확인하고 있어요",
    unsupported: "이 브라우저는 웹푸시를 지원하지 않아요.",
    denied: "브라우저에서 알림이 차단돼 있어요. 사이트 설정에서 허용한 뒤 다시 눌러 주세요.",
    subscribed: "이 기기에서 할인 알림을 받고 있어요.",
    unsubscribed: "조건을 만족한 게임만 한 번 보내 드려요.",
  },
  error: {
    noVapid: "서버에 알림 공개키가 설정돼 있지 않아요",
    permission: "알림 권한을 허용하지 않았어요",
    save: (status: number) => `구독을 저장하지 못했어요 (${status})`,
    subscribe: "알림을 켜지 못했어요",
    unsubscribe: "알림을 끄지 못했어요",
  },
  /** iOS Safari 는 홈 화면에 설치한 앱에서만 웹푸시를 받는다(2026-09 기준 애플 정책) */
  iosHint: "iOS Safari 는 공유 메뉴의 “홈 화면에 추가”로 설치한 뒤, 홈 화면 아이콘으로 열었을 때만 알림을 받을 수 있어요.",
} as const;
