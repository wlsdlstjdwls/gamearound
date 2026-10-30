// 전시관리(/admin/effects) 문구. 앞 자리는 lib/indie/fame-intro 의 관리자 묶음이었다 — 관리자 문구는 관리자 묶음에 둔다(605f9a7 와 같은 이유).
import type { FameIntroMode } from "@/lib/indie/fame-intro";

export const EFFECTS_MESSAGES = {
  listLabel: "전시 목록",
  empty: "등록된 전시가 없어요.",
  colName: "전시명",
  colMode: "노출 조건",
  colHold: "노출 시간",
  /** 전시마다 코드와 이름. 코드는 site_settings 키다 */
  fameIntroName: "명예의 전당 1위 인트로",
  sectionShow: "전시 정보",
  fieldCodeName: "전시코드/명",
  fieldMode: "노출 조건",
  fieldHold: "노출 시간",
  modeLabels: { off: "사용 안 함", once: "1위 변경 시 1회", always: "진입 시마다" } satisfies Record<FameIntroMode, string>,
  seconds: (s: number) => `${s.toFixed(1)}초`,
  saved: "저장했어요. 명예의 전당에 바로 반영돼요.",
  failed: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  reloaded: "저장된 값을 다시 불러왔어요.",
  preview: "명예의 전당에서 보기",
} as const;
