// /news/mine — 내 맞춤 소식(2026-11-03). 주간 소식 메일과 알림함의 "전체 보기" 가 오는 자리다.
// 고르는 규칙은 메일과 같다(lib/news/digest) — 메일에서 본 목록이 여기서 이어져야 한다. 다만 기간은 늘 지난 7일이다:
// 메일은 받은 기사를 다시 안 보내려고 지난 묶음 뒤부터 고르지만, 이 화면은 다시 읽으러 오는 곳이다.
//
// 주간 소식을 켜지 않아도 볼 수 있다. 무엇이 오는지 보고 켤지 정하라고 설정 스위치 밑에서 이리로 보낸다.
// (user) 아래에 둔 이유: 회원마다 다른 목록이라 캐시하면 안 되고(레이아웃이 force-dynamic), 로그인이 필요하다.
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { NewsList } from "@/components/news-list";
import { Page, PageHead } from "@/components/ui/page";
import { NEWS_DIGEST_MESSAGES as M } from "@/lib/news/messages";
import { ROUTES } from "@/lib/routes";
import { listMyDigestNews } from "@/server/services/news-mine";

export const metadata: Metadata = { title: M.pageTitle, robots: { index: false } };

export default async function MyNewsPage() {
  const { items, hasTaste } = await listMyDigestNews();
  return (
    <Page gap={30}>
      <PageHead title={M.pageTitle} note={hasTaste ? M.pageNote : undefined} />
      {!hasTaste ? (
        <EmptyState title={M.noTasteTitle} description={M.noTasteBody} action={{ href: ROUTES.settings, label: M.noTasteAction }} />
      ) : items.length === 0 ? (
        <EmptyState title={M.emptyTitle} description={M.emptyBody} action={{ href: ROUTES.news, label: M.allNews }} />
      ) : (
        <NewsList items={items} showGame />
      )}
    </Page>
  );
}
