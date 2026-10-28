// 서비스 메뉴 단일 원천 — 상단 메뉴 넷과 메뉴마다의 하위 메뉴 띠(기획서 v2.0 3.1).
// 머리띠(넓은 화면), 하위 메뉴 띠, 좁은 화면의 메뉴 시트가 모두 이 표를 읽는다. 세 곳이 따로 들고 있으면
// 이름, 순서가 반드시 한 군데 어긋난다(옛 site-header 와 site-menu 가 그랬다).
//
// "use client" 파일이 아니다 — 서버 컴포넌트도 이 상수를 읽는다(AGENTS.md 6장, 2026-10-12 푸터 사고).
//
// 이름, 순서는 기획서 표를 그대로 따르되 가운뎃점만 쉼표로 바꿨다. "질문/피드백" 은 사용자 지정(2026-10-28).
// 아직 화면이 없는 칸(게시판, 라운지, 명예의 전당, 슈퍼루키)도 메뉴에는 선다 — 누르면 "준비 중" 화면이다.
import { gamesHref } from "@/lib/games-query";
import { INDIE_FROM, INDIE_FROM_PARAM } from "@/lib/indie/query";
import { ROUTES } from "@/lib/routes";

/** 게임 게시판 글쓰기 화면(app/(user)/board/write). 경로 표시와 칸 켜기가 같은 값을 본다 */
const BOARD_WRITE_PATH = `${ROUTES.board}/write`;

export type NavSub = {
  label: string;
  href: string;
  /**
   * 경로가 같은 칸끼리 가르는 주소 조건. "할인 게임" 은 /games 에 sale=1 이 선 화면이라,
   * 경로만 보면 "전체 게임" 과 구별이 안 된다. 정렬은 조건에 넣지 않는다 — 할인 게임에서 정렬을 바꿔도 할인 게임이다
   */
  query?: Record<string, string>;
  /**
   * 경로가 달라도 이 칸을 켜는 화면(정확히 그 경로일 때만). 라운지 전체 글(/lounge/all)은 메뉴에 칸이 없지만
   * 목업(subOf lga, lgPage)이 "라운지 홈" 을 켜고 경로를 "개발자 라운지 > 라운지 홈" 으로 세운다 — 홈의 "전체 글 보기" 로 들어오는 화면이라서다
   */
  aliases?: readonly string[];
  /**
   * 경로와 주소 조건이 함께 맞으면 이 칸을 켜는 화면. 글쓰기(/board/write?category=review)는 게시판마다 주소가 따로 없지만
   * 목업(wpage 의 crumb3)이 "게임 게시판 > 리뷰 > 글쓰기" 로 고른 게시판을 켠다. 글쓰기 화면이 카테고리를 바꾸면 주소 조건도 따라 바꾼다
   */
  aliasQueries?: readonly { path: string; query: Record<string, string> }[];
  /**
   * parent 바로 아래 한 칸(<parent>/<id>)이 주소 조건까지 맞으면 이 칸을 켠다. 인디 상세(/indie/<slug>)는 주소가 하나인데
   * 목업(mgDetail 의 S.mgf, secOf, subOf)은 들어온 곳(명예의 전당, 슈퍼루키, 등록현황)의 칸을 켠다 — 출처는 ?from= 이다(lib/indie/query)
   */
  childQueries?: readonly { parent: string; query: Record<string, string> }[];
  /**
   * <parent>/<id>/<leaf> 꼴 화면을 이 칸에 붙인다. 광고 걸기(/indie/mine/<id>/boost)는 내 게임 통계 화면의 단추로만 들어오는데,
   * 이 규칙이 없으면 /indie/mine 아래라 가장 긴 경로 규칙에 따라 "등록현황" 이 켜진다
   */
  childLeaves?: readonly { parent: string; leaf: string }[];
  /**
   * 로그인한 사람 자신의 화면(내 게임 관리). 띠에서 공개 칸 뒤에 가는 선을 두고 따로 묶는다 —
   * 남의 글을 읽는 자리와 내 것을 관리하는 자리가 한 줄에서 구별되게 한다(2026-10-28 메뉴 정리)
   */
  mine?: boolean;
  /**
   * 띠에 세우지 않는 칸. 경로 줄("게임 게시판 > 리뷰")과 칸 켜기 규칙에는 그대로 쓴다.
   * 게시판의 리뷰, 공략, 홍보와 라운지의 개발일지, 질문/피드백은 홈의 현황 칸과 목록 화면 옆 메뉴가 같은 길을 낸다 — 띠에도 서면 같은 길이 셋이었다(2026-10-28 사용자)
   */
  hideInBand?: boolean;
};

export type NavSection = {
  key: "explore" | "indie" | "board" | "lounge" | "account";
  label: string;
  /** 메뉴를 누르면 열리는 화면 = 첫 하위 칸(기획서 3.1) */
  href: string;
  subs: NavSub[];
  /**
   * 하위 칸 밖이지만 이 메뉴 소속인 경로(상세, 검색 등). "상세 화면에서도 소속 메뉴를 유지" 한다(기획서 4.3)
   */
  also?: string[];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    key: "explore",
    label: "게임 탐색",
    href: ROUTES.game,
    subs: [
      { label: "전체 게임", href: ROUTES.game },
      { label: "출시 예정", href: ROUTES.upcoming },
      { label: "할인 게임", href: gamesHref({}, { onSale: true, sort: "discount" }), query: { sale: "1" } },
    ],
    also: [ROUTES.search, ROUTES.sales, ROUTES.news, "/companies"],
  },
  {
    key: "indie",
    label: "인디 게임",
    href: ROUTES.hallOfFame,
    subs: [
      { label: "명예의 전당", href: ROUTES.hallOfFame, childQueries: [{ parent: ROUTES.indie, query: { [INDIE_FROM_PARAM]: INDIE_FROM.hallOfFame } }] },
      { label: "슈퍼루키", href: ROUTES.rookies, childQueries: [{ parent: ROUTES.indie, query: { [INDIE_FROM_PARAM]: INDIE_FROM.rookies } }] },
      // 공개된 인디 게임 전체(/indie). 라운지에 "내가 만든 게임" 으로 서 있었지만 남의 게임도 들어 있는 목록이라
      // 인디 게임 메뉴와 겹쳤다 — 한 칸으로 합쳐 여기 둔다(2026-10-28 메뉴 정리, 사용자: "중복되는 것들 통폐합")
      { label: "전체 인디 게임", href: ROUTES.indie },
      { label: "플레이테스트", href: ROUTES.playtests },
    ],
  },
  {
    key: "board",
    label: "게임 게시판",
    href: ROUTES.board,
    subs: [
      // 전체 글(/board/all)은 칸이 없지만 목업(rbPage rha)이 "게시판 홈" 을 켠다 — 라운지 전체 글과 같은 자리다
      { label: "게시판 홈", href: ROUTES.board, aliases: [ROUTES.boardAll] },
      // 글쓰기의 category 값은 posts.category 갈래 이름이다(lib/community/constants 의 writePath)
      { label: "리뷰", href: ROUTES.boardReviews, hideInBand: true, aliasQueries: [{ path: BOARD_WRITE_PATH, query: { category: "review" } }] },
      { label: "공략", href: ROUTES.boardGuides, hideInBand: true, aliasQueries: [{ path: BOARD_WRITE_PATH, query: { category: "guide" } }] },
      { label: "홍보", href: ROUTES.boardPromos, hideInBand: true, aliasQueries: [{ path: BOARD_WRITE_PATH, query: { category: "promo" } }] },
    ],
  },
  {
    key: "lounge",
    label: "개발자 라운지",
    href: ROUTES.lounge,
    subs: [
      { label: "라운지 홈", href: ROUTES.lounge, aliases: [ROUTES.loungeAll] },
      // 개발일지, 질문/피드백은 라운지 홈의 글 현황 칸과 목록 옆 메뉴가 길을 낸다 — 게시판의 리뷰, 공략, 홍보와 같은 이유로 띠에서 뺀다(2026-10-28 사용자)
      { label: "개발일지", href: ROUTES.loungeDevlogs, hideInBand: true },
      { label: "질문/피드백", href: ROUTES.loungeQna, hideInBand: true },
      // 등록현황(/indie/mine)과 내 게임 통계(/indie/mine/stats)는 한 칸이다(2026-10-28 메뉴 정리). 둘 다 내 게임을 돌보는 화면이라
      // 띠에 따로 서면 같은 일이 두 칸이었다. 두 화면 사이는 머리의 탭(components/indie/mine-tabs)으로 오간다.
      // 통계, 플레이테스트 관리, 광고 걸기, 요금, 결제는 모두 /indie/mine 아래라 가장 긴 경로 규칙으로 이 칸이 켜진다
      { label: "내 게임 관리", href: ROUTES.indieMine, mine: true, childQueries: [{ parent: ROUTES.indie, query: { [INDIE_FROM_PARAM]: INDIE_FROM.mine } }] },
    ],
  },
];

/**
 * 내 정보 화면 묶음 — 상단 메뉴 넷에는 없고 사용자 메뉴(드롭다운)로 들어오는 화면들.
 * 하위 메뉴 띠만 세운다(2026-10-27, 사용자: "어떤 화면에 들어가면 상세 메뉴가 안 보인다"). 내 활동, 찜, 알림, 설정이
 * 서로 오갈 길 없이 혼자 떠 있었다. 상단 메뉴에는 올리지 않는다 — NAV_SECTIONS 에 넣으면 머리띠와 바닥 탭바에 칸이 생긴다.
 * 순서는 사용자 메뉴(auth/user-menu)와 같다.
 */
export const ACCOUNT_SECTION: NavSection = {
  key: "account",
  label: "내 정보",
  href: ROUTES.me,
  subs: [
    { label: "내 활동", href: ROUTES.me },
    { label: "찜 목록", href: ROUTES.wishlist },
    { label: "가격 알림", href: ROUTES.alerts },
    { label: "설정", href: ROUTES.settings },
  ],
};

/** 화면 위 "이전 화면" 줄(components/page-trail)의 문구 */
export const NAV_TRAIL_MESSAGES = {
  back: "이전 화면",
  crumbLabel: "현재 위치",
} as const;

/**
 * 메뉴 칸 없이 들어오는 화면이라 "이전 화면" 을 세우는 곳. 광고, 멤버십 화면 넷은 등록현황, 통계, 내 게임 상세에서 들어오고(10-28),
 * 댓글함은 라운지 홈 현황 칸에서 들어온다 — 띠에 제 칸이 없으니 되돌아가기가 곧 길이다.
 * 계정 화면(내 활동, 찜, 알림, 설정)은 10-28 뺐다 — 내 정보 띠(ACCOUNT_SECTION)가 서서 칸끼리 오간다.
 */
export const TRAIL_BACK_ONLY_PATHS: readonly string[] = [ROUTES.makerPlans, ROUTES.membership, ROUTES.indieAds, ROUTES.indiePayments, ROUTES.loungeComments];

/**
 * 바로 아래 한 칸(<부모>/<id>)에 "이전 화면" 만 세우는 화면. 인디 상세는 끝 낱말(게임 이름)이 데이터라 경로 줄은 화면이 직접 그리고
 * (app/(public)/indie/[slug]), 되돌아가기만 여기서 선다 — 목업은 상세에도 "이전 화면" 을 둔다
 */
export const TRAIL_BACK_ONLY_UNDER: readonly string[] = [ROUTES.indie];

/**
 * 경로 표시를 세우지 않는 메뉴. 게임 탐색의 세 칸은 목업도 "이전 화면" 만 둔다 — 하위 메뉴 띠가 바로 위에서 같은 말을 한다.
 * 다른 메뉴는 목업대로 "메뉴 이름 > 칸 이름" 을 세운다.
 */
export const TRAIL_NO_CRUMB_SECTIONS: ReadonlySet<NavSection["key"]> = new Set(["explore"]);

/**
 * 하위 칸 아래지만 경로 줄을 세우는 화면과 그 끝 낱말(목업 indreg "개발자 라운지 > 내가 만든 게임 > 내 게임 등록", 글쓰기).
 * 다른 하위 화면(상세, 고치기)은 제 되돌아가기 링크를 갖고 있어 경로 줄을 세우지 않는다 — 두 줄이 같은 말을 한다.
 */
export const TRAIL_LEAF_LABEL: Readonly<Record<string, string>> = {
  [ROUTES.indieNew]: "내 게임 등록",
  [BOARD_WRITE_PATH]: "글쓰기",
  [`${ROUTES.lounge}/write`]: "글쓰기",
};

/**
 * 목록 아래 상세 화면 중 경로 줄을 세우는 것 — <목록>/<segment>/<id> 꼴. 게임 게시판 글 상세(목업 postv 의
 * "게임 게시판 > 리뷰 > 게시글")가 여기 선다. 상세 주소가 제 게시판 아래라(lib/community/constants 의 postPath)
 * 띠와 경로가 같은 칸을 켠다. 라운지 글(/lounge/p/<id>)은 주소에 게시판이 없어 아직 넣지 않았다.
 */
export const TRAIL_LEAF_UNDER: readonly { parents: readonly string[]; segment: string; label: string }[] = [
  { parents: [ROUTES.boardReviews, ROUTES.boardGuides, ROUTES.boardPromos], segment: "p", label: "게시글" },
];

/** 경로 줄 끝 낱말. 정해진 화면이 아니면 null */
export function trailLeaf(pathname: string): string | null {
  const exact = TRAIL_LEAF_LABEL[pathname];
  if (exact) return exact;
  for (const rule of TRAIL_LEAF_UNDER) {
    for (const parent of rule.parents) {
      const rest = pathname.startsWith(`${parent}/${rule.segment}/`) ? pathname.slice(parent.length + rule.segment.length + 2) : "";
      // 바로 아래 한 칸(<id>)만 — 더 깊은 경로(고치기 등)는 제 화면이 따로 정한다
      if (rest !== "" && !rest.includes("/")) return rule.label;
    }
  }
  return null;
}

/**
 * 경로 줄을 세울 화면인가 — 끝 낱말이 정해진 화면(글쓰기, 게시글, 내 게임 등록), 띠에 칸이 없는 화면과 인디 상세(되돌아가기만).
 * 하위 칸 그 자체(명예의 전당, 내 게임 관리 등)에는 세우지 않는다(2026-10-28 사용자: "이전 화면 버튼이 필요한가, 빵가루도 필요한가").
 * 바로 위 띠가 켠 칸이 "개발자 라운지 > 내 게임 관리" 를 이미 말하고, 띠의 다른 칸이 곧 돌아갈 길이라 한 줄이 같은 말을 두 번 했다.
 * 칸 화면이 인디 상세 규칙(/indie/<한 칸>)에 걸리는 경우(/indie/mine)도 칸이 이긴다
 */
export function trailKind(pathname: string, sub: NavSub | null): "leaf" | "back" | null {
  if (trailLeaf(pathname)) return "leaf";
  if (TRAIL_BACK_ONLY_PATHS.includes(pathname)) return "back";
  if (sub && (pathname === pathOf(sub.href) || sub.aliases?.includes(pathname))) return null;
  return TRAIL_BACK_ONLY_UNDER.some((parent) => childOf(pathname, parent)) ? "back" : null;
}

/** parent 바로 아래 한 칸인가(/indie/abc 는 맞고 /indie, /indie/mine/abc 는 아니다) */
function childOf(pathname: string, parent: string): boolean {
  const rest = pathname.startsWith(`${parent}/`) ? pathname.slice(parent.length + 1) : "";
  return rest !== "" && !rest.includes("/");
}

/** <parent>/<id>/<leaf> 인가(/indie/mine/abc/boost 는 맞고 /indie/mine/boost, /indie/mine/a/b/boost 는 아니다) */
function leafOf(pathname: string, parent: string, leaf: string): boolean {
  const tail = `/${leaf}`;
  return pathname.endsWith(tail) && childOf(pathname.slice(0, -tail.length), parent);
}

function pathOf(href: string): string {
  const q = href.indexOf("?");
  return q === -1 ? href : href.slice(0, q);
}

function under(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

type Query = { get(name: string): string | null };

/**
 * 지금 주소가 어느 메뉴의 어느 칸인지. 칸이 여럿 맞으면 경로가 긴 쪽, 같으면 주소 조건까지 맞는 쪽이 이긴다
 * (/indie/mine 은 "전체 인디 게임"(/indie)과 "내 게임 관리"(/indie/mine) 둘 다에 걸린다).
 * 소속 메뉴는 있지만 칸이 없는 화면(게임 상세)은 sub 가 null 이다 — 띠는 서되 아무 칸도 켜지 않는다.
 */
export function resolveNav(pathname: string, query: Query): { section: NavSection | null; sub: NavSub | null } {
  // 별칭은 정확히 그 경로일 때만 맞고, 맞으면 다른 규칙보다 앞선다(첫 칸 상세 규칙에 걸려 칸이 꺼지지 않게)
  // 주소 조건 별칭(글쓰기의 category)도 같은 자리에서 본다 — 글쓰기는 게시판 홈(/board) 아래라 첫 칸 규칙에 걸려 꺼진다
  for (const section of NAV_SECTIONS) {
    const matches = (q: Record<string, string>) => Object.entries(q).every(([k, v]) => query.get(k) === v);
    const sub = section.subs.find(
      (s) =>
        s.aliases?.includes(pathname) ||
        s.aliasQueries?.some((a) => a.path === pathname && matches(a.query)) ||
        s.childQueries?.some((c) => childOf(pathname, c.parent) && matches(c.query)) ||
        s.childLeaves?.some((c) => leafOf(pathname, c.parent, c.leaf)),
    );
    if (sub) return { section, sub };
  }
  let best: { section: NavSection; sub: NavSub; score: number } | null = null;
  for (const section of NAV_SECTIONS) {
    for (const sub of section.subs) {
      const path = pathOf(sub.href);
      if (!under(pathname, path)) continue;
      const conds = Object.entries(sub.query ?? {});
      if (conds.some(([k, v]) => query.get(k) !== v)) continue;
      const score = path.length * 10 + conds.length;
      if (!best || score > best.score) best = { section, sub, score };
    }
  }
  if (best) {
    // 첫 칸(전체 게임 /games, 게시판 홈 /board, 라운지 홈 /lounge)은 메뉴의 뿌리라 그 아래 상세(/games/<slug>, /board/p/<id>)까지 걸린다.
    // 그때 첫 칸이 켜지면 목록이나 홈에 있는 것처럼 읽혀서, 첫 칸은 정확히 그 경로일 때만 켠다
    const rootDetail = best.sub === best.section.subs[0] && pathname !== pathOf(best.sub.href);
    return { section: best.section, sub: rootDetail ? null : best.sub };
  }
  const section = NAV_SECTIONS.find((s) => s.also?.some((p) => under(pathname, p))) ?? null;
  if (section) return { section, sub: null };
  // 내 정보 묶음은 메뉴 넷 다음에 본다 — 칸 경로가 메뉴 넷과 겹치지 않아 순서가 결과를 바꾸지는 않는다
  const mine = ACCOUNT_SECTION.subs.filter((s) => under(pathname, pathOf(s.href))).sort((a, b) => b.href.length - a.href.length)[0];
  return mine ? { section: ACCOUNT_SECTION, sub: mine } : { section: null, sub: null };
}
