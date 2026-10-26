// 수집 소스 이름표 한 곳. DB enum 값(steam, nintendo_jp)을 그대로 띄우면 밑줄과 소문자가 섞여 스토어 이름으로 안 읽힌다.
// 관리자 화면(수집 현황)과 공개 상세(정보 출처 칩)가 같이 쓴다 — 2026-10-26 상세 칩이 "steam, psstore" 를 그대로 띄워 한곳으로 뺐다.
// 공개 화면의 PLATFORM_LABEL(lib/format)과 따로 두는 이유는 축이 다르기 때문이다 —
// 저기는 "어느 기기로 파는가"(ps5, ps4 가 따로), 여기는 "어디서 긁어 오는가"(psstore 하나)다.

export const SOURCE_LABEL: Record<string, string> = {
  steam: "Steam",
  psstore: "PlayStation 스토어",
  xbox: "Xbox 스토어",
  nintendo: "닌텐도 한국",
  nintendo_jp: "닌텐도 일본",
  epic: "Epic Games",
  gamepass: "Game Pass",
  hltb: "HowLongToBeat",
  opencritic: "OpenCritic",
  metacritic: "Metacritic",
  wikidata: "위키데이터 (회사)",
  wikidata_game: "위키데이터 (게임)",
  rss: "공지 RSS",
  manual: "손으로 넣음",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}
