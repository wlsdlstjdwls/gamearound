"use client";
// 회사관리신청관리 화면 본문(2026-11-03). 입점승인관리와 같은 승인 화면 꼴:
// 위 조회조건(상태, 회사명/신청자), 왼쪽 신청 그리드(체크 칸) + 아래 일괄 처리 띠, 오른쪽 고른 신청의 상세.
// 반려는 사유가 필수다(lib/companies/schemas) — 띠가 서버에 묻기 전에 막는다.
import Link from "next/link";
import { useState } from "react";
import { reviewCompanyClaimAction } from "@/app/(admin)/admin/company-claims/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useUrlFilter } from "@/components/admin/screen/url-filter";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { COMPANY_CLAIM_ADMIN_MESSAGES as A, COMPANY_CLAIM_MESSAGES as C } from "@/lib/companies/messages";
import { CLAIM_REASON_MAX } from "@/lib/companies/schemas";
import { formatDate } from "@/lib/format";
import { companyPath } from "@/lib/routes";
import type { CompanyClaimRow } from "@/server/services/company-claims";

type Row = CompanyClaimRow;

const DECISIONS: ApprovalDecision<Row>[] = [
  { value: "approve", label: A.approve, can: (r) => r.status === "pending" },
  { value: "reject", label: A.reject, danger: true, needsReason: true, can: (r) => r.status === "pending" },
];

const shortDate = (d: Date) => formatDate(d).replace(/ \(.\)$/, "");

export function CompanyClaimsScreen({ rows, status, statuses }: { rows: Row[]; status: string; statuses: Array<{ value: string; label: string; href: string }> }) {
  const filter = useUrlFilter(status, (v) => statuses.find((s) => s.value === v)?.href ?? statuses[0].href);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = text.trim().toLowerCase();
  const shown = rows.filter(
    (r) => !q || r.companyName.toLowerCase().includes(q) || r.contactName.toLowerCase().includes(q) || (r.applicantEmail ?? "").toLowerCase().includes(q),
  );
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.id,
    run: async (r, decision, reason) => {
      const fd = new FormData();
      fd.set("claimId", r.id);
      fd.set("decision", decision);
      fd.set("reason", reason);
      const res = await reviewCompanyClaimAction(null, fd);
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
        return <Tag tone={done ? "neutral" : r.status === "pending" ? "warn" : r.status === "approved" ? "acc" : "neutral"}>{done ?? statusLabel(r)}</Tag>;
      },
    },
    { key: "company", label: A.colCompany, width: "minmax(130px,1.1fr)", value: (r) => r.companyName },
    { key: "name", label: A.colApplicant, width: "minmax(90px,0.8fr)", value: (r) => r.contactName },
    { key: "title", label: A.colTitle, width: "minmax(80px,0.6fr)", value: (r) => r.contactTitle ?? "" },
    { key: "email", label: A.colEmail, width: "minmax(140px,1fr)", value: (r) => r.contactEmail },
    { key: "evidence", label: A.colEvidence, width: "64px", align: "center", value: (r) => (r.evidenceUrl ? "O" : "") },
    { key: "applied", label: A.colApplied, width: "92px", align: "center", value: (r) => r.appliedAt, text: (r) => shortDate(r.appliedAt) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={A.search}>
        <SearchItem label={A.searchStatus}>
          <FormSelect name="claim-status" label={A.searchStatus} hideLabel size="md" value={filter.value} onChange={filter.set} options={statuses.map((s) => ({ value: s.value, label: s.label }))} />
        </SearchItem>
        <SearchItem label={A.searchText} htmlFor="claim-text">
          <TextField id="claim-text" label={A.searchText} hideLabel value={text} onChange={(e) => setText(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <div className={cn("transition-opacity duration-fast", filter.pending && "pointer-events-none opacity-50")} aria-busy={filter.pending || undefined}>
        <MasterDetail
          listWidth="680px"
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
                paging
                empty={A.empty}
                fit
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} reasonMax={CLAIM_REASON_MAX} busy={busy} onApply={apply} />
            </div>
          }
          detailTitle={current ? current.companyName : A.detailTitle}
          detailActions={
            current ? (
              <Link href={companyPath(current.companySlug)} target="_blank" className="text-[12.5px] font-semibold text-acc hover:underline">
                {A.openCompany}
                <span className="sr-only">(새 창에서 열림)</span>
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
      <FormSection title={A.sectionClaim}>
        <Field label={C.contactNameLabel}>
          <ReadValue>{r.contactName}</ReadValue>
        </Field>
        <Field label={C.contactTitleLabel}>
          <ReadValue>{r.contactTitle ?? "-"}</ReadValue>
        </Field>
        <Field label={C.contactEmailLabel}>
          <ReadValue>
            <span className="break-all">{r.contactEmail}</span>
          </ReadValue>
        </Field>
        <Field label={A.accountLabel}>
          <ReadValue>
            <span className="break-all">{r.applicantEmail ?? "-"}</span>
          </ReadValue>
        </Field>
        <Field label={C.evidenceUrlLabel} wide>
          <ReadValue>
            {r.evidenceUrl ? (
              <a href={r.evidenceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-acc hover:underline">
                {r.evidenceUrl}
                <span className="sr-only">(새 창에서 열림)</span>
              </a>
            ) : (
              "-"
            )}
          </ReadValue>
        </Field>
        {r.note && (
          <Field label={C.noteLabel} wide>
            <ReadValue>
              <span className="py-2 leading-[1.7]">{r.note}</span>
            </ReadValue>
          </Field>
        )}
      </FormSection>
      <FormSection title={A.sectionReview}>
        <Field label={A.colStatus}>
          <ReadValue>{status}</ReadValue>
        </Field>
        <Field label={A.colApplied}>
          <ReadValue>{formatDate(r.appliedAt)}</ReadValue>
        </Field>
        {r.statusReason && (
          <Field label={C.reasonLabel} wide>
            <ReadValue>
              <span className="text-danger">{r.statusReason}</span>
            </ReadValue>
          </Field>
        )}
      </FormSection>
    </>
  );
}
