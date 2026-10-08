// 온보딩을 퀘스트처럼 읽히게 하는 계산 — 지도의 칸 상태, 채운 슬롯, 칭호. 순수 함수만(그래서 테스트가 붙는다).
//
// 왜 게임처럼 만드나(2026-10-08 사용자 요청 "게임하듯이 진행"): 질문 일곱 개가 설문으로 읽히면 건너뛰기를 누른다.
// 답 하나가 지도의 칸 하나를 밝히고 마지막에 내 칭호가 나오면, 다음 질문이 "할 일" 이 아니라 "남은 칸" 이 된다.
//
// 하지 않기로 한 것: 점수, 경험치. 건너뛴 사람이 "점수를 깎였다" 고 읽으면 강요가 되고, 모든 질문은 건너뛸 수 있다는
// 약속(intro)과 부딪친다. 레벨은 채운 슬롯 수일 뿐 깎이는 일이 없고, 건너뛴 칸은 "놓침" 이 아니라 빈 칸으로 그린다.
import type { DealStyle, PlayTimeStyle } from "@/server/db/schema";
import { ONBOARDING_MESSAGES as M } from "./messages";
import { visibleSteps, type OnboardingStep, type StepContext } from "./steps";
import type { ProfileFieldStep, SummaryInput } from "./summary";

/** 답이 저장되는 다섯 단계 = 슬롯. 순서는 단계 순서와 같다(앞에서부터 차오르는 것이 보여야 진행으로 읽힌다) */
export const SLOT_STEPS: readonly ProfileFieldStep[] = ["platforms", "genres", "deal-style", "play-time", "subscriptions"];

export function isSlotStep(step: OnboardingStep): step is ProfileFieldStep {
  return (SLOT_STEPS as readonly string[]).includes(step);
}

/**
 * 채운 슬롯. 빈 배열은 안 채운 것으로 친다 — 다중선택에서 아무것도 안 고르고 "다음" 을 누르면 [] 가 저장되는데,
 * 그걸 채웠다고 그리면 고른 적 없는 칸이 빛난다.
 */
export function filledSlots(p: SummaryInput): ProfileFieldStep[] {
  const has: Record<ProfileFieldStep, boolean> = {
    platforms: (p.platforms?.length ?? 0) > 0,
    genres: (p.favoriteGenreIds?.length ?? 0) > 0,
    "deal-style": p.dealStyle !== null,
    "play-time": p.playTimeStyle !== null,
    subscriptions: (p.subscriptionKeys?.length ?? 0) > 0,
  };
  return SLOT_STEPS.filter((s) => has[s]);
}

/**
 * 지도 칸 하나의 상태.
 * cleared: 지나온 칸(슬롯이면 답을 채운 칸). skipped: 지나왔지만 답이 빈 슬롯. current: 지금 칸. locked: 아직 안 간 칸.
 */
export type NodeState = "cleared" | "skipped" | "current" | "locked";
export type QuestNode = { step: OnboardingStep; state: NodeState };

/**
 * 지도의 칸들. intro 는 칸이 아니다(지도를 펴는 자리) — 그래서 intro 에서는 전부 locked 다.
 * 칸 목록은 visibleSteps 를 따르므로 기기 단계는 PC 를 고른 사람에게만 생긴다.
 */
export function questNodes(current: OnboardingStep, ctx: StepContext, filled: readonly ProfileFieldStep[]): QuestNode[] {
  const list: OnboardingStep[] = visibleSteps(ctx).filter((s) => s !== "intro");
  const cur = list.indexOf(current);
  return list.map((step, i) => {
    if (cur === -1 || i > cur) return { step, state: "locked" };
    if (i === cur) return { step, state: step === "done" ? "cleared" : "current" };
    if (isSlotStep(step) && !filled.includes(step)) return { step, state: "skipped" };
    return { step, state: "cleared" };
  });
}

/** 칭호 — 할인 성향이 앞말, 플레이타임이 뒷말. 둘 다 건너뛰어도 칭호는 선다 */
export function playerTitle(p: { dealStyle: DealStyle | null; playTimeStyle: PlayTimeStyle | null }): string {
  return `${M.quest.adjective[p.dealStyle ?? "none"]} ${M.quest.noun[p.playTimeStyle ?? "none"]}`;
}
