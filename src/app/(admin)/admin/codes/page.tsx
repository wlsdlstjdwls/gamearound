// /admin/codes — 공통코드관리(2026-10-30, 사용자 "공통 코드로 쓰는 것들을 추가, 수정, 미사용 처리"). 화면은 components/admin/codes-screen.
// 여기는 그룹과 코드를 읽어 넘기기만 한다.
import type { Metadata } from "next";
import { CodesScreen } from "@/components/admin/codes-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PROGRAM_SELECT_PARAM } from "@/lib/routes";
import { listCodeGroups } from "@/server/services/common-codes";

export const metadata: Metadata = { title: ADMIN_NAV.codes };

export default async function AdminCodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRoleOrForbid("admin");
  const [groups, params] = await Promise.all([listCodeGroups(), searchParams]);
  // ?select= 로 오면 그 그룹을 골라 연다(ProgramLink 의 select). 이미 열린 탭은 화면이 useProgramSelect 로 받는다
  const want = params[PROGRAM_SELECT_PARAM];
  const initialGroup = typeof want === "string" && groups.some((g) => g.groupCode === want) ? want : null;
  return <CodesScreen groups={groups} initialGroup={initialGroup} />;
}
