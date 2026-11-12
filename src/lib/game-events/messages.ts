// 게임 이벤트, 소식 카드 문구 단일 원천(규약 §2).
export const GAME_EVENTS_MESSAGES = {
  title: "이벤트, 소식",
  lead: "공식 페이지의 제목과 소개를 그대로 옮겼어요. 자세한 내용은 원문에서 확인해요",
  kind: { event: "이벤트", demo: "체험판", update: "무료 업데이트", page: "공식 소개 페이지" },
  source: { nintendo_kr: "한국닌텐도", steam: "Steam" } as Record<string, string>,
  period: (from: string, to: string) => `${from} ~ ${to}`,
  until: (to: string) => `${to}까지`,
  posted: (date: string) => `${date} 게시`,
  newTab: "(새 창에서 열림)",
} as const;
