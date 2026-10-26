// 슈퍼루키(기획서 v2.0 S-09): 승인된 지 30일 미만인 인디 게임 중 주목도 상위 12개. 더보기, 쪽 번호 없이 이 화면에서만 선다.
// 점수는 lib/indie/fame 머리 주석. 카드마다 "N일 전 등록" 딱지를 제목 앞에 붙인다(목업 indRec). 아래 각주가 뽑는 기준을 말한다.
import type { Metadata } from "next";
import { IndieCard } from "@/components/indie/indie-card";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { FAME_MESSAGES as M } from "@/lib/indie/fame";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { listRookies } from "@/server/services/indie";

// 찜, 조회가 쌓이며 순위가 움직이는 화면이라 짧게 캐시한다
export const revalidate = 300;

export const metadata: Metadata = { title: M.rookieTitle, description: M.rookieLead };

export default async function RookiesPage() {
  const rookies = await nullIfDbUnavailable(listRookies());
  return (
    <Page gap={22}>
      <PageHead title={M.rookieTitle}>
        <p className="text-[14px] text-mut">{M.rookieLead}</p>
      </PageHead>
      {!rookies ? (
        <DbUnavailable retryHref={ROUTES.rookies} />
      ) : rookies.length === 0 ? (
        <EmptyState title={M.rookieEmpty} description={M.rookieEmptyLead} action={{ href: ROUTES.indieNew, label: M.rookieCta }} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rookies.map((r, i) => (
            <li key={r.card.slug} className="enter-item" style={stagger(i)}>
              {/* "N일 전 등록" 은 제목 앞 딱지로(목업 indRec) — 카드 밖 아랫줄에 두면 옆 카드의 것과 헷갈린다 */}
              <IndieCard post={r.card} badge={<Tag>{M.daysAgo(r.daysSince)}</Tag>} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-dim">{M.rookieFootnote}</p>
    </Page>
  );
}
