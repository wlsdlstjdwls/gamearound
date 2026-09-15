// 게임 상세, 회사 화면의 사용자 문구. "-해요"체, 가운뎃점과 화살표 글자를 쓰지 않는다.
// 문구를 컴포넌트에 흩어 두면 같은 개념이 화면마다 다른 말로 불린다.
import type { CompanyRole, UpgradeKind } from "@/server/db/schema";

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = {
  developer: "개발",
  publisher: "배급",
};

export const GAME_MESSAGES = {
  /** 회사 엔티티가 아직 없을 때 — 결함처럼 보이지 않게 조용한 문구를 쓴다 */
  companyUnknown: "제작사 정보 없어요",
  dlcHeading: "DLC",
  /** 목록은 아직인데 스토어가 "추가 콘텐츠 있음"이라고만 알려준 경우 */
  dlcKnownButUnlisted: "DLC 가 있어요. 목록은 아직 모으는 중이에요.",
  dlcNone: "지금은 확인된 DLC 가 없어요.",
  patchHeading: "패치 기록",
  patchNone: "아직 모은 패치 기록이 없어요.",
  /**
   * 패치 기록을 공개하는 스토어가 둘뿐이라는 사실을 화면이 먼저 말한다 —
   * 안 그러면 "Xbox 는 패치를 안 하나" 로 읽힌다. 왜 둘뿐인지는 adapters/types 의 listPatchNotes 주석에 있다.
   */
  patchSourceNote: "패치 기록은 Steam 과 GOG 만 공개해요. 다른 스토어는 아직 받아올 곳이 없어요.",
  /** 속도 값이 "우리가 모은 범위 안에서만" 참이라는 단서 */
  patchScopeNote: "우리가 모으기 시작한 뒤의 기록만 담고 있어요.",
  subscriptionHeading: "구독",
  upgradeHeading: "업그레이드",
  freeUpgradeNote: "원본을 가지고 있어야 해요.",
} as const;

/** 구독 배지 문구 — 서비스 이름은 구독 레코드가 들고 있고, 여기서는 문장만 만든다 */
export function subscriptionText(labels: string[]): string {
  if (labels.length === 0) return "";
  return `${labels.join(" | ")} 로 플레이할 수 있어요`;
}

/**
 * 업그레이드 한 줄.
 * 유료면 가격을 함께 말한다 — "유료"라는 말만으로는 살지 말지 정할 수 없다.
 */
export function upgradeText(kind: UpgradeKind, toLabel: string, price: string | null): string {
  switch (kind) {
    case "free":
      return `${toLabel} 로 무료 업그레이드할 수 있어요`;
    case "paid":
      return price ? `${toLabel} 업그레이드 ${price}` : `${toLabel} 업그레이드는 유료예요`;
    case "subscription_included":
      return `구독 중이면 ${toLabel} 로 무료 업그레이드할 수 있어요`;
  }
}

/**
 * 패치 속도 한 줄. 기록이 1건뿐이면 "간격"이 없어 건수만 말한다 —
 * 0 일이라고 적으면 "매일 고친다" 로 읽힌다.
 */
export function patchSpeedText(averageIntervalDays: number | null, count: number): string {
  if (count === 0) return "기록 없어요";
  if (averageIntervalDays === null) return `기록 ${count}건`;
  return `평균 ${averageIntervalDays}일마다 | ${count}건`;
}
