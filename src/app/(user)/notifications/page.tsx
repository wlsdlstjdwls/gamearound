// /notifications — 알림함 전체(2026-10-30). 머리 종 팝오버는 최근 20건만 펴서, 그보다 오래된 알림은 읽을 자리가 없었다.
//
// 편 쪽의 안 읽은 알림은 응답을 보낸 뒤 읽음으로 친다(after) — 이번 화면은 "새 알림" 점을 그대로 보여 주고, 다음에 열면 사라진다.
// 읽음 단추를 따로 두지 않는다: 이 화면에 온 것이 곧 읽은 것이다. 지우기도 두지 않는다 — 알림은 저절로 쌓이는 기록이라 고를 일이 드물다.
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { BellIcon, ChatIcon, CheckCircleIcon, GamepadIcon, TagIcon, TicketIcon } from "@/components/ui/icons";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { readPageParam } from "@/lib/pagination";
import { notificationsPath, ROUTES } from "@/lib/routes";
import type { NotificationKind } from "@/server/db/schema";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyNotificationsPage, markNotificationsRead, NOTIFICATION_PAGE_SIZE } from "@/server/services/notifications";

export const metadata: Metadata = { title: M.pageTitle, robots: { index: false } };

/** 갈래마다 그림 하나 — 줄을 읽기 전에 무슨 소식인지 눈이 먼저 가른다 */
const KIND_ICON: Record<NotificationKind, React.ReactNode> = {
  price_drop: <TagIcon size={17} />,
  comment: <ChatIcon size={17} />,
  approval: <CheckCircleIcon size={17} />,
  release: <GamepadIcon size={17} />,
  dev_news: <BellIcon size={17} />,
  payment: <TicketIcon size={17} />,
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = readPageParam((await searchParams).page);
  const [me, { items, total, unread }] = await Promise.all([requireUserOrRedirect(), listMyNotificationsPage(page)]);
  const totalPages = Math.max(Math.ceil(total / NOTIFICATION_PAGE_SIZE), 1);
  const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length > 0) after(() => markNotificationsRead(me.id, unreadIds));

  return (
    <Page gap={22}>
      <NavPendingScope>
        <PageHead title={M.pageTitle} note={total > 0 ? M.pageNote(total, unread) : undefined} />
        <PendingRegion>
          {items.length === 0 ? (
            <EmptyState icon={<span className="bell-ring"><BellIcon size={20} /></span>} title={M.empty} description={M.pageEmptyBody} action={{ href: ROUTES.game, label: M.pageEmptyAction }} />
          ) : (
            <div className="flex flex-col gap-5">
              <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-hair">
                {items.map((n, i) => {
                  const body = (
                    <>
                      <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full", n.read ? "bg-surface-2 text-mut" : "bg-acc-soft text-acc")}>
                        {KIND_ICON[n.kind]}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-[14px] leading-[1.5]", n.read ? "text-ink-2" : "font-semibold text-ink")}>{n.body}</span>
                        <span className="text-[12px] text-dim">{formatPostDate(n.createdAt)}</span>
                      </span>
                      {!n.read && (
                        <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-acc">
                          <span aria-hidden className="size-2 rounded-full bg-acc" />
                          {M.unread}
                        </span>
                      )}
                    </>
                  );
                  const row = "flex items-center gap-3.5 px-4 py-3.5 sm:px-5";
                  return (
                    <li key={n.id} className="enter-item" style={stagger(i)}>
                      {n.link ? (
                        <Link href={n.link} className={cn(row, "transition-colors duration-fast hover:bg-surface-2")}>
                          {body}
                        </Link>
                      ) : (
                        <div className={row}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Pagination page={page} totalPages={totalPages} hrefFor={notificationsPath} />
            </div>
          )}
        </PendingRegion>
      </NavPendingScope>
    </Page>
  );
}
