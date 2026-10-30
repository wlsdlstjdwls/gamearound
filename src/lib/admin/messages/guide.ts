// 서비스안내서조회(/admin/guide) 문구.
export const GUIDE_MESSAGES = {
  frameTitle: "서비스 변경 안내서",
  uploadedAt: (at: string) => `${at} 등록`,
  empty: "아직 등록된 안내서가 없어요.",
  /** 비었을 때 다음 할 일. 문서는 개발부가 만들어 올린다 */
  emptyHint: "개발부가 안내서를 올리면 여기에 보여요.",
  openNew: "새 창에서 열기",
  newWindow: "(새 창에서 열림)",
  reloaded: "안내서를 다시 불러왔어요.",
} as const;
