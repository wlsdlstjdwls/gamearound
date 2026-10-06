// /admin/indie — 인디 홍보 글 관리. 신고 칸, 게임 연결 확인 칸, 숨김 칸, 전체.
//
// 글은 승인 없이 바로 서므로(schema-indie 머리 주석) 이 화면은 "사후에 막는 자리" 다. 첫 칸이 신고인 이유가 그것이다.
// 게임 연결 칸은 반대로 "사전에 여는 자리" 다 — 확인해야 게임 상세에 붙는다. 확인은 올린 사람이 그 게임의
// 개발자임을 바깥(스토어 개발사 페이지, 공식 사이트의 연락처)에서 대조한 뒤에 누른다.
import type { Metadata } from "next";
import Link from "next/link";
import { IndieModeration } from "@/components/admin/indie-moderation";
import { ChipLink } from "@/components/ui/chip";
import { PageHead, ROWS } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_ADMIN_MESSAGES as A, INDIE_MESSAGES } from "@/lib/indie/messages";
import { gamePath, indiePath, ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { INDIE_ADMIN_TABS, listIndieForAdmin, type IndieAdminTab } from "@/server/services/indie";

export const metadata: Metadata = { title: A.title };

const TAB_LABEL: Record<IndieAdminTab, string> = { reported: A.tabReported, links: A.tabLinks, hidden: A.tabHidden, all: A.tabAll };

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
    <div className="flex flex-col gap-5">
      <div>
        <PageHead title={A.title} />
        <p className="mt-1 max-w-[620px] text-[13px] text-mut">{A.lead}</p>
      </div>

      <nav aria-label={A.title} className="flex flex-wrap gap-1.5">
        {INDIE_ADMIN_TABS.map((t) => (
          <ChipLink key={t} href={tabHref(t)} active={tab === t} aria-current={tab === t ? "page" : undefined}>
            {TAB_LABEL[t]}
          </ChipLink>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{A.empty}</p>
      ) : (
        <ul className={ROWS}>
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6">
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={indiePath(r.slug)} className="text-[15px] font-semibold text-ink hover:text-acc hover:underline">
                  {r.title}
                </Link>
                <span className="text-[12.5px] text-dim">
                  {[r.developerName, `${A.author} ${r.authorEmail}`, formatDate(r.createdAt)].join(" | ")}
                </span>
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
    </div>
  );
}
