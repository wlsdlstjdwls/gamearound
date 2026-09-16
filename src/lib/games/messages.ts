// 게임 상세, 회사 화면의 사용자 문구. "-해요"체, 가운뎃점과 화살표 글자를 쓰지 않는다.
// 문구를 컴포넌트에 흩어 두면 같은 개념이 화면마다 다른 말로 불린다.
import type { CompanyRole, ContentType, UpgradeKind } from "@/server/db/schema";

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = {
  developer: "개발",
  publisher: "배급",
};

/**
 * 콘텐츠 종류 배지 문구. 본편(game)은 없다 — 게임 화면에 "게임" 이라고 적어 봐야 아무것도 안 말한다.
 * DLC 와 에디션도 자기 상세를 갖는데, 종류를 안 적으면 본편 화면과 구분이 안 돼
 * "이 게임은 왜 1,900원이지" 로 읽힌다.
 */
export const CONTENT_KIND_LABEL: Record<Exclude<ContentType, "game">, string> = {
  dlc: "DLC",
  edition: "에디션",
  bundle: "번들",
  demo: "체험판",
};

/** 자식 화면에서 본편으로 돌아가는 줄. 부모를 아는 자식에게만 보인다 */
export const PARENT_LINK_LABEL = "본편";

/** 목록 화면(스크롤 페이징) 문구 */
export const GAMES_LIST_MESSAGES = {
  loadingMore: "더 불러오는 중이에요",
  loadMore: "더 보기",
  loadFailed: "더 불러오지 못했어요.",
  retry: "다시 시도",
  /** 끝을 말해 주지 않으면 사람이 바닥에서 계속 기다린다 */
  listEnd: "목록의 끝이에요",
} as const;

export const GAME_MESSAGES = {
  /** 회사 엔티티가 아직 없을 때 — 결함처럼 보이지 않게 조용한 문구를 쓴다 */
  companyUnknown: "제작사 정보 없어요",
  dlcHeading: "DLC",
  /** 목록은 아직인데 스토어가 "추가 콘텐츠 있음"이라고만 알려준 경우 */
  dlcKnownButUnlisted: "DLC 가 있어요. 목록은 아직 모으는 중이에요.",
  dlcNone: "지금은 확인된 DLC 가 없어요.",
  /** 에디션, 기종 변형 칸. "에디션"만으로는 "PS4 & PS5 버전" 류가 안 읽혀서 둘을 함께 적는다 */
  editionHeading: "에디션, 기종별 판",
  patchHeading: "패치 기록",
  /** 요약 바에 최저가 말고는 아직 아는 값이 없을 때. 빈 칸을 "-" 로 채우는 대신 한 줄로 말한다 */
  summaryPending: "플레이타임과 평점은 아직 모으는 중이에요.",
  patchNone: "아직 모은 패치 기록이 없어요.",
  subscriptionHeading: "구독",
  upgradeHeading: "업그레이드",
  freeUpgradeNote: "원본을 가지고 있어야 해요.",
} as const;

/**
 * 시간당 가격 문구.
 *
 * 눈금의 기준선을 "평균"이라 부르지 않는 이유: 우리가 쓰는 값은 중간값이다.
 * 5,000시간짜리 몇 개가 평균을 통째로 끌고 가서 백분위를 쓰기로 했는데,
 * 화면에서만 평균이라 부르면 읽는 사람이 다른 계산을 상상한다.
 */
export const PER_HOUR_MESSAGES = {
  heading: "시간당 가격",
  unit: "/시간",
  basis: "메인 스토리 기준",
  medianTick: "중간",
  meTick: "이 게임",
  axisStart: "싼 쪽",
  axisEnd: "비싼 쪽",
} as const;

/** 분포 안에서의 자리. 단정하지 않는 말로 적는다 - 우리가 모은 범위 안에서만 참인 값이다 */
export const PER_HOUR_VERDICT_LABEL = {
  cheap: "싼 편",
  mid: "보통",
  pricy: "비싼 편",
} as const;

/**
 * 눈금 밑 한 줄. 몇 개와 견준 값인지를 밝혀야 "싼 편" 이 말이 된다.
 * 표본이 원화 가격과 플레이타임을 둘 다 가진 게임뿐이라는 사정은 적지 않는다 —
 * 읽는 사람이 할 수 있는 일이 없고, 우리 데이터 사정을 화면에 옮겨 적는 일이다.
 */
export function perHourScopeText(sampleSize: number): string {
  return `게임 ${sampleSize.toLocaleString("ko-KR")}개와 비교했어요.`;
}

/**
 * 구독 칩 문구 — 플랫폼 탭 안에 한 칩씩 선다. 서비스 이름은 구독 레코드가 들고 있고 여기서는 꼬리말만 붙인다.
 * 문장이 아니라 칩인 이유: 이미 그 스토어의 탭 안이라 "어디서" 를 다시 말할 필요가 없다.
 */
export function subscriptionChipText(label: string): string {
  return `${label} 포함`;
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
