// /admin/promotions — 광고노출관리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 5장 2단계). 앞 이름 "유료 노출", "광고 자리".
// 결제 목록은 2026-10-29 결제 관리(/admin/payments)로 뗐다 — 멤버십 청구까지 담는 목록이라 광고 화면 아래가 제자리가 아니었다.
//
// 화면 구성은 백오피스 조회 화면 꼴(components/admin/promotions-screen, 2026-10-30). 여기는 광고 목록과 걸 수 있는 글을 읽어 넘기기만 한다.
// 앞 판(숫자 칸, 자리별 카드, 접힌 끝난 광고, 걸기 폼)이 왜 그 순서였는지는 그 파일 머리에 적었다.
import type { Metadata } from "next";
import { PromotionsScreen } from "@/components/admin/promotions-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listBoostCandidates, listBoostsForAdmin } from "@/server/services/promotions";

export const metadata: Metadata = { title: ADMIN_NAV.promotions };

export default async function AdminPromotionsPage() {
  await requireRoleOrForbid("admin");
  const [rows, candidates] = await Promise.all([listBoostsForAdmin(), listBoostCandidates()]);
  return <PromotionsScreen rows={rows} candidates={candidates} />;
}
