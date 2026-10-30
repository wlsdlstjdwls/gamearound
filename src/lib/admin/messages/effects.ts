// 전시관리(/admin/effects) 문구. 앞 자리는 lib/indie/fame-intro 의 관리자 묶음이었다 — 관리자 문구는 관리자 묶음에 둔다(605f9a7 와 같은 이유).
import type { FameIntroMode } from "@/lib/indie/fame-intro";

export const EFFECTS_MESSAGES = {
  listLabel: "전시 목록",
  empty: "등록된 전시가 없어요.",
  colName: "전시명",
  colMode: "보여 주는 때",
  colHold: "머무는 시간",
  /** 전시마다 코드와 이름. 코드는 site_settings 키다 */
  fameIntroName: "명예의 전당 1위 인트로",
  sectionShow: "전시",
  fieldCodeName: "전시코드/명",
  fieldMode: "보여 주는 때",
  fieldHold: "머무는 시간",
  modeLabels: { off: "끄기", once: "1위마다 한 번", always: "들어올 때마다" } satisfies Record<FameIntroMode, string>,
  seconds: (s: number) => `${s.toFixed(1)}초`,
  saved: "저장했어요. 명예의 전당에 바로 반영돼요.",
  failed: "저장하지 못했어요. 잠시 뒤 다시 해 주세요.",
  reloaded: "저장된 값으로 다시 읽었어요.",
  preview: "명예의 전당에서 보기",
} as const;
