// 게시판 목록 화면 한 벌(기획서 v2.0 5.2 "게시판 목록 공통", S-10A, S-11~13, S-17, S-20, S-21).
// 리뷰, 공략, 홍보, 전체 글, 라운지 글이 모두 이 틀을 쓰고 고를 카테고리와 주소만 다르다.
// 왼쪽은 폭이 좁은 보조 메뉴(전체 글, 카테고리별 글 수), 오른쪽은 고르는 줄 + 목록 + 쪽 번호다.
import Link from "next/link";
import { Suspense } from "react";
import { BoardControls } from "@/components/community/board-controls";
import { PostList } from "@/components/community/post-list";
import { DbUnavailable } from "@/components/db-unavailable";
import { Pagination } from "@/components/pagination";
import { buttonClass } from "@/components/ui/button";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { boardHref, type BoardQuery } from "@/lib/community/query";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import type { PostCategory } from "@/server/db/schema";
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
};

async function SideMenu({ family, allPath, current }: { family: readonly PostCategory[]; allPath: string; current: string }) {
  const home = await nullIfDbUnavailable(getBoardHome(family, [], false));
  const counts = home?.counts ?? {};
  const total = family.reduce((n, c) => n + (counts[c] ?? 0), 0);
  const item = (href: string, label: string, n: number) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={href === current ? "page" : undefined}
        className={cn("flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-[13.5px] transition-colors", href === current ? "bg-acc-soft font-semibold text-acc" : "text-mut hover:bg-surface-2 hover:text-ink")}
      >
        <span>{label}</span>
        <span className="tabular-nums text-[12px] text-dim">{n.toLocaleString("ko-KR")}</span>
      </Link>
    </li>
  );
  return (
    <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col">
      {item(allPath, M.allPosts, total)}
      {family.map((c) => item(CATEGORY_LIST_PATH[c], CATEGORY_LABEL[c], counts[c] ?? 0))}
    </ul>
  );
}

async function Results({ categories, base, query }: { categories: readonly PostCategory[]; base: string; query: BoardQuery }) {
  const page = await nullIfDbUnavailable(
    listPosts({ categories, q: query.q, scope: query.scope, tab: query.tab, period: query.period, page: query.page, promoType: query.type }),
  );
  if (!page) return <DbUnavailable retryHref={base} />;
  const empty = query.q
    ? { title: M.emptySearch, description: M.emptySearchLead }
    : query.tab === "popular"
      ? { title: M.emptyPeriod, description: M.emptyPeriodLead }
      : { title: M.emptyTitle, description: M.emptyLead, action: { href: writePath(categories.length === 1 ? categories[0] : undefined), label: M.write } };
  return (
    <>
      <PendingRegion>
        <PostList posts={page.items} rank={query.tab === "popular"} showCategory={categories.length > 1} empty={empty} />
      </PendingRegion>
      <Pagination page={page.page} totalPages={page.totalPages} hrefFor={(n) => boardHref(base, query, { page: n })} />
    </>
  );
}

export function PostBoard({ title, categories, family, allPath, base, query }: Props) {
  return (
    <Page gap={20}>
      <PageHead
        title={title}
        action={
          <Link href={writePath(categories.length === 1 ? categories[0] : undefined)} className={buttonClass({ size: "md" })}>
            {M.write}
          </Link>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label={M.allPosts} className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <Suspense fallback={<Bone className="h-10 w-full" />}>
            <SideMenu family={family} allPath={allPath} current={base} />
          </Suspense>
        </nav>
        <NavPendingScope>
          <div className="flex min-w-0 flex-col gap-4">
            {/* 검색 초기화로 주소의 검색어가 비면 입력칸도 비어야 한다 — 검색어마다 새로 세운다 */}
            <BoardControls key={query.q} base={base} query={query} promoTabs={categories.length === 1 && categories[0] === "promo"} />
            <Suspense key={JSON.stringify(query)} fallback={<Bone className="h-[480px] w-full" />}>
              <Results categories={categories} base={base} query={query} />
            </Suspense>
          </div>
        </NavPendingScope>
      </div>
    </Page>
  );
}
