"use client";
// 멤버십회원관리 화면 본문(2026-10-29 밤, 사용자 "화면 구성은 그대로네"). 신세계TV 백오피스 고객상세정보 꼴:
// 위 조회조건(상태, 회원 이메일), 왼쪽 회원 목록(공통 그리드), 오른쪽 고른 회원의 묶음 상세(회원 정보, 구독 정보, 결제 정보).
// 앞 판은 한 줄에 칸 일곱을 늘어놓은 표라 결제 실패 사유 같은 긴 값이 줄 안에 끼었다. 목록은 훑기, 상세는 한 사람 보기로 가른다.
// 환불은 결제/환불관리에서 한다(결제 한 건 기준) — 머리의 "결제/환불관리 보기" 가 그 길이다.
import { useState } from "react";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { MEMBERSHIP_MESSAGES as M, MEMBERSHIP_STATUS_LABEL } from "@/lib/membership/messages";
import type { MembershipStatus } from "@/server/db/schema";
import type { MembershipDto } from "@/server/services/membership";

const STATUS_TONE: Record<MembershipStatus, TagTone> = { active: "acc", canceling: "warn", past_due: "danger", ended: "neutral" };
const keyOf = (m: MembershipDto) => m.email ?? `${m.planName}-${m.periodStart.toISOString()}`;

const COLUMNS: GridCol<MembershipDto>[] = [
  { key: "status", label: M.adminColStatus, width: "84px", value: (m) => MEMBERSHIP_STATUS_LABEL[m.status], render: (m) => <Tag tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Tag> },
  { key: "member", label: M.adminColMember, width: "minmax(150px,1fr)", value: (m) => m.email ?? "" },
  { key: "next", label: M.nextCharge, width: "92px", value: (m) => m.nextChargeAt, text: (m) => (m.nextChargeAt ? formatDate(m.nextChargeAt) : "-") },
  { key: "amount", label: M.adminColAmount, width: "84px", align: "right", value: (m) => m.amount, text: (m) => formatPrice(m.amount) },
];

function Detail({ m }: { m: MembershipDto }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-baseline gap-2 px-1">
        <span className="text-[16px] font-extrabold text-ink">{m.email}</span>
        <Tag tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Tag>
      </p>
      <FormSection title={M.adminSectionMember}>
        <Field label={M.adminColMember}>
          <ReadValue>{m.email ?? "-"}</ReadValue>
        </Field>
        <Field label={M.adminColStatus}>
          <ReadValue>{MEMBERSHIP_STATUS_LABEL[m.status]}</ReadValue>
        </Field>
      </FormSection>
      <FormSection title={M.adminSectionPlan}>
        <Field label={M.adminFieldPlan}>
          <ReadValue>{m.planName}</ReadValue>
        </Field>
        <Field label={M.adminColPeriod}>
          <ReadValue>{`${formatDate(m.periodStart)} ~ ${formatDate(m.periodEnd)}`}</ReadValue>
        </Field>
        <Field label={M.credits}>
          <ReadValue align="right">{M.creditsCount(m.usableCredits)}</ReadValue>
        </Field>
        <Field label={M.nextCharge}>
          <ReadValue>{m.nextChargeAt ? formatDate(m.nextChargeAt) : "-"}</ReadValue>
        </Field>
      </FormSection>
      <FormSection title={M.adminSectionBilling}>
        <Field label={M.adminColCard}>
          <ReadValue>{m.cardLabel ?? "-"}</ReadValue>
        </Field>
        <Field label={M.adminColAmount}>
          <ReadValue align="right">{formatPrice(m.amount)}</ReadValue>
        </Field>
        <Field label={M.adminFieldFailures}>
          <ReadValue>{m.failedAttempts > 0 ? M.adminFailed(m.failedAttempts) : M.adminNoFailure}</ReadValue>
        </Field>
        <Field label={M.adminFieldFailMessage}>
          <ReadValue>{m.lastFailMessage ?? "-"}</ReadValue>
        </Field>
      </FormSection>
    </div>
  );
}

export function MembershipsScreen({ rows }: { rows: MembershipDto[] }) {
  const [status, setStatus] = useState("all");
  const [member, setMember] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = member.trim().toLowerCase();
  const shown = rows.filter((m) => (status === "all" || m.status === status) && (!q || (m.email ?? "").toLowerCase().includes(q)));
  const current = rows.find((m) => keyOf(m) === selected) ?? null;
  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.adminSearch}>
        <SearchItem label={M.adminSearchStatus}>
          <FormSelect
            name="mem-status"
            label={M.adminSearchStatus}
            hideLabel
            size="md"
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: M.adminSearchAll }, ...(["active", "canceling", "past_due", "ended"] as const).map((k) => ({ value: k, label: MEMBERSHIP_STATUS_LABEL[k] }))]}
          />
        </SearchItem>
        <SearchItem label={M.adminSearchMember} htmlFor="mem-email">
          <TextField id="mem-email" label={M.adminSearchMember} hideLabel value={member} onChange={(e) => setMember(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <MasterDetail
        list={
          <DataGrid
            label={M.adminListLabel}
            columns={COLUMNS}
            rows={shown}
            rowKey={keyOf}
            selected={selected}
            onSelect={setSelected}
            autoSelectFirst
            rowTone={(m) => (m.status === "ended" ? "muted" : undefined)}
            pageSize={20}
            empty={M.adminEmpty}
          />
        }
        detail={current ? <Detail key={keyOf(current)} m={current} /> : <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.adminPickHint}</p>}
      />
    </div>
  );
}
