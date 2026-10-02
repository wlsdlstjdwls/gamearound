// 세일 일정 화면 문구.
// 확정과 예상을 문구에서 갈라야 한다 — 밸브가 공지한 회차는 확정이고,
// 공지가 없는 회차는 규칙으로 민 근사다. 근사를 확정처럼 적으면 사용자가 그 날짜를 믿고 구매를 미룬다.
export const SALES_MESSAGES = {
  title: "다음 세일",
  note: "밸브 공지 기준이에요",
  lead: "스팀 정기 세일이 언제 열리는지 알려드려요. 지금 살지 기다릴지 정할 때 보세요.",
  running: "진행 중",
  untilStart: "시작까지",
  untilEnd: "종료까지",
  estimated: "예상",
  confirmed: "확정",
  basis: "밸브가 반기마다 공지하는 일정을 그대로 옮겼어요. 확정 표시가 붙은 회차는 공지된 날짜예요. 예상 표시가 붙은 회차는 공지가 아직 없어 최근 회차가 열린 자리로 계산한 값이라 어긋날 수 있어요.",
  // 진행 중인 회차 위와 예정 회차 위에 붙는 꼬리표. 두 무리를 가르는 것이 이 두 낱말뿐이라
  // (판도 테두리도 없다) 문구가 짧고 서로 달라야 한다
  upcomingHead: "예정",
  inactiveHead: "일정이 없는 스토어",
  browseGames: "할인 중인 게임 보기",
} as const;

/**
 * 홈 배너와 목록 칩 문구 — 데이터로 확인된 세일만 말한다(lib/sales/detect).
 * "스팀" 을 앞에 붙이는 이유: 세일 이름("가을 세일")만으로는 어느 스토어 행사인지 모른다.
 */
export const RUNNING_SALE_MESSAGES = {
  label: "지금 진행 중",
  title: (name: string) => `스팀 ${name}`,
  count: (n: number) => `${n.toLocaleString("ko-KR")}개 게임 할인 중`,
  untilEnd: "종료까지",
  endsAt: (when: string) => `${when} 종료`,
  cta: "세일 게임 보기",
  previewLabel: "세일 중인 인기 게임",
  chip: (name: string) => `스팀 ${name}`,
} as const;

/** 카운트다운 칸 이름. 순서가 곧 표시 순서다 */
export const COUNTDOWN_UNITS = [
  { key: "days", label: "일" },
  { key: "hours", label: "시간" },
  { key: "minutes", label: "분" },
  { key: "seconds", label: "초" },
] as const;
