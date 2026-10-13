// DB 가 안 열렸을 때 결과 자리에 세우는 안내(lib/db-errors 의 nullIfDbUnavailable, orDbDown 이 알려 준 자리).
// 화면 전체를 오류 화면으로 넘기지 않는다 — 머리글, 필터, 검색창은 살아 있어야 다른 곳으로 갈 수 있다.
// 둘째 단추가 세일 일정인 이유: DB 없이 서는 화면이라 기다리는 동안 실제로 열리는 곳이다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { StatusPanel, type StatusPanelSize } from "@/components/ui/status-panel";
import { MAINTENANCE_MESSAGES as M } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export function DbUnavailable({ retryHref, size = "section", footnote }: { retryHref: string; size?: StatusPanelSize; footnote?: React.ReactNode }) {
  return (
    <StatusPanel
      size={size}
      title={M.readTitle}
      body={M.readBody}
      footnote={footnote}
      actions={
        <>
          {/* 새로 불러오기다 — 소프트 이동은 같은 RSC 응답을 캐시에서 다시 꺼낼 수 있다 */}
          <a href={retryHref} className={buttonClass()}>
            {M.retry}
          </a>
          <Link href={ROUTES.sales} className={buttonClass({ variant: "secondary" })}>
            {M.toSales}
          </Link>
        </>
      }
    />
  );
}

/** 화면 전체가 조회 하나에 걸린 곳(상세, 회사, 매장)용. 판 하나만 세운다 — 비어 있는 머리나 탭을 그리면 고장으로 읽힌다 */
export function DbUnavailablePage({ retryHref }: { retryHref: string }) {
  return (
    <Page>
      <DbUnavailable size="page" retryHref={retryHref} />
    </Page>
  );
}
