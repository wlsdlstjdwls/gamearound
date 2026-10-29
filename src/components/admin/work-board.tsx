// 관리자 첫 화면 업무 현황판 — 메뉴 묶음마다 기둥 하나, 기둥 안 줄 하나가 "그 화면에 쌓인 일 N건" 이다.
//
// 본보기는 신세계TV 백오피스 첫 화면이다(2026-10-29, 사용자 "관리자 화면이 어렵다"). 그 화면에서 가져온 것 넷:
//   1. 업무 단계마다 번호 붙은 기둥 — 메뉴 순서와 같은 번호라 "3번 수집" 이 왼쪽 기둥의 어디인지 바로 잇는다.
//   2. 줄은 이름 + 건수, 0 인 줄은 흐리게 — 눈이 0 이 아닌 줄에만 걸린다.
//   3. 줄마다 기준 말풍선 — 숫자가 무엇을 세는지 모르면 0 을 못 믿고 화면을 열어 다시 센다.
//   4. 줄 전체가 그 일을 하는 화면으로 가는 길.
// 가져오지 않은 것: 기둥 머리의 화살표 꼴(각진 장식은 이 서비스 결이 아니다), 숫자를 누르면 뜨는 목록 팝업(각 화면이 이미 그 목록이다).
//
// 줄의 무게는 셋이다. 쌓인 일(queue)이 0 이 아니면 파랑 점, 돈이 걸린 일(money)은 빨강 점, 훑어볼 양(info)은 점 없이 늘 같은 무게.
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ADMIN_BOARD_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { formatAmount } from "@/lib/currency";
import { InfoTip } from "@/components/ui/tooltip";
import { panelClass } from "@/components/ui/page";
import { PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { PROMO_ENDING_SOON_DAYS, type AdminBoard } from "@/server/services/admin-workload";

type Weight = "queue" | "money" | "info";
type Line = { label: string; hint: string; href: string; n: number; weight: Weight; /** 건수 대신 세울 값(금액 등) */ value?: string; capped?: boolean };
type Column = { key: string; title: string; lines: Line[] };

/** 기둥 순서는 메뉴 묶음 순서와 같다(admin-nav-items 의 GROUPS) — 번호가 메뉴 자리를 가리키게 */
function columnsOf(b: AdminBoard): Column[] {
  return [
    {
      key: "revenue",
      title: ADMIN_NAV.groupRevenue,
      lines: [
        { label: M.refundRequests, hint: M.refundRequestsHint, href: ROUTES.adminPayments, n: b.refundRequests, weight: "money" },
        { label: M.boostMissing, hint: M.boostMissingHint, href: ROUTES.adminPayments, n: b.boostMissing, weight: "money" },
        { label: M.membershipsPastDue, hint: M.membershipsPastDueHint, href: ROUTES.adminMemberships, n: b.membershipsPastDue, weight: "money" },
        { label: M.promosEndingSoon, hint: M.promosEndingSoonHint(PROMO_ENDING_SOON_DAYS), href: ROUTES.adminPromotions, n: b.promosEndingSoon, weight: "queue" },
        { label: M.monthPaid, hint: M.monthPaidHint, href: ROUTES.adminPayments, n: b.monthPaid, weight: "info", value: formatAmount(b.monthPaid) },
      ],
    },
    {
      key: "ops",
      title: ADMIN_NAV.groupOps,
      lines: [
        { label: M.tasksTodo, hint: M.tasksTodoHint, href: ROUTES.adminTasks, n: b.tasksTodo, weight: "queue" },
        { label: M.tasksDoing, hint: M.tasksDoingHint, href: ROUTES.adminTasks, n: b.tasksDoing, weight: "info" },
      ],
    },
    {
      key: "sync",
      title: ADMIN_NAV.groupSync,
      lines: [
        { label: M.sourcesAttention, hint: M.sourcesAttentionHint, href: ROUTES.adminSync, n: b.sourcesAttention, weight: "queue" },
        { label: M.failedRunsToday, hint: M.failedRunsTodayHint, href: ROUTES.adminSyncLogs, n: b.failedRunsToday, weight: "queue" },
      ],
    },
    {
      key: "review",
      title: ADMIN_NAV.groupReview,
      lines: [
        { label: M.matches, hint: M.matchesHint, href: ROUTES.adminMatches, n: b.matches, weight: "queue" },
        { label: M.dataIssues, hint: M.dataIssuesHint, href: ROUTES.adminDataIssues, n: b.dataIssues, weight: "queue" },
        {
          label: M.companies,
          hint: M.companiesHint(PENDING_COMPANIES_LIMIT),
          href: ROUTES.adminCompanies,
          n: b.companies,
          weight: "queue",
          capped: b.companiesCapped,
        },
        { label: M.preorder, hint: M.preorderHint, href: ROUTES.adminPreorder, n: b.preorder, weight: "queue" },
      ],
    },
    {
      key: "community",
      title: ADMIN_NAV.groupCommunity,
      lines: [
        { label: M.indieReview, hint: M.indieReviewHint, href: ROUTES.adminIndie, n: b.indieReview, weight: "queue" },
        { label: M.indieReported, hint: M.indieReportedHint, href: `${ROUTES.adminIndie}?tab=reported`, n: b.indieReported, weight: "queue" },
        { label: M.indieLinks, hint: M.indieLinksHint, href: `${ROUTES.adminIndie}?tab=links`, n: b.indieLinks, weight: "queue" },
        { label: M.postsToday, hint: M.postsTodayHint, href: ROUTES.adminPosts, n: b.postsToday, weight: "info" },
        { label: M.commentsToday, hint: M.commentsTodayHint, href: `${ROUTES.adminPosts}?tab=comments`, n: b.commentsToday, weight: "info" },
      ],
    },
    {
      key: "shops",
      title: ADMIN_NAV.groupShops,
      lines: [
        { label: M.shops, hint: M.shopsHint, href: ROUTES.shopsAdmin, n: b.shops, weight: "queue" },
        { label: M.products, hint: M.productsHint, href: ROUTES.adminProducts, n: b.products, weight: "queue" },
      ],
    },
  ];
}

/** 쌓인 일 줄의 합. 훑어볼 양(info)은 빼고 센다 — 화면 머리의 "쌓인 일이 없어요" 와 기둥 머리 숫자가 같은 규칙을 쓴다 */
function pendingOfLines(lines: Line[]): number {
  return lines.filter((l) => l.weight !== "info").reduce((n, l) => n + l.n, 0);
}

export function boardPending(b: AdminBoard): number {
  return pendingOfLines(columnsOf(b).flatMap((c) => c.lines));
}

const DOT: Record<Exclude<Weight, "info">, string> = { queue: "bg-acc", money: "bg-danger" };

function BoardLine({ line }: { line: Line }) {
  const hot = line.weight !== "info" && line.n > 0;
  const quiet = line.weight !== "info" && line.n === 0;
  return (
    <li className="relative flex items-center gap-1.5">
      {/* 줄 전체가 길이다. 말풍선 단추는 링크 밖에 세운다 — 링크 안의 단추는 누르면 이동까지 같이 일어난다 */}
      <Link
        href={line.href}
        className={cn(
          "press tap flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface px-3 shadow-hair transition-shadow duration-fast hover:shadow-[var(--elev-card)]",
          quiet && "bg-transparent shadow-none hover:bg-surface",
        )}
      >
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", hot ? DOT[line.weight as Exclude<Weight, "info">] : "bg-line-strong", line.weight === "info" && "invisible")} />
        <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", hot ? "font-semibold text-ink" : quiet ? "text-dim" : "text-mut")}>{line.label}</span>
        <span className={cn("shrink-0 text-[13.5px] font-bold tabular-nums", hot ? (line.weight === "money" ? "text-danger" : "text-acc") : quiet ? "text-dim-2" : "text-ink")}>
          {line.value ?? (
            <>
              {line.n.toLocaleString("ko-KR")}
              {line.capped && "+"}
              <span className="ml-0.5 text-[11.5px] font-medium">{M.unit}</span>
            </>
          )}
        </span>
      </Link>
      <InfoTip label={line.hint} />
    </li>
  );
}

export function WorkBoard({ board }: { board: AdminBoard }) {
  const columns = columnsOf(board);
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {columns.map((col, i) => {
        const pending = pendingOfLines(col.lines);
        return (
          <section key={col.key} aria-labelledby={`board-${col.key}`} className={panelClass("flex flex-col gap-2 p-3")}>
            <h2 id={`board-${col.key}`} className="flex items-center gap-2 px-1 text-[13.5px] font-bold text-ink">
              <span className="inline-flex size-5 items-center justify-center rounded-md bg-ink text-[11px] font-bold tabular-nums text-surface">{i + 1}</span>
              {col.title}
              {pending > 0 && (
                <span className="ml-auto rounded-full bg-acc-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-acc">
                  <span aria-hidden>{pending.toLocaleString("ko-KR")}</span>
                  <span className="sr-only">{M.groupCount(pending)}</span>
                </span>
              )}
            </h2>
            <ul className="flex flex-col gap-1">
              {col.lines.map((line) => (
                <BoardLine key={line.label} line={line} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** 기둥 수, 줄 수를 실물과 맞춘 뼈대(admin/loading). 본문이 올 때 판이 밀리지 않게 */
export const WORK_BOARD_SHAPE = [5, 2, 2, 4, 5, 2] as const;
