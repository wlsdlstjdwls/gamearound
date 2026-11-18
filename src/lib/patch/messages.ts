// 패치 노트 본문(상세 화면 업데이트 노트) 문구. 본문 번역은 sync/patch-translate 가 미리 쌓는다(2026-11-18 사용자 결정).
export const PATCH_BODY_MESSAGES = {
  more: "더 보기",
  less: "접기",
  /** 한글 전문을 보다가 영어 원문으로 바꾸는 단추. 누르는 즉시 바뀐다(서버를 부르지 않는다) */
  showOriginal: "원본 보기",
  showKorean: "번역 보기",
  openStore: "스토어에서 보기",
  /** 한글 전문이 아직 없어 원문을 보일 때 */
  pendingWithOriginal: "번역 준비 중이에요. 원문을 먼저 보여 드려요.",
  /** 원문도 아직 안 받아 왔을 때 */
  pending: "번역 준비 중이에요.",
} as const;
