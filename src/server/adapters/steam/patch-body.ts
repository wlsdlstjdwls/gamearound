// 패치 공지 **본문** 조회 — 한글 요약을 쓰기 위해서만 존재하는 경로다.
//
// 왜 수집 경로(index.ts 의 newsUrl)와 갈라 두나: 그쪽은 본문을 쓰지 않으므로 maxlength=1 로
// 잘라 받는다(§10 저작권, 응답 크기도 준다). 그 값을 여기서 풀면 매 수집이 본문을 끌고 오게 된다.
// 본문이 필요한 것은 "요약을 새로 쓰는 순간" 뿐이고, 그때도 **읽고 버린다** — 어디에도 저장하지 않는다.
//
// 2026-09-15 실측: 표본 30건의 본문이 평균 1,964자, 중앙값 769자, 최대 23,141자다.
// 한국 개발사 공지는 l=koreana 로 한글 본문이 그대로 오므로(팜소프트 확인) 요약을 만들 필요가 없다 —
// 그 판정은 호출부가 한다(scripts/patch-ko 의 hasHangul).
import { createHttpClient } from "../http";
import { STEAM_NEWS_COUNT, STEAM_NEWS_FEED, STEAM_NEWS_TAG, STEAM_NEWS_URL } from "./constants";

const http = createHttpClient({ source: "steam", label: "Steam" });

export interface SteamPatchBody {
  gid: string;
  title: string;
  /** 스토어가 준 본문 그대로. BBCode 가 섞여 있다 */
  contents: string;
}

/**
 * 한 게임의 최근 공지를 본문까지 받아 gid 로 찾을 수 있게 돌려준다.
 * 목록 조건(태그, 피드, 건수)은 수집 경로와 같은 상수를 쓴다 — 여기서만 다른 글이 잡히면
 * 요약이 붙지 않는 기록이 생긴다.
 */
export async function fetchSteamPatchBodies(appid: string): Promise<Map<string, SteamPatchBody>> {
  const u = new URL(STEAM_NEWS_URL);
  u.searchParams.set("appid", appid);
  u.searchParams.set("count", String(STEAM_NEWS_COUNT));
  // 0 = 자르지 않음. 이 파일이 존재하는 이유다
  u.searchParams.set("maxlength", "0");
  u.searchParams.set("feeds", STEAM_NEWS_FEED);
  u.searchParams.set("tags", STEAM_NEWS_TAG);
  // 한국 개발사 공지는 이 값으로 한글 본문이 온다. 대부분은 영어가 오지만 공짜로 걸리는 것은 받는다
  u.searchParams.set("l", "koreana");

  const raw = (await http.json(u.toString(), { context: `patch-body:${appid}` })) as {
    appnews?: { newsitems?: Array<{ gid?: unknown; title?: unknown; contents?: unknown }> };
  };
  const out = new Map<string, SteamPatchBody>();
  for (const item of raw.appnews?.newsitems ?? []) {
    const gid = typeof item.gid === "string" ? item.gid : null;
    if (!gid) continue;
    out.set(gid, {
      gid,
      title: typeof item.title === "string" ? item.title : "",
      contents: typeof item.contents === "string" ? item.contents : "",
    });
  }
  return out;
}
