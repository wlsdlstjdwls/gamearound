// /admin/codes — 공통코드관리(2026-10-30, 사용자 "공통 코드로 쓰는 것들을 추가, 수정, 미사용 처리"). 화면은 components/admin/codes-screen.
// 여기는 그룹과 코드를 읽어 넘기기만 한다.
import type { Metadata } from "next";
import { CodesScreen } from "@/components/admin/codes-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listCodeGroups } from "@/server/services/common-codes";

export const metadata: Metadata = { title: ADMIN_NAV.codes };

export default async function AdminCodesPage() {
  await requireRoleOrForbid("admin");
  const groups = await listCodeGroups();
  return <CodesScreen groups={groups} />;
}
