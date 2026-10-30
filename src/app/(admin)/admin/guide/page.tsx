// /admin/guide — 서비스안내서조회(2026-10-30, 사용자 "우리 웹에서 볼 수 있게, 관리자 화면 쪽에서"). 기획 운영팀용 안내서를 관리자 콘솔 안에서 연다.
// 여기는 마지막으로 올린 시각만 읽는다. 본문은 화면이 api/admin/guide 로 따로 받는다 — 본문이 커서 화면 응답에 싣지 않는다.
import type { Metadata } from "next";
import { GuideScreen } from "@/components/admin/guide-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getLatestGuide } from "@/server/services/admin-guide";

export const metadata: Metadata = { title: ADMIN_NAV.guide };

export default async function AdminGuidePage() {
  await requireRoleOrForbid("admin");
  // 저장소를 못 읽으면 빈 화면으로 둔다 — 안내서 하나 때문에 관리자 화면이 오류로 바뀌지 않게
  const guide = await getLatestGuide().catch(() => null);
  return <GuideScreen uploadedAt={guide ? guide.uploadedAt.toISOString() : null} />;
}
