// 받은 취향을 사람이 읽는 줄로 — 온보딩 결과 화면과 설정 화면이 같은 줄을 보여 준다.
//
// 한곳에 둔 이유: 두 화면이 따로 만들면 한쪽에만 구독 줄이 생기거나 라벨이 갈라진다.
// "설정에서 보이는 값" 이 곧 "온보딩이 받은 값" 이어야 약속(intro 의 "설정에서 보고 지울 수 있어요")이 지켜진다.
//
// 순수 함수다 — 장르, 구독 이름은 부르는 쪽이 DB 에서 받아 넘긴다.
import type { DealStyle, PlayTimeStyle, Platform } from "@/server/db/schema";
import { DEAL_STYLE_CHOICES, PLATFORM_CHOICES, PLAY_TIME_CHOICES } from "./constants";

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

/**
 * 답한 칸만 줄로 만든다. 건너뛴 칸을 "없음" 으로 적지 않는 이유: 설정 화면에서 빈 줄이 늘어서면
 * "뭔가 잘못 저장됐다" 로 읽힌다. 아무 줄도 없으면 부르는 쪽이 따로 말한다.
 * 이름을 못 찾은 값(화이트리스트에서 빠진 장르, 없어진 구독)은 조용히 뺀다.
 */
export function summarizeProfile(p: SummaryInput, names: SummaryNames): ProfileSummaryRow[] {
  const rows: ProfileSummaryRow[] = [];
  const push = (label: string, values: (string | undefined)[]) => {
    const found = values.filter((v): v is string => Boolean(v));
    if (found.length) rows.push({ label, value: found.join(", ") });
  };

  push(SUMMARY_LABELS.platforms, (p.platforms ?? []).map((v) => PLATFORM_CHOICES.find((c) => c.value === v)?.label));
  push(SUMMARY_LABELS.genres, (p.favoriteGenreIds ?? []).map((id) => names.genres.find((g) => g.id === id)?.name));
  push(SUMMARY_LABELS.dealStyle, [DEAL_STYLE_CHOICES.find((c) => c.value === p.dealStyle)?.label]);
  push(SUMMARY_LABELS.playTime, [PLAY_TIME_CHOICES.find((c) => c.value === p.playTimeStyle)?.label]);
  push(SUMMARY_LABELS.subscriptions, (p.subscriptionKeys ?? []).map((k) => names.subscriptions.find((s) => s.key === k)?.label));
  return rows;
}
