"use client";
// 입점승인관리 화면 본문(2026-10-30). 백오피스 승인 화면 꼴:
// 위 조회조건(상태, 매장명/대표), 왼쪽 신청 그리드(체크 칸) + 아래 일괄 처리 띠(처리, 사유, 적용), 오른쪽 고른 신청의 상세.
// 앞 판은 신청서마다 사유 칸과 단추를 단 카드 묶음이었다(shops/review-card). 카드는 훑을 칸이 없어 신청일, 대표 계정을 나란히 볼 수 없었다.
// 반려와 정지는 사유가 필수다(lib/shops/schemas) — 띠가 서버에 묻기 전에 막는다.
import Link from "next/link";
import { useState } from "react";
import { reviewShopAction } from "@/app/(admin)/shops/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useUrlFilter } from "@/components/admin/screen/url-filter";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { shopPath } from "@/lib/routes";
import { SHOP_ADMIN_MESSAGES as A, SHOP_MESSAGES as S } from "@/lib/shops/messages";
import { SHOP_REASON_MAX } from "@/lib/shops/schemas";
import type { ShopApplication } from "@/server/services/shops";

type Row = ShopApplication;

/** 상태마다 할 수 있는 일이 다르다 — 승인된 매장에 "승인" 을 또 묻지 않는다 */
const DECISIONS: ApprovalDecision<Row>[] = [
  { value: "approve", label: A.approve, can: (r) => r.status === "pending" },
  { value: "reject", label: A.reject, danger: true, needsReason: true, can: (r) => r.status === "pending" },
  { value: "suspend", label: A.suspend, danger: true, needsReason: true, can: (r) => r.status === "active" },
  { value: "reactivate", label: A.reactivate, can: (r) => r.status === "suspended" },
];

export function ShopsScreen({ rows, status, statuses }: { rows: Row[]; status: string; statuses: Array<{ value: string; label: string; href: string }> }) {
  const filter = useUrlFilter(status, (v) => statuses.find((s) => s.value === v)?.href ?? statuses[0].href);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = text.trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || (r.ownerEmail ?? "").toLowerCase().includes(q));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.id,
    run: async (r, decision, reason) => {
      const fd = new FormData();
      fd.set("shopId", r.id);
      fd.set("decision", decision);
      fd.set("reason", reason);
      const res = await reviewShopAction(null, fd);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = rows.find((r) => r.id === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.id)) : current ? [current] : [];
  const statusLabel = (r: Row) => statuses.find((s) => s.value === r.status)?.label ?? r.status;

  const columns: GridCol<Row>[] = [
    {
      key: "status",
      label: A.colStatus,
      width: "84px",
      align: "center",
      value: statusLabel,
      render: (r) => {
        const done = doneOf(r);
        return <Tag tone={done ? "ok" : r.status === "pending" ? "warn" : r.status === "active" ? "acc" : "danger"}>{done ?? statusLabel(r)}</Tag>;
      },
    },
    { key: "name", label: S.nameLabel, width: "minmax(140px,1.2fr)", value: (r) => r.name },
    { key: "owner", label: A.ownerLabel, width: "minmax(140px,1fr)", value: (r) => r.ownerEmail ?? "" },
    { key: "biz", label: S.bizRegNoLabel, width: "120px", align: "center", value: (r) => r.bizRegNo ?? "" },
    { key: "applied", label: A.appliedAtLabel, width: "92px", align: "center", value: (r) => r.appliedAt, text: (r) => formatDate(r.appliedAt).replace(/ \(.\)$/, "") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={A.search}>
        <SearchItem label={A.searchStatus}>
          <FormSelect name="shop-status" label={A.searchStatus} hideLabel size="md" value={filter.value} onChange={filter.set} options={statuses.map((s) => ({ value: s.value, label: s.label }))} />
        </SearchItem>
        <SearchItem label={A.searchText} htmlFor="shop-text">
          <TextField id="shop-text" label={A.searchText} hideLabel value={text} onChange={(e) => setText(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <div className={cn("transition-opacity duration-fast", filter.pending && "pointer-events-none opacity-50")} aria-busy={filter.pending || undefined}>
        <MasterDetail
          listWidth="600px"
          list={
            <div className="flex flex-col gap-2">
              <DataGrid
                label={A.listLabel}
                columns={columns}
                rows={shown}
                rowKey={(r) => r.id}
                selected={selected}
                onSelect={setSelected}
                autoSelectFirst
                checked={checked}
                onChecked={setChecked}
                rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
                pageSize={50}
                empty={A.empty}
                fit
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} reasonMax={SHOP_REASON_MAX} busy={busy} onApply={apply} />
            </div>
          }
          detailTitle={current ? current.name : A.detailTitle}
          detailActions={
            current && current.status === "active" ? (
              <Link href={shopPath(current.slug)} className="text-[12.5px] font-semibold text-acc hover:underline">
                {S.slugLabel}
              </Link>
            ) : undefined
          }
          detail={current ? <Detail key={current.id} r={current} status={statusLabel(current)} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
        />
      </div>
    </div>
  );
}

function Detail({ r, status }: { r: Row; status: string }) {
  return (
    <>
      <FormSection title={A.sectionShop}>
        <Field label={S.slugLabel}>
          <ReadValue>/{r.slug}</ReadValue>
        </Field>
        <Field label={S.bizRegNoLabel}>
          <ReadValue>{r.bizRegNo ?? "-"}</ReadValue>
        </Field>
        <Field label={S.addressLabel} wide>
          <ReadValue>{r.address ?? "-"}</ReadValue>
        </Field>
        <Field label={S.phoneLabel}>
          <ReadValue>{r.phone ?? "-"}</ReadValue>
        </Field>
        <Field label={A.ownerLabel}>
          <ReadValue>
            <span className="break-all">{r.ownerEmail ?? A.unknownOwner}</span>
          </ReadValue>
        </Field>
        {r.description && (
          <Field label={S.descriptionLabel} wide>
            <ReadValue>
              <span className="py-2 leading-[1.7]">{r.description}</span>
            </ReadValue>
          </Field>
        )}
      </FormSection>
      <FormSection title={A.sectionReview}>
        <Field label={A.colStatus}>
          <ReadValue>{status}</ReadValue>
        </Field>
        <Field label={A.appliedAtLabel}>
          <ReadValue>{formatDate(r.appliedAt)}</ReadValue>
        </Field>
        {r.statusReason && (
          <Field label={S.reasonLabel} wide>
            <ReadValue>
              <span className="text-danger">{r.statusReason}</span>
            </ReadValue>
          </Field>
        )}
      </FormSection>
    </>
  );
}
