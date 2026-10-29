// /admin/indie — 인디게임승인관리. 승인 대기, 신고, 게임 연결 확인, 숨김, 전체.
//
// 글은 승인 없이 바로 서지 않는다 — 승인 대기 칸이 "사전에 여는 자리" 고, 신고 칸이 "사후에 막는 자리" 다.
// 게임 연결 확인은 올린 사람이 그 게임의 개발자임을 바깥(스토어 개발사 페이지, 공식 사이트의 연락처)에서 대조한 뒤에 누른다.
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/indie-screen). 여기는 구분을 읽고 줄을 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { IndieScreen } from "@/components/admin/indie-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { firstParam } from "@/lib/games-query";
import { INDIE_ADMIN_MESSAGES as A } from "@/lib/indie/messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { INDIE_ADMIN_TABS, listIndieForAdmin, type IndieAdminTab } from "@/server/services/indie";

export const metadata: Metadata = { title: ADMIN_NAV.indie };

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
    <>
      <AdminScreenHead title={ADMIN_NAV.indie} count={rows.length} />
      {/* 구분이 바뀌면 고른 줄, 체크를 비운다 — 다른 목록의 열쇠가 남아 엉뚱한 글을 처리하지 않게 */}
      <IndieScreen key={tab} rows={rows} tab={tab} tabs={INDIE_ADMIN_TABS.map((t) => ({ value: t, label: TAB_LABEL[t], href: tabHref(t) }))} />
    </>
  );
}
