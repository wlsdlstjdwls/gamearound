"use client";
// 결제/환불관리 화면 본문(2026-10-29 밤, 사용자 "화면 구성은 그대로네"). 신세계TV 백오피스 주문이력 꼴:
// 위 조회조건(결제상태, 처리필요, 구매자/주문번호), 그 아래 결제 목록(공통 그리드, 금액 합계 줄), 맨 아래 고른 결제의 상세(결제정보, 환불).
// 앞 판은 한 줄에 상품, 구매자, 일시, 금액, 환불 단추를 다 얹은 표였다 — 환불 요청 메모와 남은 기간 몫이 줄 안에 끼어 훑기 어려웠다.
// 목록은 훑는 자리, 상세는 처리하는 자리로 가른다. 환불 단추(RefundControls)는 상세의 환불 묶음에만 선다.
import { useState } from "react";
import { RefundControls } from "@/components/admin/refund-controls";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES as PM, PAYMENT_STATUS_LABEL } from "@/lib/payments/messages";
import type { PaymentRowDto } from "@/server/services/payments";

function statusTag(p: PaymentRowDto) {
  if (p.status === "paid" && p.refundRequested) return <Tag tone="danger">{PM.adminRefundRequested}</Tag>;
  if (p.boostMissing) return <Tag tone="danger">{PM.adminTodoLabels.missing}</Tag>;
  return <Tag tone={p.status === "canceled" ? "warn" : "ok"}>{PAYMENT_STATUS_LABEL[p.status]}</Tag>;
}

const COLUMNS: GridCol<PaymentRowDto>[] = [
  { key: "status", label: PM.adminColStatus, width: "96px", value: (p) => (p.refundRequested ? PM.adminRefundRequested : PAYMENT_STATUS_LABEL[p.status]), render: statusTag },
  { key: "item", label: PM.adminColItem, width: "minmax(140px,1fr)", value: (p) => p.productName },
  { key: "target", label: PM.adminColTarget, width: "minmax(140px,1.2fr)", value: (p) => p.targetTitle ?? "" },
  { key: "buyer", label: PM.adminColBuyer, width: "minmax(140px,1fr)", value: (p) => p.buyer ?? "" },
  { key: "paidAt", label: PM.adminColPaidAt, width: "136px", value: (p) => p.createdAt, text: (p) => formatDateTime(p.createdAt) },
  { key: "amount", label: PM.adminColAmount, width: "96px", align: "right", value: (p) => p.amount, text: (p) => formatPrice(p.amount), sum: (rows) => formatPrice(rows.reduce((n, r) => n + r.amount, 0)) },
  {
    key: "refunded",
    label: PM.adminColRefunded,
    width: "88px",
    align: "right",
    value: (p) => p.refundedAmount,
    text: (p) => (p.refundedAmount > 0 ? formatPrice(p.refundedAmount) : ""),
    sum: (rows) => formatPrice(rows.reduce((n, r) => n + r.refundedAmount, 0)),
  },
  { key: "order", label: PM.adminColOrder, width: "minmax(120px,1fr)", value: (p) => p.orderId, render: (p) => <span className="font-mono text-[11.5px] text-dim">{p.orderId}</span> },
];

function Detail({ p }: { p: PaymentRowDto }) {
  return (
    <div className="flex flex-col gap-3">
      <FormSection title={PM.adminSectionPay}>
        <Field label={PM.adminColOrder}>
          <ReadValue>{p.orderId}</ReadValue>
        </Field>
        <Field label={PM.adminColStatus}>
          <ReadValue>{PAYMENT_STATUS_LABEL[p.status]}</ReadValue>
        </Field>
        <Field label={PM.adminColItem}>
          <ReadValue>{p.productName}</ReadValue>
        </Field>
        <Field label={PM.adminColTarget}>
          <ReadValue>{p.targetTitle ?? "-"}</ReadValue>
        </Field>
        <Field label={PM.adminColBuyer}>
          <ReadValue>{p.buyer ?? "-"}</ReadValue>
        </Field>
        <Field label={PM.adminColPaidAt}>
          <ReadValue>{formatDateTime(p.createdAt)}</ReadValue>
        </Field>
        <Field label={PM.adminColAmount}>
          <ReadValue align="right">{formatPrice(p.amount)}</ReadValue>
        </Field>
        <Field label={PM.adminFieldReceipt}>
          <ReadValue>
            {p.receiptUrl ? (
              <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-acc hover:underline">
                {PM.receipt}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              "-"
            )}
          </ReadValue>
        </Field>
        {p.boostMissing && <p className="text-[12.5px] font-semibold text-danger xl:col-span-2">{PM.adminBoostMissing}</p>}
      </FormSection>
      <FormSection title={PM.adminSectionRefund} action={p.status === "paid" ? <RefundControls orderId={p.orderId} amount={p.amount} prorated={p.proratedAmount} /> : undefined}>
        <Field label={PM.adminFieldRequest}>
          <ReadValue>{p.refundRequested ? PM.adminRequestYes : PM.adminRequestNo}</ReadValue>
        </Field>
        <Field label={PM.adminColRefunded}>
          <ReadValue align="right">{formatPrice(p.refundedAmount)}</ReadValue>
        </Field>
        <Field label={PM.adminFieldRequestNote} wide>
          <ReadValue>{p.refundRequestNote ?? "-"}</ReadValue>
        </Field>
        {p.status === "paid" ? (
          <Field label={PM.adminFieldProrated}>
            <ReadValue align="right">{formatPrice(p.proratedAmount)}</ReadValue>
          </Field>
        ) : (
          <p className="text-[12.5px] text-dim xl:col-span-2">{PM.adminNoRefundHere}</p>
        )}
      </FormSection>
    </div>
  );
}

export function PaymentsScreen({ rows }: { rows: PaymentRowDto[] }) {
  const [status, setStatus] = useState("all");
  const [todo, setTodo] = useState("all");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = text.trim().toLowerCase();
  const shown = rows.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (todo === "all" || (todo === "request" ? p.status === "paid" && p.refundRequested : p.boostMissing)) &&
      (!q || (p.buyer ?? "").toLowerCase().includes(q) || p.orderId.toLowerCase().includes(q)),
  );
  const current = rows.find((p) => p.orderId === selected) ?? null;
  const all = { value: "all", label: PM.adminSearchAll };
  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={PM.adminSearch}>
        <SearchItem label={PM.adminSearchStatus}>
          <FormSelect name="pay-status" label={PM.adminSearchStatus} hideLabel size="md" value={status} onChange={setStatus} options={[all, { value: "paid", label: PAYMENT_STATUS_LABEL.paid }, { value: "canceled", label: PAYMENT_STATUS_LABEL.canceled }]} />
        </SearchItem>
        <SearchItem label={PM.adminSearchTodo}>
          <FormSelect name="pay-todo" label={PM.adminSearchTodo} hideLabel size="md" value={todo} onChange={setTodo} options={[all, { value: "request", label: PM.adminTodoLabels.request }, { value: "missing", label: PM.adminTodoLabels.missing }]} />
        </SearchItem>
        <SearchItem label={PM.adminSearchText} htmlFor="pay-text">
          <TextField id="pay-text" label={PM.adminSearchText} hideLabel value={text} onChange={(e) => setText(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <DataGrid
        label={PM.adminListLabel}
        columns={COLUMNS}
        rows={shown}
        rowKey={(p) => p.orderId}
        selected={selected}
        onSelect={setSelected}
        autoSelectFirst
        rowTone={(p) => (p.status === "canceled" ? "muted" : undefined)}
        pageSize={20}
        empty={PM.adminEmpty}
      />
      {current ? <Detail key={current.orderId} p={current} /> : <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{PM.adminPickHint}</p>}
    </div>
  );
}
