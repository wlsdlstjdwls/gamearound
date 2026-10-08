// 온보딩 선택지 정의 — 화면에 뜨는 카드의 내용과 순서. 값은 DB enum 과 1:1 이다.
import type { DealStyle, PlayTimeStyle, Platform } from "@/server/db/schema";

export type Choice<V extends string> = {
  value: V;
  label: string;
  /** 카드 안 둘째 줄. 없으면 안 그린다 */
  note?: string;
};

/**
 * 플랫폼 선택지. 목록 필터가 쓰는 갈래와 같은 순서다 — 두 화면에서 순서가 다르면
 * 사람이 "내가 고른 그것" 을 다시 찾느라 눈으로 훑는다.
 * switch2 를 switch 와 나란히 두는 이유: 가격이 따로 붙는 별개 스토어다.
 */
export const PLATFORM_CHOICES: readonly Choice<Platform>[] = [
  { value: "steam", label: "Steam", note: "PC" },
  { value: "epic", label: "Epic Games", note: "PC" },
  { value: "ps5", label: "PS5" },
  { value: "ps4", label: "PS4" },
  { value: "xbox", label: "Xbox" },
  { value: "switch", label: "Switch" },
  { value: "switch2", label: "Switch 2" },
];

/**
 * 할인 민감도. 카드 문구는 퍼센트가 아니라 **행동**으로 적는다 — "20%" 라고 물으면
 * 사람이 자기 기준을 숫자로 환산해야 하고, 그 환산은 우리가 하는 편이 정확하다.
 * 아래 DEAL_STYLE_THRESHOLD 가 그 환산표다.
 */
export const DEAL_STYLE_CHOICES: readonly Choice<DealStyle>[] = [
  { value: "full_price", label: "기다리지 않아요", note: "하고 싶으면 정가에도 사요" },
  { value: "wait_small", label: "조금이라도 깎이면", note: "20% 쯤이면 충분해요" },
  { value: "wait_deep", label: "반값은 돼야죠", note: "50% 부터 사요" },
  { value: "historic_low", label: "역대 최저가만", note: "그 아래로 안 내려갈 때까지 기다려요" },
];

/**
 * 성향을 알림 임계값(%)으로 옮기는 표. **정책이라 언제든 바뀐다** — 그래서 DB enum 에 퍼센트를
 * 박지 않고 여기에 둔다(schema-enums 의 dealStyleEnum 주석).
 * null 은 "퍼센트로 못 정한다" 는 뜻이다 — 역대 최저가는 가격 이력과 견주는 다른 조건이다.
 */
export const DEAL_STYLE_THRESHOLD: Record<DealStyle, number | null> = {
  full_price: 0,
  wait_small: 20,
  wait_deep: 50,
  historic_low: null,
};

/**
 * 플레이타임 취향. 경계값은 HLTB main(본편 클리어) 기준 시간이다.
 * endless 에는 시간 필터를 아예 걸지 않는다 — 로그라이크, 대전, 라이브 서비스는 "몇 시간" 이
 * 없는 축이라 시간으로 거르면 통째로 사라진다(schema-enums 주석과 같은 이유).
 */
export const PLAY_TIME_CHOICES: readonly Choice<PlayTimeStyle>[] = [
  { value: "short", label: "짧게 끝나는 것", note: "5시간 안쪽" },
  { value: "medium", label: "적당한 것", note: "20시간쯤" },
  { value: "long", label: "길게 파는 것", note: "50시간 넘게" },
  { value: "endless", label: "끝이 없는 것", note: "로그라이크, 대전, 라이브 서비스" },
];

/** HLTB main 시간 상한. null 은 "거르지 않는다" */
export const PLAY_TIME_MAX_HOURS: Record<PlayTimeStyle, number | null> = {
  short: 8,
  medium: 30,
  long: null,
  endless: null,
};

/**
 * 장르 카드에 올릴 이름 화이트리스트.
 *
 * 왜 전부 안 보여 주나(2026-09-22 실측, 본편 기준 상위 26개): 카탈로그의 장르에는 사람이
 * 취향으로 고를 수 없는 것이 섞여 있다 — "앞서 해보기"(307), "무료 플레이"(225), "기타"(211),
 * "유틸리티"(79), "실용"(22), "학습"(120), "트레이닝"(101), "커뮤니케이션"(112).
 * 이건 장르가 아니라 판매 형태거나 비게임이다. 온보딩에서 "학습" 을 취향으로 묻는 건 질문이 아니다.
 *
 * id 가 아니라 **이름**으로 적는 이유: id 는 환경마다 다르고(생성 순서), 이름은 lib/genres 가
 * 우리 어휘 한 벌로 수렴시켜 둔 값이다. 실제 id 는 조회할 때 붙인다.
 * 여기 없는 이름이 카탈로그에 생겨도 조용히 빠질 뿐 화면은 안 깨진다.
 */
export const GENRE_CHOICE_NAMES: readonly string[] = [
  "액션",
  "어드벤처",
  "RPG",
  "시뮬레이션",
  "전략",
  "인디",
  "캐주얼",
  "퍼즐",
  "슈팅",
  "레이싱",
  "스포츠",
  "격투",
  "아케이드",
  "대규모 멀티플레이어",
  "파티",
  "보드",
  "음악",
];

/**
 * 장르 카드에만 쓰는 짧은 이름. 카탈로그 이름은 그대로 두고(목록, 설정, 결과 화면은 원래 이름) 좁은 카드에서만 줄인다 —
 * "대규모 멀티플레이어" 가 3열 카드(360 폭)에서 세 줄로 꺾여 혼자 카드 높이를 늘렸다(2026-10-08).
 */
export const GENRE_CARD_LABEL: Readonly<Record<string, string>> = {
  "대규모 멀티플레이어": "MMO",
};

/** 장르는 최대 몇 개까지. 넘으면 "전부 좋아함" 과 같아져 추천이 무의미해진다 */
export const GENRE_PICK_MAX = 5;

/**
 * 게임처럼 고르는 장치의 값(2026-10-08 사용자: "선택하는 것도 게임하듯이").
 * 성향과 플레이타임은 카드마다 도트 게이지를 단다 — 넷 중 몇 번째인지가 눈으로 비교된다(인내심 1~4칸, 길이 1~4칸).
 * 둘 다 선택지가 넷이라 칸 수도 4다. 선택지가 늘면 이 수와 아래 표를 같이 고친다.
 */
export const METER_MAX = 4;

export const DEAL_STYLE_PATIENCE: Record<DealStyle, number> = { full_price: 1, wait_small: 2, wait_deep: 3, historic_low: 4 };

export const PLAY_TIME_LENGTH: Record<PlayTimeStyle, number> = { short: 1, medium: 2, long: 3, endless: 4 };

/** 플랫폼 카드 그림 — 상표 대신 기기 모양으로 가른다(로고는 쓸 권리도 자산도 없다) */
export type PlatformShape = "pc" | "console" | "handheld";

/** 선택 카드 그림 종류. pass 는 구독 카드(티켓) — 구독은 기기가 아니라 "들고 있는 패스" 다 */
export type PickShape = PlatformShape | "pass";

export const PLATFORM_SHAPE: Partial<Record<Platform, PlatformShape>> = {
  steam: "pc",
  epic: "pc",
  ps5: "console",
  ps4: "console",
  xbox: "console",
  switch: "handheld",
  switch2: "handheld",
};
