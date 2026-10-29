"use client";
// 매장상품매핑관리 화면 본문(2026-10-30). 스토어매칭승인관리와 같은 백오피스 승인 화면 꼴:
// 위 조회조건(올린 매장, 상품명), 왼쪽 후보가 남은 상품 그리드(체크 칸) + 아래 일괄 처리 띠, 오른쪽 고른 줄의 상세(올린 물건, 후보 게임).
// 앞 판은 줄마다 승인/반려 단추였다 — 닮은 정도가 높은 줄을 몰아 승인하려면 한 건씩 눌러야 했다.
// 반려는 사유를 받지 않는다 — 서버가 남기는 것은 "물린 후보"(gameMatchRejectedId) 하나라 적어도 쓸 곳이 없다.
import Link from "next/link";
import { useState } from "react";
import { approveProductMatchAction, rejectProductMatchAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM, PRODUCT_MATCH_MESSAGES as M } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { adminGamePath, gamePath } from "@/lib/routes";

/** 서버 화면이 넘기는 줄. 시각은 문자열로 받는다 — 정렬은 ISO 문자열 순서로 충분하다 */
export type ProductMatchRow = {
  productId: string;
  name: string;
  barcode: string | null;
  hardwareCode: string | null;
  /** 연동(CSV, POS)으로 들어온 줄은 null */
  shopName: string | null;
  confidence: number | null;
  checkedAt: string | null;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  gameTitleEn: string;
};

/** 조회조건 "올린 매장" 에서 연동 줄을 고르는 값. 매장 이름과 겹치지 않게 빈 문자열로 둔다 */
const VIA_SYNC = "";

const DECISIONS: ApprovalDecision<ProductMatchRow>[] = [
  { value: "approve", label: M.approve },
  { value: "reject", label: M.reject, danger: true },
];

function confText(r: ProductMatchRow) {
  return r.confidence === null ? "-" : r.confidence.toFixed(2);
}

export function ProductsScreen({ rows }: { rows: ProductMatchRow[] }) {
  const [shop, setShop] = useState("all");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = name.trim().toLowerCase();
  const shown = rows.filter((r) => (shop === "all" || (r.shopName ?? VIA_SYNC) === shop) && (!q || r.name.toLowerCase().includes(q)));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.productId,
    run: async (r, decision) => {
      const res = await (decision === "approve" ? approveProductMatchAction(r.productId) : rejectProductMatchAction(r.productId));
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = rows.find((r) => r.productId === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.productId)) : current ? [current] : [];
  const shops = [...new Set(rows.map((r) => r.shopName ?? VIA_SYNC))];

  const columns: GridCol<ProductMatchRow>[] = [
    { key: "conf", label: M.colConfidence, width: "72px", align: "right", value: (r) => r.confidence, text: confText, render: (r) => (doneOf(r) ? <Tag tone="ok">{doneOf(r)}</Tag> : confText(r)) },
    { key: "name", label: M.colProduct, width: "minmax(140px,1fr)", value: (r) => r.name },
    // 기종은 판정의 근거다 — 같은 이름이라도 기종이 다르면 다른 물건이라 그리드에서 바로 보이게 둔다
    { key: "hw", label: M.fieldHardware, width: "72px", align: "center", value: (r) => r.hardwareCode ?? "-" },
    { key: "game", label: M.colCandidate, width: "minmax(140px,1fr)", value: (r) => r.gameTitle },
    { key: "shop", label: M.colShop, width: "112px", value: (r) => r.shopName ?? M.viaSync, render: (r) => r.shopName ?? <span className="text-dim-2">{M.viaSync}</span> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchShop}>
          <FormSelect
            name="p-shop"
            label={M.searchShop}
            hideLabel
            size="md"
            value={shop}
            onChange={setShop}
            options={[{ value: "all", label: M.searchAll }, ...shops.map((s) => ({ value: s, label: s === VIA_SYNC ? M.viaSync : s }))]}
          />
        </SearchItem>
        <SearchItem label={M.searchName} htmlFor="p-name">
          <TextField id="p-name" label={M.searchName} hideLabel value={name} onChange={(e) => setName(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <MasterDetail
        listWidth="640px"
        list={
          <div className="flex flex-col gap-2">
            <DataGrid
              label={M.listLabel}
              columns={columns}
              rows={shown}
              rowKey={(r) => r.productId}
              selected={selected}
              onSelect={setSelected}
              autoSelectFirst
              checked={checked}
              onChecked={setChecked}
              rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
              pageSize={50}
              empty={M.empty}
              maxHeight="calc(100svh - var(--header-h) - 330px)"
            />
            <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
          </div>
        }
        detailTitle={current ? current.name : M.detailTitle}
        detail={current ? <Detail key={current.productId} r={current} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
      />
    </div>
  );
}

function Detail({ r }: { r: ProductMatchRow }) {
  return (
    <>
      <FormSection title={M.sectionProduct}>
        <Field label={M.fieldName} wide>
          <ReadValue>{r.name}</ReadValue>
        </Field>
        <Field label={M.fieldHardware}>
          <ReadValue>{r.hardwareCode ?? "-"}</ReadValue>
        </Field>
        <Field label={M.fieldBarcode}>
          <ReadValue>
            <span className="break-all font-mono text-[12.5px]">{r.barcode ?? M.noBarcode}</span>
          </ReadValue>
        </Field>
        <Field label={M.colShop}>
          <ReadValue>{r.shopName ?? M.viaSync}</ReadValue>
        </Field>
        <Field label={M.colCheckedAt}>
          <ReadValue>{formatDateTime(r.checkedAt)}</ReadValue>
        </Field>
      </FormSection>
      {/* 배치가 고른 후보다. 기종이나 판이 다르면 이름이 닮아도 반려하면 된다 */}
      <FormSection
        title={M.sectionGame}
        action={
          <span className="flex items-center gap-3">
            <a href={gamePath(r.gameSlug)} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acc hover:underline">
              {M.openPublic}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
            <Link href={adminGamePath(r.gameId)} className="text-[12.5px] font-semibold text-acc hover:underline">
              {M.openGame}
            </Link>
          </span>
        }
      >
        <Field label={M.fieldGame}>
          <ReadValue>{r.gameTitle}</ReadValue>
        </Field>
        <Field label={M.fieldGameEn}>
          <ReadValue>{r.gameTitleEn}</ReadValue>
        </Field>
        <Field label={M.colConfidence}>
          <ReadValue align="right">{confText(r)}</ReadValue>
        </Field>
      </FormSection>
    </>
  );
}
