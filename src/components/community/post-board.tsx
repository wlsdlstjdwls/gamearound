// 게시판 목록 화면 한 벌(기획서 v2.0 5.2 "게시판 목록 공통", S-10A, S-11~13, S-17, S-20, S-21).
// 리뷰, 공략, 홍보, 전체 글, 라운지 글이 모두 이 틀을 쓰고 고를 카테고리와 주소만 다르다.
//
// 배치는 목업 bpage 를 따른다(2026-10-26 사용자: "목업과 최대한 동일하게"):
//   머리 — 제목, 아래 한 줄 설명, 오른쪽 "리뷰 작성" 같은 그 게시판 이름의 글쓰기 단추
//   왼쪽 — 폭이 좁은 보조 메뉴 판("게시판" 이름표, 전체 글과 카테고리별 글 수)
//   오른쪽 — 흰 판 하나: 머리 줄("리뷰 게시판 | 27개 글" + 검색), 탭 줄, 목록, 쪽 번호
// 머리 줄의 글 수와 목록은 같은 질의를 본다 — cache 로 한 요청 안에서 한 번만 묻는다(Neon 왕복은 비싸다).
import Link from "next/link";
import { cache, Suspense } from "react";
import { BoardControls } from "@/components/community/board-controls";
import { BoardSideLinks } from "@/components/community/board-side-links";
import { PostList } from "@/components/community/post-list";
import { PromoPins } from "@/components/promo/promo-pins";
import { WriteLink } from "@/components/community/write-link";
import { BoardGuide } from "@/components/lounge/board-guide";
import { DbUnavailable } from "@/components/db-unavailable";
import { Pagination } from "@/components/pagination";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead, PageLead } from "@/components/ui/page";
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH, isLoungeCategory, POPULAR_PERIOD_LABEL, POSTS_PAGE_SIZE, writePath } from "@/lib/community/constants";
import { BOARD_PAGE_COPY, COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { boardHref, type BoardQuery } from "@/lib/community/query";
import { BOARD_GUIDE_MESSAGES as G } from "@/lib/lounge/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import type { PostCategory } from "@/server/db/schema";
import type { Featured, PromoPinDto } from "@/server/services/promotions";
import { getBoardHome, listPosts } from "@/server/services/community";

type Props = {
  title: string;
  /** 이 화면이 보여 주는 카테고리. 하나면 그 게시판, 여럿이면 "전체 글" */
  categories: readonly PostCategory[];
  /** 왼쪽 보조 메뉴에 세울 카테고리(게시판 셋 또는 라운지 둘) */
  family: readonly PostCategory[];
  allPath: string;
  base: string;
  query: BoardQuery;
  /**
   * 보조 메뉴 판 맨 아래. 없으면 게임 게시판의 "게시판 이용 안내"(이용 규칙만)가 선다 — 목업 bside 는 두 게시판 모두 이 줄로 끝난다.
   * 라운지는 등록 흐름까지 붙인 같은 시트를 넘긴다(components/lounge/lounge-board)
   */
  sideFoot?: React.ReactNode;
  /**
   * 목록 위 유료 고정 줄(2026-10-27, 홍보 게시판, services/promotions). 아무 조건 없이 첫 쪽을 볼 때만 선다 —
   * 검색, 인기글, 유형 거름 결과 위에 고정 글이 서면 고른 조건과 상관없는 글이 맨 위에 끼어든다
   */
  pinned?: Promise<Array<Featured<PromoPinDto>>>;
  /** 메뉴 띠의 칸 화면(라운지 게시판)이면 좁은 화면에서 제목을 감춘다(ui/page 의 PageHead menuScreen). 게임 게시판은 메뉴에서 걷어 띠가 없다 */
  menuScreen?: boolean;
};

/**
 * 목록 질의 한 번. 머리 줄 글 수와 목록이 같은 결과를 나눠 쓴다(요청 하나 안에서만 산다).
 * cache 는 인자를 === 로 맞춘다 — 두 자리 모두 PostBoard 가 받은 같은 배열, 같은 query 객체를 넘기므로 한 번만 돈다.
 */
const loadPage = cache((categories: readonly PostCategory[], query: BoardQuery) =>
  nullIfDbUnavailable(
    listPosts({ categories, q: query.q, scope: query.scope, tab: query.tab, period: query.period, page: query.page, promoType: query.type, gameSlug: query.game }),
  ),
);

async function SideMenu({ family, allPath, current }: { family: readonly PostCategory[]; allPath: string; current: string }) {
  const home = await nullIfDbUnavailable(getBoardHome(family, [], false));
  const counts = home?.counts ?? {};
  const total = family.reduce((n, c) => n + (counts[c] ?? 0), 0);
  const items = [{ href: allPath, label: M.allPosts, count: total }, ...family.map((c) => ({ href: CATEGORY_LIST_PATH[c], label: CATEGORY_LABEL[c], count: counts[c] ?? 0 }))];
  return <BoardSideLinks items={items} current={current} />;
}

/** 게임 거름 딱지의 말. 이 화면 한 곳에서만 쓴다(게임 상세의 "이 게임 글" 링크가 건 거름) */
const GAME_FILTER_LABEL = (title: string) => `${title} 글만`;
const GAME_FILTER_CLEAR = "거름 풀기";

/** 판 머리 줄 왼쪽 — "리뷰 게시판 | 27개 글". 검색 중이면 그 결과 수를 말한다. 게임으로 걸렀으면 그 게임 딱지와 푸는 링크 */
async function BoardCount({ categories, query, head, base }: { categories: readonly PostCategory[]; query: BoardQuery; head: string; base: string }) {
  const page = await loadPage(categories, query);
  // 게임 이름은 글 줄이 이미 들고 온다(PostRowDto.game) — 이름 하나 때문에 왕복을 더하지 않는다
  const gameTitle = query.game ? (page?.items.find((i) => i.game)?.game?.title ?? query.game) : null;
  return (
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">{head}</span>
      {page && <span className="text-[13px] text-dim">{query.q ? M.searchResult(query.q, page.total) : M.postCount(page.total)}</span>}
      {gameTitle && (
        <span className="inline-flex items-center gap-2 rounded-full bg-acc-soft px-3 py-1 text-[12.5px] font-bold text-acc">
          {GAME_FILTER_LABEL(gameTitle)}
          <Link href={boardHref(base, query, { game: null })} className="press font-semibold text-mut underline-offset-2 hover:text-acc hover:underline">
            {GAME_FILTER_CLEAR}
          </Link>
        </span>
      )}
    </p>
  );
}

/** 고정 줄을 세울 화면인가 — 거름 없는 첫 쪽(Props.pinned 주석) */
function isPlainFirstPage(q: BoardQuery): boolean {
  return !q.q && !q.game && !q.type && q.tab === "all" && q.page === 1;
}

async function Results({ categories, base, query, pinned }: { categories: readonly PostCategory[]; base: string; query: BoardQuery; pinned?: Promise<Array<Featured<PromoPinDto>>> }) {
  const [page, pins] = await Promise.all([loadPage(categories, query), pinned && isPlainFirstPage(query) ? pinned.catch(() => []) : []]);
  if (!page) return <DbUnavailable retryHref={base} />;
  const empty = query.q
    ? { title: M.emptySearch, description: M.emptySearchLead }
    : query.tab === "popular"
      ? { title: M.emptyPeriod, description: M.emptyPeriodLead }
      : { title: M.emptyTitle, description: M.emptyLead, action: { href: writePath(categories.length === 1 ? categories[0] : undefined), label: M.write } };
  return (
    <>
      <PendingRegion>
        {pins.length > 0 && <PromoPins pins={pins} />}
        <PostList bare posts={page.items} rank={query.tab === "popular"} rankFrom={(page.page - 1) * POSTS_PAGE_SIZE + 1} empty={empty} />
      </PendingRegion>
      <Pagination page={page.page} totalPages={page.totalPages} hrefFor={(n) => boardHref(base, query, { page: n })} />
    </>
  );
}

export function PostBoard({ title, categories, family, allPath, base, query, sideFoot, pinned, menuScreen = false }: Props) {
  const single = categories.length === 1 ? categories[0] : undefined;
  const copy = BOARD_PAGE_COPY[single ?? (isLoungeCategory(family[0]) ? "loungeAll" : "boardAll")];
  const head = single ? `${CATEGORY_LABEL[single]} ${M.boardHeadSuffix}` : M.allPostsHead;
  return (
    <Page gap={20}>
      <PageHead menuScreen={menuScreen} leadRow title={title} action={<WriteLink href={writePath(single)} size={menuScreen ? "head" : "md"}>{copy.write}</WriteLink>}>
        {/* 메뉴 화면(라운지)만 좁은 폭에서 단추와 한 줄로 서며 한 줄로 잘린다. 게임 게시판은 예전 그대로 문단이다 */}
        {menuScreen ? <PageLead>{copy.lead}</PageLead> : <p className="text-[14px] text-mut">{copy.lead}</p>}
      </PageHead>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-5">
        {/* 메뉴 화면(라운지)의 좁은 폭은 판 두 겹을 걷는다(2026-11-20 사용자 "각 게시판도 UI/UX 개선"). 보조 메뉴 판과 목록 판이 흰 판 두 장으로 쌓이고
            판 안에 판 이름, 검색, 탭이 또 서서 목록이 첫 화면 아래로 밀렸다. 보조 메뉴는 판 없는 칩 한 줄(위 띠에 없는 "전체 글" 과 글 수를 쥔다),
            목록은 페이지 바탕에 바로 선다. 이용 안내 줄은 맨 아래 각주 곁으로 내린다 */}
        <nav
          aria-label={M.boardSideLabel}
          className={cn(
            "min-w-0 rounded-[var(--radius-md)] bg-surface p-2 shadow-hair lg:sticky lg:top-[calc(var(--header-h)+16px)]",
            menuScreen && "max-sm:-mx-1 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none",
          )}
        >
          <p className="hidden px-3 pb-1.5 pt-2 text-[11.5px] font-bold tracking-[0.06em] text-dim lg:block">{M.boardSideLabel}</p>
          <Suspense fallback={<Bone className="h-10 w-full" />}>
            <SideMenu family={family} allPath={allPath} current={base} />
          </Suspense>
          <div className={cn(menuScreen && "max-sm:hidden")}>{sideFoot ?? <BoardGuide label={G.open} variant="menu" lounge={false} />}</div>
        </nav>
        <NavPendingScope>
          <section
            aria-label={head}
            className={cn("flex min-w-0 flex-col gap-4 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair sm:p-5", menuScreen && "max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none")}
          >
            {/* 검색 초기화로 주소의 검색어가 비면 입력칸도 비어야 한다 — 검색어마다 새로 세운다 */}
            <BoardControls
              key={query.q}
              base={base}
              query={query}
              promoTabs={single === "promo"}
              phoneLight={menuScreen}
              popularLead={query.tab === "popular" ? M.popularLead(POPULAR_PERIOD_LABEL[query.period]) : null}
              head={
                <Suspense key={JSON.stringify(query)} fallback={<span className="text-[15px] font-extrabold text-ink">{head}</span>}>
                  <BoardCount categories={categories} query={query} head={head} base={base} />
                </Suspense>
              }
            />
            <Suspense key={JSON.stringify(query)} fallback={<Bone className="h-[480px] w-full" />}>
              <Results categories={categories} base={base} query={query} pinned={pinned} />
            </Suspense>
          </section>
        </NavPendingScope>
      </div>
      {/* 메뉴 화면은 라운지 게시판뿐이라 라운지 안내 시트를 연다(lounge-board 의 sideFoot 과 같은 시트). 판이 없는 자리라 글자 링크 모양이다 */}
      {menuScreen && <div className="sm:hidden"><BoardGuide label={G.open} variant="link" /></div>}
      <p className="text-[12px] text-dim">{M.boardFootnote}</p>
    </Page>
  );
}
