// 받은 취향을 사람이 읽는 줄로 — 온보딩 결과 화면과 설정 화면이 같은 줄을 보여 준다.
//
// 한곳에 둔 이유: 두 화면이 따로 만들면 한쪽에만 구독 줄이 생기거나 라벨이 갈라진다.
// "설정에서 보이는 값" 이 곧 "온보딩이 받은 값" 이어야 약속(intro 의 "설정에서 보고 지울 수 있어요")이 지켜진다.
//
// 순수 함수다 — 장르, 구독 이름은 부르는 쪽이 DB 에서 받아 넘긴다.
import type { DealStyle, PlayTimeStyle, Platform } from "@/server/db/schema";
import { DEAL_STYLE_CHOICES, PLATFORM_CHOICES, PLAY_TIME_CHOICES } from "./constants";
import type { OnboardingStep } from "./steps";

export type ProfileSummaryRow = { label: string; value: string };

/** 줄 이름. 결과 화면의 칸 폭(w-20)에 맞게 짧게 둔다 */
export const SUMMARY_LABELS = {
  platforms: "플랫폼",
  genres: "장르",
  dealStyle: "할인",
  playTime: "플레이타임",
  subscriptions: "구독",
} as const;

export type SummaryInput = {
  platforms: readonly Platform[] | null;
  favoriteGenreIds: readonly number[] | null;
  dealStyle: DealStyle | null;
  playTimeStyle: PlayTimeStyle | null;
  subscriptionKeys: readonly string[] | null;
};

export type SummaryNames = {
  genres: readonly { id: number; name: string }[];
  subscriptions: readonly { key: string; label: string }[];
};

/** 칸 하나와 그 칸을 묻는 온보딩 단계. 설정 화면이 칸마다 "바꾸기" 를 그 단계로 잇는다 */
export type ProfileField = { step: ProfileFieldStep; label: string; value: string | null };
export type ProfileFieldStep = Extract<OnboardingStep, "platforms" | "genres" | "deal-style" | "play-time" | "subscriptions">;

/**
 * 다섯 칸을 늘 같은 순서로 돌려준다. 답하지 않은 칸은 value 가 null 이다.
 * 설정 화면은 빈 칸도 그려야 한다 — 가입 때 건너뛴 칸을 거기서 채우는 것이 그 화면의 일이다(2026-10-07 사용자 요청).
 * 이름을 못 찾은 값(화이트리스트에서 빠진 장르, 없어진 구독)은 조용히 빼고, 다 빠지면 안 답한 칸과 같다.
 */
export function profileFields(p: SummaryInput, names: SummaryNames): ProfileField[] {
  const join = (values: (string | undefined)[]) => {
    const found = values.filter((v): v is string => Boolean(v));
    return found.length ? found.join(", ") : null;
  };
  return [
    { step: "platforms", label: SUMMARY_LABELS.platforms, value: join((p.platforms ?? []).map((v) => PLATFORM_CHOICES.find((c) => c.value === v)?.label)) },
    { step: "genres", label: SUMMARY_LABELS.genres, value: join((p.favoriteGenreIds ?? []).map((id) => names.genres.find((g) => g.id === id)?.name)) },
    { step: "deal-style", label: SUMMARY_LABELS.dealStyle, value: join([DEAL_STYLE_CHOICES.find((c) => c.value === p.dealStyle)?.label]) },
    { step: "play-time", label: SUMMARY_LABELS.playTime, value: join([PLAY_TIME_CHOICES.find((c) => c.value === p.playTimeStyle)?.label]) },
    { step: "subscriptions", label: SUMMARY_LABELS.subscriptions, value: join((p.subscriptionKeys ?? []).map((k) => names.subscriptions.find((s) => s.key === k)?.label)) },
  ];
}

/**
 * 답한 칸만 줄로 만든다(온보딩 결과 화면). 건너뛴 칸을 "없음" 으로 적지 않는 이유: 결과 화면에서 빈 줄이 늘어서면
 * "뭔가 잘못 저장됐다" 로 읽힌다. 아무 줄도 없으면 부르는 쪽이 따로 말한다.
 */
export function summarizeProfile(p: SummaryInput, names: SummaryNames): ProfileSummaryRow[] {
  return profileFields(p, names).flatMap((f) => (f.value === null ? [] : [{ label: f.label, value: f.value }]));
}
