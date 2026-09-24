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
  /** 게임이 아닌 앱(영상 편집기, 배경화면 도구). 목록에는 안 나오고 주소로만 열린다 */
  software: "소프트웨어",
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
  /*
   * "그 밖에"(note_text)를 표에서 걷었다(2026-09-22, 사용자 물음: "그 밖에 영역은 뭐니?
   * 꼭 필요한건가...?"). 실측하고 답이 나왔다 — 사양 8,799벌 중 6,161벌에 값이 있는데
   * 가장 흔한 것이 "Requires a 64-bit processor and operating system" 1,436건이고,
   * 그 다음이 "Network:: Broadband Internet connection", "Sound Card:: DirectX compatible" 이다.
   * 스팀이 남긴 영문 잡줄이고, 한국어 화면에서 사람이 할 수 있는 일이 없는 말이다.
   * 게다가 사양표에서 유일하게 번역되지 않은 칸이라 그 줄만 튀었다.
   *
   * 값은 지우지 않는다(game_requirements.note_text 그대로) — 언젠가 "SSD 필요" 처럼
   * 쓸모 있는 조각만 골라 쓸 수 있고, 그때 다시 줄을 세우면 된다.
   */
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
  /** 자동 감지. 버튼 문구가 "다시" 인 이유는 아래 autoFilled 주석에 있다 — 간이 폼은 이미 한 번 읽고 시작한다 */
  detect: "브라우저에서 다시 불러오기",
  /**
   * 폼이 열리자마자 스스로 읽은 결과(2026-09-22). 버튼을 누르게 하지 않는 이유:
   * 누를 이유를 설명해야 누르고, 그 설명을 읽는 사람은 적다. 브라우저가 이미 아는 값이라 비용도 없다.
   * 대신 무엇이 어디서 왔는지는 말해 둔다 — 안 그러면 "내가 안 적은 값이 왜 여기 있지" 가 된다.
   */
  autoFilled: "그래픽과 운영체제는 브라우저에서 읽어 채웠어요. 프로세서와 메모리만 적어 주세요.",
  autoFailed: "이 브라우저는 그래픽을 알려 주지 않아요. 아래 세 칸을 적어 주세요.",
  /**
   * 브라우저가 읽는 그래픽이 **실제 게임용 그래픽이 아닐 수 있다**(2026-09-22, 사용자 지적).
   *
   * 읽는 값 자체는 진짜다 — WebGL 이 내주는 렌더러 문자열은 지금 브라우저가 그림을 그리는
   * 그 장치의 이름이다. 문제는 **어느 장치로 그리느냐** 다: 그래픽이 둘인 노트북에서 브라우저는
   * 대개 전력을 아끼려고 내장(Intel Iris, Radeon Graphics)으로 그린다. 게임은 외장으로 돌아가는데
   * 우리가 받은 이름은 내장인 경우가 생긴다 — 그때 판정은 실제보다 박하다.
   * 그래서 채워는 주되 **고칠 자리라는 것을 옆에 적어 둔다.** 추측으로 외장 이름을 지어내지 않는다.
   */
  gpuHint: "노트북이면 내장 그래픽이 잡힐 수 있어요. 게임용 그래픽이 따로 있으면 고쳐 주세요.",
  cpuHint: "세대까지 적어 주세요. i5 처럼만 적으면 판정에서 빠져요.",
  detectDone: "그래픽과 운영체제를 채웠어요. 나머지는 적어 주세요",
  detectOsOnly: "운영체제만 알아냈어요. 그래픽은 적어 주세요",
  /** 지문 방지 설정이나 사파리에서는 확장이 막힌다. 실패를 고장처럼 말하지 않는다 */
  detectFailed: "이 브라우저에서는 못 읽어요. 직접 적어 주세요",
  /** 메모리를 안 채우는 이유를 사람에게도 말해 둔다 — 안 그러면 "왜 저것만 비나" 가 된다 */
  detectRamNote: "메모리는 브라우저가 8GB 까지만 알려 줘서 채우지 않아요.",
} as const;

/** 판정 결과 문구. 단정하지 않는다 — 스토어가 적어 둔 값을 견준 결과일 뿐이다(설계 §6) */
export const VERDICT_LABEL = {
  below_minimum: "최소 사양에 못 미쳐요",
  meets_minimum: "최소 사양을 넘어요",
  meets_recommended: "권장 사양을 넘어요",
  unknown: "판정할 수 없어요",
} as const;

/**
 * 제목 옆 한 마디(2026-09-22, 사용자 지정). 위의 VERDICT_LABEL 과 다른 말을 쓰는 이유:
 * 저쪽은 결론 면 안에서 문장으로 서고("최소 사양을 넘어요"), 이쪽은 제목 옆 배지라 명사형이 짧게 붙어야 한다.
 * "판정할 수 없어요" 에 해당하는 말이 없는 것은 그때 배지 자체를 안 세우기 때문이다(verdict-note).
 */
export const VERDICT_SHORT_LABEL = {
  /** "미달" 이 아니라 "미충족" 이다(2026-09-22, 사용자 지정) — 아래 below 와 같은 말을 써야
      배지와 부위 표가 한 화면에서 두 낱말로 갈리지 않는다 */
  below_minimum: "최소 사양 미충족",
  meets_minimum: "최소 사양 충족",
  meets_recommended: "권장 사양 충족",
  unknown: "판정 불가",
} as const;

export const VERDICT_PART_LABEL = {
  cpu: "프로세서",
  gpu: "그래픽",
  ram: "메모리",
  storage: "저장공간",
} as const;

export const COMPAT_MESSAGES = {
  heading: "내 PC 로 돌아갈까요?",
  /** 기기를 아직 안 고른 사람에게 */
  cta: "기기 여러 대 관리하기",
  /** 첫 줄 안내는 없앴다(2026-09-22, 사용자 지정) — 칸 이름과 버튼이 이미 무엇을 하는 자리인지 말한다 */
  check: "확인하기",
  editDevice: "기기 다시 적기",
  /** 한 부위라도 못 본 경우. 조용히 통과시키지 않는다 */
  partial: "일부 항목은 확인하지 못했어요.",
  /**
   * 판정의 기준(2026-09-22, 사용자 결정). 전에는 이 자리에 "실제 구동은 게임 설정과 기기 상태에 따라
   * 달라요" 가 있었다 — 맞는 말이지만 읽는 사람이 할 수 있는 일이 없는 말이었다. 모든 판정에
   * "다를 수 있어요" 를 붙이면 판정이 아무것도 말하지 않는 것과 같다.
   *
   * 그래서 면책 대신 **기준을 못 박는다**. 옵션을 말하지 않으면 "돌아간다" 가 사람마다 다른 뜻이 된다 —
   * 누구는 최저 옵션 30프레임을, 누구는 평옵 60프레임을 생각한다. 스토어가 최소, 권장을 적을 때
   * 업계가 쓰는 통념이 아래 두 줄이고, 우리 판정도 그 통념 위에 선다.
   */
  basis: "최소는 1080p 낮은 옵션 30프레임, 권장은 1080p 평균 옵션 60프레임 기준이에요.",
  unknownPart: "확인 못 함",
  meets: "충족",
  /** "모자람" 에서 바꿨다(2026-09-22, 사용자 지정) — 옆 칸이 "충족" 이라 그 반대말이 서야 한 쌍으로 읽힌다 */
  below: "미충족",
  /**
   * 결론 밑 한 줄 — "그래서 뭘 보라는 건가" 에 답한다(2026-09-21).
   *
   * 부위 표만 있던 때는 판정이 "최소 사양을 넘어요" 한 줄이고 그 아래 네 줄이 충족, 충족, 충족,
   * 확인 못 함이었다. 읽는 사람은 네 줄을 다 훑어야 어디가 걸리는지 알았다 — 그 일을 우리가 한다.
   * 항목 이름을 앞에 두고 조사를 안 붙이는 이유: "그래픽이" 와 "메모리가" 가 섞이면 목록마다
   * 조사를 골라야 하는데, 그 규칙을 문구 함수에 넣으면 문구가 로직이 된다.
   */
  shortOfMinimum: (parts: string) => `${parts} 항목이 최소 사양에 모자라요.`,
  shortOfRecommended: (parts: string) => `${parts} 항목이 권장 사양에 모자라요.`,
  /** 권장까지 다 넘었을 때. 같은 자리에 늘 한 줄이 서야 결론 블록의 높이가 안 흔들린다 */
  aboveRecommended: "모든 항목이 권장 사양을 넘어요.",
  /** 최소는 넘었고 권장 사양 자체가 없는 게임 */
  noRecommended: "스토어가 권장 사양을 적어 두지 않았어요.",
  /* 부위별 판정의 근거 문구 둘(`need`, `mine`)을 지웠다(2026-09-22, 사용자 지정).
     요구값은 옆 기둥의 사양표가 이미 적고, 내 값은 항목 이름 바로 옆에 숫자로만 선다 —
     남은 값이 하나뿐이라 "내 기기" 라는 말머리가 붙을 이유도 없어졌다(compat-section 주석). */
  /** 왜 못 봤는지. "확인 못 함" 만 적으면 우리 잘못인지 스토어 잘못인지 알 수 없다 */
  whyNoRequirement: "스토어가 안 적었어요",
  whyNoDevice: "기기에 안 적어 두셨어요",
  whyUnknownModel: "사전에 없는 부품이에요",
  /**
   * 네이티브 빌드 안내(설계 §5). 사양을 견주기 전에 답해야 하는 질문이라 문구를 따로 둔다.
   * "없어요" 와 "모르겠어요" 를 가려 말한다 — 스토어가 없다고 한 것과 아무 말 안 한 것은 다르다.
   */
  nativeNo: (os: string) => `이 게임은 ${os} 빌드가 없어요.`,
  nativeYesNoSpec: (os: string) => `${os} 에서 돌아가요. 다만 스토어가 ${os} 사양을 따로 적어 두지 않았어요.`,
  nativeUnknown: (os: string) => `${os} 사양이 없어요. 스토어가 ${os} 지원 여부를 알려 주지 않았어요.`,
} as const;

/**
 * 목록의 "내 기기" 필터 문구 — 설계 문서 §7 의 3단계.
 * 칩 문구가 "돌아가요" 인 이유: 이 필터가 답하는 것은 쾌적함이 아니라 구동 여부다(최소 사양만 본다).
 */
export const RIG_FILTER_MESSAGES = {
  group: "내 기기",
  chip: "내 기기로 돌아가요",
  setup: "내 기기 적기",
  edit: "기기 고치기",
  lead: "기기를 적어 두면 돌아가는 게임만 골라 볼 수 있어요. 로그인 없이도 돼요.",
  /** 적기는 적었는데 부품을 하나도 못 알아본 경우. 조용히 안 걸린 채로 두지 않는다 */
  unmatched: "적어 주신 부품을 못 알아봤어요. 다른 이름으로 적어 보세요.",
  /** 사양을 아직 모으지 못한 게임은 이 필터에서 빠진다는 사실을 숨기지 않는다 */
  note: "사양을 아는 PC 게임만 이 조건으로 걸러요.",
} as const;

/**
 * 목록 기둥의 "조건" 무리 문구.
 *
 * "무료 게임 제외" 가 아니라 "무료 제외" 인 이유: 기둥 폭이 232px 이고 칩이 한 줄에 서야 한다.
 * 무리 이름("조건")이 이미 거르는 자리임을 말하므로 칩은 무엇을 빼는지만 말하면 된다.
 */
export const GAMES_FILTER_MESSAGES = {
  hideFree: "무료 제외",
  /*
   * 켜고 끄는 칩의 상태를 말로 적은 짝. 화면에는 네모와 체크로만 서 있어(ui/chip 의 ChipCheck)
   * 읽어 주는 기기에는 글자가 없다 — 칩 안 sr-only 로만 쓴다.
   */
  toggleOn: "적용 중, 누르면 해제해요",
  toggleOff: "누르면 적용해요",
  /** 좁은 화면의 여는 단추이자 시트 머리. 한 낱말인 이유는 game-filters/index 머리 주석에 있다 */
  sheetTitle: "필터",
  /** 시트 바닥. "닫기" 가 아니라 "결과 보기" 인 이유: 닫는 것이 목적이 아니라 고른 결과를 보는 것이 목적이다 */
  sheetDone: "결과 보기",
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
  summaryPending: "플레이타임과 평점은 아직 파밍 중이에요.",
  /**
   * 기록상 최저가 칸. "역대" 라고 쓰지 않는다 — 우리가 본 기간은 스냅샷을 쌓기 시작한 뒤뿐이고
   * 그 전 가격은 알 수 없다. "기록" 은 그 한계를 문구 안에 담는 말이다.
   */
  recordedLowLabel: "기록 최저가",
  recordedLowNote: (gap: string, at: string) => `지금보다 ${gap} 쌌어요 | ${at}`,
  patchNone: "아직 모은 패치 기록이 없어요.",
  /** 사양표 아래 한 줄은 없앴다(2026-09-22, 사용자 결정) — 표 자체가 "스토어가 적은 값" 이고,
      기준이 필요한 자리는 판정 쪽이다(COMPAT_MESSAGES.basis) */
  requirementHeading: "구동 사양",
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
 * 출시예정 화면 문구.
 * "미정" 을 세지 않는 이유를 화면에 적는다 — 스토어가 날짜를 주지 않는 게임이 많고
 * (PlayStation 은 아예 주지 않는다) 그 사정을 숨기면 목록이 비어 보이는 것으로만 읽힌다.
 */
export const UPCOMING_MESSAGES = {
  title: "출시 예정",
  note: "한국 스토어 기준이에요",
  /** 화면에서는 뗐다(2026-09-22, 사용자 지정) — 검색결과, SNS 카드의 설명으로만 남는다 */
  lead: "곧 나올 게임을 가까운 날짜부터 보여드려요. 스토어가 날짜를 밝힌 게임만 담겨요.",
  empty: "아직 날짜가 밝혀진 게임이 없어요.",
  basis: "스토어마다 출시일이 다르면 가장 이른 날짜로 세웠어요. PlayStation 은 출시일을 공개하지 않아 다른 스토어에도 없는 게임은 담기지 않아요.",
} as const;

/**
 * 달 머리 옆 건수. 그 달에 몇 개가 몰려 있는지가 훑는 사람의 다음 질문이다.
 *
 * 잘린 달은 그 사실을 적는다(2026-09-22). 이번 달에만 271건이 몰려 있는데(실측) 화면에는 24장만
 * 세운다 — 전체 건수만 적으면 "271개" 밑에 24장이 서서 나머지가 어디 갔는지 말하지 않는 화면이 된다.
 */
export function upcomingCountText(shown: number, total: number): string {
  const all = `${total.toLocaleString("ko-KR")}개`;
  return shown < total ? `${all} 중 ${shown.toLocaleString("ko-KR")}개` : all;
}
