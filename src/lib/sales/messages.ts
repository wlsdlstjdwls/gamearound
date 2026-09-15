// 세일 일정 화면 문구. 전부 "예상" 이라는 사실이 문구에서 먼저 드러나야 한다 —
// 밸브가 공지하지 않는 값을 확정처럼 적으면 사용자가 그 날짜를 믿고 구매를 미룬다.
export const SALES_MESSAGES = {
  title: "다음 세일",
  note: "예상 일정이에요",
  lead: "스팀 정기 세일이 언제 열리는지 알려드려요. 지금 살지 기다릴지 정할 때 보세요.",
  running: "지금 진행 중이에요",
  untilStart: "시작까지",
  untilEnd: "종료까지",
  estimated: "예상",
  basis: "밸브는 세일 날짜를 미리 공지하지 않아요. 최근 회차가 열린 자리를 근거로 계산한 예상이라 하루 이틀 어긋날 수 있어요.",
  inactiveHead: "지금은 열리지 않는 세일",
  browseGames: "할인 중인 게임 보기",
} as const;

/** 카운트다운 칸 이름. 순서가 곧 표시 순서다 */
export const COUNTDOWN_UNITS = [
  { key: "days", label: "일" },
  { key: "hours", label: "시간" },
  { key: "minutes", label: "분" },
  { key: "seconds", label: "초" },
] as const;
