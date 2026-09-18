// /admin/products — 상품 매핑 검수 큐 (매장 설계서 §5.2).
//
// 매핑 배치가 "중간"(유사도 0.7~0.9)으로 판정한 상품만 선다. 높으면 배치가 이미 이었고
// 낮으면 후보를 남기지 않는다. 사람이 하는 일은 두 이름을 맞대 보고 잇거나 무르는 것 하나다.
import type { Metadata } from "next";
import Link from "next/link";
import { ProductMatchButtons } from "@/components/admin/product-match-buttons";
import { Card, PageHead, SectionHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listSuggestedProductMatches } from "@/server/services/admin-products";
import { AUTO_MATCH_THRESHOLD, PENDING_MATCH_THRESHOLD } from "@/server/sync/match";
import { PRODUCT_MATCH_RECHECK_DAYS } from "@/server/sync/constants";

export const metadata: Metadata = { title: "상품 매핑 검수" };

// 상품 이름과 후보 게임 제목을 같은 너비로 나란히 둔다 — 두 이름을 눈으로 맞대는 것이 이 화면의 일이다
const QUEUE_COLS = "grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_64px_minmax(0,1fr)_120px_128px] gap-x-3 px-4 py-[13px]";

export default async function AdminProductMatchesPage() {
  await requireRoleOrForbid("admin");
  const queue = await listSuggestedProductMatches();

  return (
    <>
      <section className="flex flex-col gap-2">
        <PageHead title="상품 매핑 검수" />
        <p className="max-w-[620px] text-[13px] text-mut">
          매장이 올린 물건을 우리 카탈로그와 맞대 본 결과입니다. 이으면 그 게임 상세의 &quot;파는 곳&quot; 에 바로 뜨고,
          무르면 그 후보는 다시 올라오지 않습니다. 무른 상품은 {PRODUCT_MATCH_RECHECK_DAYS}일 뒤 다음 후보로 다시 판정합니다.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          title="후보가 남은 상품"
          note={`유사도 ${PENDING_MATCH_THRESHOLD}~${AUTO_MATCH_THRESHOLD} | ${queue.length}건`}
        />
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">
            검수 대기 중인 상품이 없습니다.
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <div className={`${QUEUE_COLS} min-w-[900px] border-b border-line text-[11.5px] text-dim`}>
              <span>상품</span>
              <span>후보 게임</span>
              <span>유사도</span>
              <span>등록 매장</span>
              <span>마지막 확인</span>
              <span>처리</span>
            </div>
            <ul className="min-w-[900px] divide-y divide-line-soft">
              {queue.map((p) => (
                <li key={p.productId} className={`${QUEUE_COLS} items-center text-[13px] text-ink`}>
                  <span className="min-w-0">
                    <Clamp>{p.productName}</Clamp>
                    {/* 바코드와 기종은 판정의 근거다 — 같은 이름이라도 기종이 다르면 다른 물건이다 */}
                    <span className="mt-0.5 block font-mono text-[11px] text-dim">
                      {[p.hardwareCode, p.barcode].filter(Boolean).join(" | ") || "바코드 없음"}
                    </span>
                  </span>
                  <span className="min-w-0 text-mut">
                    <Link href={gamePath(p.candidate.slug)} target="_blank" rel="noreferrer" className="hover:text-acc">
                      <Clamp>{p.candidate.titleKo ?? p.candidate.titleEn}</Clamp>
                      <span className="sr-only"> (새 창에서 열림)</span>
                    </Link>
                    {p.candidate.titleKo && (
                      <span className="mt-0.5 block text-[11px] text-dim">
                        <Clamp>{p.candidate.titleEn}</Clamp>
                      </span>
                    )}
                  </span>
                  <span className="text-mut">{p.confidence ?? "-"}</span>
                  <span className="min-w-0 text-mut">
                    {p.shopName ? <Clamp>{p.shopName}</Clamp> : <span className="text-dim-2">연동</span>}
                  </span>
                  <span className="text-[12px] text-mut">{p.checkedAt ? formatDateTime(p.checkedAt) : "-"}</span>
                  <ProductMatchButtons productId={p.productId} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
