// 뉴스 전체 목록 — 홈 오른쪽 기둥(최신 8건)에서 밀려난 기사가 사는 자리.
//
// 홈의 "전체 보기" 가 게임 목록으로 가고 있었다(2026-09-21). 갈 곳이 없어서였지,
// 뉴스와 목록이 같은 축이어서가 아니다 — 이 화면이 그 링크의 도착지다.
//
// 본문은 담지 않는다(§10 저작권). 제목을 누르면 매체 원문이 새 창으로 열린다.
import type { Metadata } from "next";
import Link from "next/link";
import { NewsList } from "@/components/news-list";
import { Pagination } from "@/components/pagination";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead } from "@/components/ui/page";
import { NEWS_MESSAGES as M, newsCountText } from "@/lib/news/messages";
import { ROUTES } from "@/lib/routes";
import { listNews } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 주소의 page 는 사람이 손으로 고치는 값이라 무엇이 와도 1 이상 정수로 떨어뜨린다 */
function readPage(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function NewsPage({ searchParams }: Props) {
  const { items, total, page, totalPages } = await listNews(readPage((await searchParams).page));

  return (
    <Page gap={30}>
      <PageHead
        title={M.title}
        note={total > 0 ? newsCountText(total) : undefined}
        action={
          <Link href={ROUTES.game} className={buttonClass({ variant: "secondary", className: "rounded-full" })}>
            {M.browseGames}
          </Link>
        }
      >
        <p className="w-full max-w-[620px] text-[13.5px] leading-[1.7] text-mut">{M.lead}</p>
      </PageHead>

      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.empty}</p>
      ) : (
        <>
          <NewsList items={items} showGame />
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => (p === 1 ? ROUTES.news : `${ROUTES.news}?page=${p}`)} />
        </>
      )}
    </Page>
  );
}
