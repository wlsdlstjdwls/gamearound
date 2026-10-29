// /admin/products — 매장상품매핑관리(상품 매핑 큐, 매장 설계서 §5.2).
//
// 매핑 배치가 "중간"(유사도 0.7~0.9)으로 판정한 상품만 선다. 높으면 배치가 이미 이었고
// 낮으면 후보를 남기지 않는다. 사람이 하는 일은 두 이름을 맞대 보고 잇거나 무르는 것 하나다.
//
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/products-screen). 여기는 읽어서 줄로 바꿔 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ProductsScreen, type ProductMatchRow } from "@/components/admin/products-screen";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { countSuggestedProductMatches, listSuggestedProductMatches } from "@/server/services/admin-products";
import { AUTO_MATCH_THRESHOLD, PENDING_MATCH_THRESHOLD } from "@/server/sync/match";
import { PRODUCT_MATCH_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";

export const metadata: Metadata = { title: ADMIN_NAV.products };

export default async function AdminProductMatchesPage() {
  await requireRoleOrForbid("admin");
  const [queue, total] = await Promise.all([listSuggestedProductMatches(), countSuggestedProductMatches()]);
  const rows: ProductMatchRow[] = queue.map((p) => ({
    productId: p.productId,
    name: p.productName,
    barcode: p.barcode,
    hardwareCode: p.hardwareCode,
    shopName: p.shopName,
    confidence: p.confidence === null ? null : Number(p.confidence),
    checkedAt: p.checkedAt?.toISOString() ?? null,
    gameId: p.candidate.id,
    gameSlug: p.candidate.slug,
    gameTitle: p.candidate.titleKo ?? p.candidate.titleEn,
    gameTitleEn: p.candidate.titleEn,
  }));

  return (
    <>
      {/* 남은 수와 실은 수를 같이 적는다 — 상한에 걸린 사실을 감추면 관리자는 다 처리했다고 믿고 화면을 닫는다 */}
      <AdminScreenHead
        title={ADMIN_NAV.products}
        count={queue.length}
        note={`${M.note(queue.length, total)} | ${M.similarity(PENDING_MATCH_THRESHOLD, AUTO_MATCH_THRESHOLD)}`}
      />
      <ProductsScreen rows={rows} />
    </>
  );
}
