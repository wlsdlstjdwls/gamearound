// "준비 중" 화면 문구(components/coming-soon). 기획서 v2.0 의 새 갈래가 화면을 갖기 전까지 메뉴의 도착지다.
// 칸마다 "무엇이 올 자리인지" 를 한 줄로 말한다 — 그냥 "준비 중" 만 두면 메뉴를 왜 눌렀는지 답하지 못한다.
import { ROUTES } from "@/lib/routes";

export const COMING_SOON_MESSAGES = {
  badge: "준비 중",
  title: "아직 준비 중이에요",
  action: "게임 둘러보기",
  /** 칸 이름을 lib/nav 에서 못 찾을 때(표에서 빠진 경로) 쓰는 제목 */
  fallbackTitle: "준비 중인 화면",
  lead: {
    [ROUTES.hallOfFame]: "매달 반응이 좋았던 인디 게임을 뽑아 소개할 자리예요.",
    [ROUTES.rookies]: "등록한 지 30일이 안 된 인디 신작을 모아 보여 줄 자리예요.",
    [ROUTES.lounge]: "인디 개발자가 소식을 나누고 게임 등록을 관리하는 공간을 준비하고 있어요.",
  } as Record<string, string>,
} as const;
