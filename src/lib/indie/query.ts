// 인디 화면 주소 읽기, 만들기 — 목록 검색 범위(S-18)와 상세의 출처(S-19).
//
// 상세의 출처(?from=)는 경로 줄과 위쪽 메뉴 강조를 정한다(목업 mgDetail 의 S.mgf, secOf, subOf).
// 상세 주소 하나(/indie/<slug>)가 명예의 전당, 슈퍼루키, 등록현황, 내가 만든 게임 네 곳에서 열리는데, 목업은 들어온 곳의
// 메뉴를 켠 채로 둔다. 주소에 싣는 이유: 새로 고침, 링크 공유에도 같은 경로 줄이 서야 하고, 메뉴 띠(lib/nav 의 resolveNav)가
// 주소만 보고 칸을 정한다. 값이 없거나 모르는 값이면 기본(내가 만든 게임)이다 — 손으로 고친 주소가 화면을 깨지 않게.
// "use client" 파일이 아니다 — 서버 화면과 lib/nav 가 같이 읽는다(AGENTS 6장).
import { indiePath } from "@/lib/routes";

/** 상세 주소의 출처 이름 */
export const INDIE_FROM_PARAM = "from";
/** 출처 값. 기본(내가 만든 게임)은 값을 싣지 않는다 — 같은 화면이 같은 주소가 되게 */
export const INDIE_FROM = { hallOfFame: "hof", rookies: "rookies", mine: "mine" } as const;
export type IndieFrom = (typeof INDIE_FROM)[keyof typeof INDIE_FROM];
const FROM_VALUES: readonly string[] = Object.values(INDIE_FROM);

export function parseIndieFrom(raw: string | null | undefined): IndieFrom | null {
  return raw && FROM_VALUES.includes(raw) ? (raw as IndieFrom) : null;
}

/** 출처를 실은 상세 주소 */
export function indieDetailHref(slug: string, from?: IndieFrom | null): string {
  const path = indiePath(slug);
  return from ? `${path}?${new URLSearchParams({ [INDIE_FROM_PARAM]: from })}` : path;
}

/**
 * 목록 검색 범위(목업 bsbar 의 전체, 제목, 내용, 작성자). 작성자 자리는 개발사다 — 카드와 상세가 글쓴이 닉네임이 아니라
 * 적은 개발자 이름을 보여서, 사람이 화면에서 본 이름으로 찾게 한다. 내용은 한 줄 소개와 소개 본문이다.
 */
export const INDIE_SEARCH_SCOPES = ["all", "title", "body", "developer"] as const;
export type IndieSearchScope = (typeof INDIE_SEARCH_SCOPES)[number];
export const INDIE_SEARCH_SCOPE_PARAM = "scope";

export function parseIndieSearchScope(raw: string | null | undefined): IndieSearchScope {
  return (INDIE_SEARCH_SCOPES as readonly string[]).includes(raw ?? "") ? (raw as IndieSearchScope) : "all";
}
