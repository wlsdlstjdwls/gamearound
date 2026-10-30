// 달력 피커(components/ui/date-field) 문구. 클라이언트 컴포넌트가 아닌 모듈에 둔다 — 서버 컴포넌트가 읽어도 값이 온다(AGENTS 6장).
export const DATE_FIELD_MESSAGES = {
  placeholder: "날짜 선택",
  today: "오늘",
  clear: "초기화",
  prevMonth: "지난달",
  nextMonth: "다음 달",
  prevYear: "지난해",
  nextYear: "다음 해",
  /** 머리의 "2026년 10월" 을 누르면 달 고르기로 바뀐다. 낭독기에는 그 뜻을 붙인다 */
  pickMonth: "월 선택",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"] as const,
  monthTitle: (year: number, month: number) => `${year}년 ${month}월`,
  yearTitle: (year: number) => `${year}년`,
  monthShort: (month: number) => `${month}월`,
  /** 칸에 보이는 값. 요일까지 적어 두면 "그 주 금요일" 같은 말과 바로 맞대 본다 */
  value: (year: number, month: number, day: number, weekday: string) => `${year}. ${month}. ${day}. (${weekday})`,
} as const;
