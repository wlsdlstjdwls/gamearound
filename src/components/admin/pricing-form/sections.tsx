"use client";
// 요금 설정 화면들이 같이 쓰는 조각 — 판 껍데기(Panel), 새 광고 상품 만들기, 프로모션 대상 이름.
// 판매 상품 표(PricesSection)는 2026-10-29 밤 걷었다 — 상품등록이 백오피스 꼴(조회조건, 왼쪽 목록, 오른쪽 상세 탭, pricing-form/catalog)이 되었다.
import { sectionCardClass } from "@/components/ui/page";
import { PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import { MEMBERSHIP_KEY, type CatalogProduct, type PricingSettings } from "@/lib/pricing/settings";

/** count: 제목 옆 건수(백오피스 목록 머리의 "전체 N건") */
/** action: 제목 줄 오른쪽 끝 단추(백오피스 그리드 머리의 행 추가 자리). lead 를 비우면 설명 줄을 안 그린다 */
export function Panel({ title, count, lead, action, children }: { title: string; count?: number; lead?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={sectionCardClass("flex flex-col gap-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-baseline gap-1.5 text-[15px] font-bold text-ink">
            {title}
            {count !== undefined && <span className="text-[13px] font-semibold tabular-nums text-acc">{count}</span>}
          </h2>
          {lead && <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 새 상품의 첫 값. 지금 파는 낱개와 같은 꼴(인디 목록 7일)로 시작해 관리자가 고친다. 판매는 꺼 둔다 — 반쯤 만든 상품이 바로 팔리지 않게 */
const NEW_PRODUCT: Omit<CatalogProduct, "id" | "name"> = { slots: ["indie_top"], days: 7, amount: 6_900, active: false };

export function newProductId(): string {
  return `ad-${crypto.randomUUID().slice(0, 8)}`;
}

/** 상품 한 줄을 더한 설정. 표 머리의 상품 추가와 화면 툴바의 입력(F8)이 같이 쓴다 */
export function withNewProduct(d: PricingSettings, id: string = newProductId()): PricingSettings {
  return { ...d, products: [...d.products, { ...NEW_PRODUCT, slots: [...NEW_PRODUCT.slots], id, name: M.newProductName }] };
}

/** 프로모션 대상 고르기와 줄 머리가 쓰는 이름. 광고 상품은 관리자가 지은 이름, 멤버십은 고정 이름. 지운 상품은 그 사실을 말한다 */
export function targetLabel(s: PricingSettings, id: string): string {
  if (id === MEMBERSHIP_KEY) return TIER_LABELS.membership;
  return s.products.find((p) => p.id === id)?.name ?? M.goneProduct;
}
