// /admin/codes — 공통코드관리(2026-10-30, 사용자 "공통 코드로 쓰는 것들을 추가, 수정, 미사용 처리"). 화면은 components/admin/codes-screen.
// 여기는 그룹과 코드를 읽어 넘기기만 한다.
import type { Metadata } from "next";
import { CodesScreen } from "@/components/admin/codes-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { CODE_GROUP_PARAM } from "@/lib/routes";
import { listCodeGroups } from "@/server/services/common-codes";

export const metadata: Metadata = { title: ADMIN_NAV.codes };

export default async function AdminCodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRoleOrForbid("admin");
  const [groups, params] = await Promise.all([listCodeGroups(), searchParams]);
  // ?group= 으로 오면 그 그룹을 골라 연다(다른 화면의 "~ 더하기" 바로가기)
  const want = params[CODE_GROUP_PARAM];
  const initialGroup = typeof want === "string" && groups.some((g) => g.groupCode === want) ? want : null;
  return <CodesScreen groups={groups} initialGroup={initialGroup} />;
}
