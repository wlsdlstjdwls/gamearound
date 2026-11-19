// 관리자 진입 인사 화면 문구(2026-11-19, lib/admin/greeting 머리 주석)
export const GREETING_MESSAGES = {
  phrases: ["잠시만 기다려 주세요", "사용할 수 있는 프로그램을 확인하고 있어요"],
  enter: (name: string) => `${name}님, 관리자 화면으로 들어가요`,
  lead: "사용할 수 있는 프로그램",
  count: (n: number) => `${n}개`,
  none: "사용할 수 있는 프로그램이 없어 대시보드만 열려요.",
  noneHint: "다른 관리자에게 사용자별프로그램관리에서 켜 달라고 해 주세요.",
  skip: "건너뛰기",
} as const;
