// /admin/products — 상품 매핑 큐 (매장 설계서 §5.2).
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
import { PRODUCT_MATCH_MESSAGES } from "@/lib/admin/messages";

export const metadata: Metadata = { title: PRODUCT_MATCH_MESSAGES.title };

// 상품 이름과 후보 게임 제목을 같은 너비로 나란히 둔다 — 두 이름을 눈으로 맞대는 것이 이 화면의 일이다
const QUEUE_COLS = "grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_64px_minmax(0,1fr)_120px_128px] gap-x-3 px-4 py-[13px]";

export default async function AdminProductMatchesPage() {
  await requireRoleOrForbid("admin");
  const queue = await listSuggestedProductMatches();

  return (
    <>
      <section className="flex flex-col gap-2">
        <PageHead title={PRODUCT_MATCH_MESSAGES.title} />
        <p className="max-w-[620px] text-[13px] text-mut">{PRODUCT_MATCH_MESSAGES.lead(PRODUCT_MATCH_RECHECK_DAYS)}</p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          title={PRODUCT_MATCH_MESSAGES.queueTitle}
          note={`${PRODUCT_MATCH_MESSAGES.similarity(PENDING_MATCH_THRESHOLD, AUTO_MATCH_THRESHOLD)} | ${PRODUCT_MATCH_MESSAGES.count(queue.length)}`}
        />
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">
            {PRODUCT_MATCH_MESSAGES.empty}
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <div className={`${QUEUE_COLS} min-w-[900px] border-b border-line text-[11.5px] text-dim`}>
              <span>{PRODUCT_MATCH_MESSAGES.colProduct}</span>
              <span>{PRODUCT_MATCH_MESSAGES.colCandidate}</span>
              <span>{PRODUCT_MATCH_MESSAGES.colConfidence}</span>
              <span>{PRODUCT_MATCH_MESSAGES.colShop}</span>
              <span>{PRODUCT_MATCH_MESSAGES.colCheckedAt}</span>
              <span>{PRODUCT_MATCH_MESSAGES.colAction}</span>
            </div>
            <ul className="min-w-[900px] divide-y divide-line-soft">
              {queue.map((p) => (
                <li key={p.productId} className={`${QUEUE_COLS} items-center text-[13px] text-ink`}>
                  <span className="min-w-0">
                    <Clamp>{p.productName}</Clamp>
                    {/* 바코드와 기종은 판정의 근거다 — 같은 이름이라도 기종이 다르면 다른 물건이다 */}
                    <span className="mt-0.5 block font-mono text-[11px] text-dim">
                      {[p.hardwareCode, p.barcode].filter(Boolean).join(" | ") || PRODUCT_MATCH_MESSAGES.noBarcode}
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
                    {p.shopName ? <Clamp>{p.shopName}</Clamp> : <span className="text-dim-2">{PRODUCT_MATCH_MESSAGES.viaSync}</span>}
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
