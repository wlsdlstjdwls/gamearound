// 뉴스 전체 목록 — 홈 오른쪽 기둥(최신 8건)에서 밀려난 기사가 사는 자리.
//
// 홈의 "전체 보기" 가 게임 목록으로 가고 있었다(2026-09-21). 갈 곳이 없어서였지,
// 뉴스와 목록이 같은 축이어서가 아니다 — 이 화면이 그 링크의 도착지다.
//
// 본문은 담지 않는다(§10 저작권). 제목을 누르면 매체 원문이 새 창으로 열린다.
import type { Metadata } from "next";
import { NewsList } from "@/components/news-list";
import { Pagination } from "@/components/pagination";
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
      {/* 머리말과 "전체 게임 보기" 버튼을 뗐다(2026-09-22, 사용자 지정, 출시예정 화면과 같은 손질).
          머리말이 말하던 사실(본문은 저장하지 않는다)은 목록 자체가 이미 보여 준다 —
          줄마다 매체 이름이 붙고 누르면 새 창으로 나간다. 버튼은 머리띠 메뉴와 같은 자리로 가는
          두 번째 입구였다. 문구는 지우지 않고 남긴다 — 검색결과, SNS 카드의 설명이 그 값을 쓴다 */}
      <PageHead title={M.title} note={total > 0 ? newsCountText(total) : undefined} />

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
