// 게임 상세, 회사 화면의 사용자 문구. "-해요"체, 가운뎃점과 화살표 글자를 쓰지 않는다.
// 문구를 컴포넌트에 흩어 두면 같은 개념이 화면마다 다른 말로 불린다.
import type { CompanyRole, ContentType, DeckCompat, OsFamily, RequirementTier, UpgradeKind } from "@/server/db/schema";

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
  /** 사운드트랙, 코스튬, 재화가 전부 이 갈래로 들어온다 — 좁게 "DLC" 라고 적으면 거짓말이 된다(dlcHeading 주석) */
  dlc: "추가 콘텐츠",
  edition: "에디션",
  bundle: "번들",
  demo: "체험판",
  /** 본편에 딸린 것이 아니라 혼자 서는 사운드트랙 상품. 딸린 쪽은 dlc 로 온다 */
  music: "사운드트랙",
};

/**
 * 스팀덱 등급 칩 문구. 밸브가 단언한 값이라 미지원까지 그대로 적는다 —
 * 멀티플레이 칩에서 미지원을 지운 것과 다른 경우다(그쪽은 false 가 "스토어가 안 알려 줌" 을 겸했다).
 * 여기서는 "모름" 이 아예 null 로 와서, 값이 있다는 것 자체가 밸브가 봤다는 뜻이다.
 */
export const DECK_COMPAT_LABEL: Record<DeckCompat, string> = {
  verified: "스팀덱 검증됨",
  playable: "스팀덱 구동 가능",
  unsupported: "스팀덱 미지원",
};

/** 네이티브로 도는 OS 칩. 참인 것만 적는다 — 우회 실행(Proton, 포팅 툴킷)은 우리가 보증할 값이 아니다 */
export const NATIVE_OS_LABEL = {
  mac: "맥 지원",
  linux: "리눅스 지원",
} as const;

/** 사양표의 OS 이름. "PC" 라고 적지 않는다 — 맥도 리눅스도 PC 다 */
export const OS_FAMILY_LABEL: Record<OsFamily, string> = {
  windows: "윈도우",
  mac: "맥",
  linux: "리눅스",
};

/** 사양 등급. 최소는 "돌아가나", 권장은 "쾌적한가" 에 답한다 */
export const REQUIREMENT_TIER_LABEL: Record<RequirementTier, string> = {
  minimum: "최소",
  recommended: "권장",
};

/** 사양표의 줄 이름. 스토어 라벨(영문)을 그대로 쓰지 않고 우리 말로 적는다 */
export const REQUIREMENT_ROW_LABEL = {
  osText: "운영체제",
  cpuText: "프로세서",
  ramMb: "메모리",
  gpuText: "그래픽",
  vramMb: "비디오 메모리",
  directxText: "DirectX",
  storageMb: "저장공간",
  noteText: "그 밖에",
} as const;

/** 내 기기 화면과 폼의 문구 */
export const DEVICE_MESSAGES = {
  heading: "내 기기",
  lead: "등록해 두면 게임 상세에서 이 기기로 돌아가는지 바로 알려줘요.",
  labelHint: "데스크탑과 노트북처럼 여러 대를 등록할 수 있어요.",
  /** 사전에 없는 부품은 판정에서 빠진다는 사실을 미리 말해 둔다 */
  partHint: "적어 두면 우리가 알아볼게요. 모르는 부품이면 그 항목만 판정에서 빠져요.",
  empty: "아직 등록한 기기가 없어요.",
  addHeading: "기기 추가",
  editHeading: "기기 수정",
  primary: "기본 기기",
  makePrimary: "기본으로",
  remove: "지우기",
  /** 비회원 안내. 로그인을 요구하면 이 기능을 아무도 안 쓴다(설계 §4) */
  guestNote: "로그인하면 여러 대를 저장하고 어디서나 같은 판정을 받아요.",
} as const;

/** 판정 결과 문구. 단정하지 않는다 — 스토어가 적어 둔 값을 견준 결과일 뿐이다(설계 §6) */
export const VERDICT_LABEL = {
  below_minimum: "최소 사양에 못 미쳐요",
  meets_minimum: "최소 사양을 넘어요",
  meets_recommended: "권장 사양을 넘어요",
  unknown: "판정할 수 없어요",
} as const;

export const VERDICT_PART_LABEL = {
  cpu: "프로세서",
  gpu: "그래픽",
  ram: "메모리",
  storage: "저장공간",
} as const;

export const COMPAT_MESSAGES = {
  heading: "내 PC 로 돌아갈까요",
  /** 기기를 아직 안 고른 사람에게 */
  cta: "기기 여러 대 관리하기",
  guestLead: "기기를 적어 두면 이 게임이 돌아갈지 알려줘요. 로그인 없이도 돼요.",
  check: "확인하기",
  editDevice: "기기 다시 적기",
  /** 한 부위라도 못 본 경우. 조용히 통과시키지 않는다 */
  partial: "일부 항목은 확인하지 못했어요.",
  /** 판정은 예상이지 약속이 아니다 */
  note: "스토어에 적힌 사양과 견준 결과예요. 실제 구동은 게임 설정과 기기 상태에 따라 달라요.",
  unknownPart: "확인 못 함",
  meets: "충족",
  below: "모자람",
} as const;

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
  /**
   * "DLC" 라고 적지 않는다(2026-09-16). 이 칸에는 확장팩만 오지 않는다 —
   * 코스튬 4,895건, 사운드트랙 580건, 재화 208건이 같은 칸에 들어 있다.
   * 사운드트랙을 DLC 라고 부르면 틀린 말이고, "추가 콘텐츠" 는 셋 다 참이다.
   */
  dlcHeading: "추가 콘텐츠",
  /** 목록은 아직인데 스토어가 "추가 콘텐츠 있음"이라고만 알려준 경우 */
  dlcKnownButUnlisted: "추가 콘텐츠가 있어요. 목록은 아직 모으는 중이에요.",
  dlcNone: "지금은 확인된 추가 콘텐츠가 없어요.",
  /** 에디션, 기종 변형 칸. "에디션"만으로는 "PS4 & PS5 버전" 류가 안 읽혀서 둘을 함께 적는다 */
  editionHeading: "에디션, 기종별 판",
  patchHeading: "패치 기록",
  /** 요약 바에 최저가 말고는 아직 아는 값이 없을 때. 빈 칸을 "-" 로 채우는 대신 한 줄로 말한다 */
  summaryPending: "플레이타임과 평점은 아직 모으는 중이에요.",
  patchNone: "아직 모은 패치 기록이 없어요.",
  requirementHeading: "구동 사양",
  /**
   * 사양표 아래 한 줄. 스토어가 적어 둔 값을 옮겼을 뿐이라는 사실을 말해 둔다 —
   * "권장 = 1080p 높음 60fps" 는 업계 통념이지 약속이 아니다(설계 §6).
   */
  requirementNote: "스토어에 적힌 값을 그대로 옮겼어요. 실제 구동은 게임 설정과 기기 상태에 따라 달라요.",
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

/**
 * 출시예정 화면 문구.
 * "미정" 을 세지 않는 이유를 화면에 적는다 — 스토어가 날짜를 주지 않는 게임이 많고
 * (PlayStation 은 아예 주지 않는다) 그 사정을 숨기면 목록이 비어 보이는 것으로만 읽힌다.
 */
export const UPCOMING_MESSAGES = {
  title: "출시 예정",
  note: "한국 스토어 기준이에요",
  lead: "곧 나올 게임을 가까운 날짜부터 보여드려요. 스토어가 날짜를 밝힌 게임만 담겨요.",
  empty: "아직 날짜가 밝혀진 게임이 없어요.",
  basis: "스토어마다 출시일이 다르면 가장 이른 날짜로 세웠어요. PlayStation 은 출시일을 공개하지 않아 다른 스토어에도 없는 게임은 담기지 않아요.",
  browseGames: "전체 게임 보기",
} as const;

/** 달 머리 옆 건수. 그 달에 몇 개가 몰려 있는지가 훑는 사람의 다음 질문이다 */
export function upcomingCountText(count: number): string {
  return `${count.toLocaleString("ko-KR")}개`;
}
