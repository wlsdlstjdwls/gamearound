// 장르 이름 정규화 — 소스가 어느 나라 말로 주든 우리 화면에는 한국어 한 벌만 남긴다.
//
// 왜 필요한가: 일본 eShop 을 붙이면서 "アクション", "ロールプレイング" 이 그대로 저장돼
// 목록 필터에 "액션" 과 "アクション" 이 나란히 섰다(2026-09-14 실측). 같은 장르인데 칩이 둘이면
// 어느 쪽을 눌러도 게임의 절반만 보인다.
//
// 번역이 아니라 **우리 어휘로의 매핑**이다. 새 값은 한국어 쪽 이름에 맞춰 넣는다 —
// 우리가 이미 쓰고 있는 이름(스팀에서 들어온 것)이 기준이라 "ロールプレイング" 은 "롤플레잉" 이 아니라 "RPG" 다.

/** 일본어 장르 → 우리 어휘. 닌텐도 일본 eShop 이 주는 표기 기준(2026-09-14) */
const GENRE_ALIASES: Record<string, string> = {
  アクション: "액션",
  アドベンチャー: "어드벤처",
  ロールプレイング: "RPG",
  シミュレーション: "시뮬레이션",
  ストラテジー: "전략",
  パズル: "퍼즐",
  アーケード: "아케이드",
  スポーツ: "스포츠",
  レース: "레이싱",
  シューティング: "슈팅",
  格闘: "격투",
  パーティー: "파티",
  テーブル: "보드",
  コミュニケーション: "커뮤니케이션",
  音楽: "음악",
  学習: "학습",
  実用: "유틸리티",
  トレーニング: "트레이닝",
  その他: "기타",
};

/** 저장 직전에 한 번 거친다. 모르는 이름은 그대로 둔다 — 임의로 버리면 새 장르가 영영 안 생긴다 */
export function normalizeGenre(name: string): string {
  const t = name.trim();
  return GENRE_ALIASES[t] ?? t;
}

/**
 * 장르 칸에 섞여 들어오는 판매 형태 — 장르가 아니라 꼬리표로 따로 보인다(2026-10-27, 사용자: "그래 구분하자").
 * 스팀 태그 113(무료 플레이), 493(앞서 해보기)를 발견 슬라이스로 쓰느라 수집이 장르 행으로 저장한다
 * (adapters/steam/constants 의 STEAM_GENRE_TAG_IDS). 수집은 그대로 두고 화면 계약에서 가른다 —
 * 저장을 바꾸면 이미 쌓인 행을 옮기는 일이 따로 생기고, "앞서 해보기만 보기" 같은 거르기 길도 그 행에 기대고 있다.
 * 장르 칩, 카드 장르 줄에서는 빠지고 카드 꼬리표로 선다.
 */
export const GENRE_TAG_NAMES: readonly string[] = ["무료 플레이", "앞서 해보기"];

export function isGenreTag(name: string): boolean {
  return GENRE_TAG_NAMES.includes(name);
}

/** 이름 목록을 장르와 꼬리표로 가른다. 순서는 받은 그대로 둔다(정렬은 부르는 쪽 몫) */
export function splitGenreTags(names: readonly string[]): { genres: string[]; tags: string[] } {
  const genres: string[] = [];
  const tags: string[] = [];
  for (const n of names) (isGenreTag(n) ? tags : genres).push(n);
  return { genres, tags };
}
