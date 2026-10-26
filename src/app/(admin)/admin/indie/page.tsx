// /admin/indie — 인디 홍보 글 관리. 신고 칸, 게임 연결 확인 칸, 숨김 칸, 전체.
//
// 글은 승인 없이 바로 서므로(schema-indie 머리 주석) 이 화면은 "사후에 막는 자리" 다. 첫 칸이 신고인 이유가 그것이다.
// 게임 연결 칸은 반대로 "사전에 여는 자리" 다 — 확인해야 게임 상세에 붙는다. 확인은 올린 사람이 그 게임의
// 개발자임을 바깥(스토어 개발사 페이지, 공식 사이트의 연락처)에서 대조한 뒤에 누른다.
import type { Metadata } from "next";
import Link from "next/link";
import { IndieModeration } from "@/components/admin/indie-moderation";
import { PageHead, ROWS } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_ADMIN_MESSAGES as A, INDIE_MESSAGES, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { Tag } from "@/components/ui/tag";
import { gamePath, indiePath, ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { INDIE_ADMIN_TABS, listIndieForAdmin, type IndieAdminTab } from "@/server/services/indie";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";

export const metadata: Metadata = { title: A.title };

const TAB_LABEL: Record<IndieAdminTab, string> = { review: A.tabReview, reported: A.tabReported, links: A.tabLinks, hidden: A.tabHidden, all: A.tabAll };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function tabHref(tab: IndieAdminTab): string {
  return tab === INDIE_ADMIN_TABS[0] ? ROUTES.adminIndie : `${ROUTES.adminIndie}?tab=${tab}`;
}

export default async function AdminIndiePage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const raw = firstParam((await searchParams).tab);
  const tab: IndieAdminTab = (INDIE_ADMIN_TABS as readonly string[]).includes(raw ?? "") ? (raw as IndieAdminTab) : INDIE_ADMIN_TABS[0];
  const rows = await listIndieForAdmin(tab);

  return (
    <NavPendingScope>
    <div className="flex flex-col gap-5">
      <div>
        <PageHead title={A.title} />
        <p className="mt-1 max-w-[620px] text-[13px] text-mut">{A.lead}</p>
      </div>

      <nav aria-label={A.title} className="flex flex-wrap gap-1.5">
        {INDIE_ADMIN_TABS.map((t) => (
          <NavChip key={t} group="tab" current="page" href={tabHref(t)} active={tab === t}>
            {TAB_LABEL[t]}
          </NavChip>
        ))}
      </nav>

      <PendingRegion>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{A.empty}</p>
      ) : (
        <ul className={ROWS}>
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* 승인 상태를 줄마다 단다 — "전체" 칸에서는 이 표시 없이는 어느 글이 아직 공개 전인지 모른다 */}
                  <Tag tone={INDIE_REVIEW_TONE[r.review]}>{INDIE_REVIEW_LABEL[r.review]}</Tag>
                  <Link href={indiePath(r.slug)} className="min-w-0 break-words text-[15px] font-semibold text-ink hover:text-acc hover:underline">
                    {r.title}
                  </Link>
                </div>
                <span className="break-words text-[12.5px] text-dim">
                  {[r.developerName, `${A.author} ${r.authorEmail}`, formatDate(r.createdAt)].join(" | ")}
                </span>
                {r.review === "rejected" && (
                  <span className="text-[12.5px] text-danger">
                    {INDIE_REVIEW_MESSAGES.reason}: {r.reviewReason ?? "-"}
                  </span>
                )}
                {r.status !== "published" && (
                  <span className="text-[12.5px] text-warn">
                    {INDIE_MESSAGES.hiddenNotice} {r.statusReason}
                  </span>
                )}
                {r.game && (
                  <span className="text-[12.5px] text-mut">
                    {A.linkedGame}{" "}
                    <Link href={gamePath(r.game.slug)} className="text-acc hover:underline">
                      {r.game.title}
                    </Link>
                  </span>
                )}
                {r.reportCount > 0 && (
                  <div className="flex flex-col gap-0.5 text-[12.5px]">
                    <span className="font-semibold text-danger">{A.reports(r.reportCount)}</span>
                    {r.reportReasons.map((reason, i) => (
                      <span key={i} className="text-mut">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <IndieModeration row={r} />
            </li>
          ))}
        </ul>
      )}
      </PendingRegion>
    </div>
    </NavPendingScope>
  );
}
