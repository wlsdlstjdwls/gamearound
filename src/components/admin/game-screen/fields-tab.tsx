"use client";
// 게임 고치기의 "값 고치기" 탭(2026-10-30). 앞 판은 게임 공통 폼 한 장 + 기종마다 폼 한 장씩이고, 폼마다 "고칠 칸" 을 골라야 지금 값이 보였다.
// 백오피스 꼴로 바꿨다: 게임 공통과 기종별 칸을 한 그리드에 늘어놓아 지금 값을 한눈에 보고, 줄을 고르면 오른쪽에서 고친다.
//
// 저장은 툴바(F9, Ctrl+S)다 — 화면 머리가 이 탭의 save 를 쥔다(useCorrection). 고친 값은 잠금을 기본으로 켠다:
// 잠그지 않으면 다음 수집이 스토어 값으로 되돌린다(data_corrections.lock_field, AGENTS §7).
// 고칠 값을 둔 채 다른 줄로 옮기면 저장/저장 안 함/취소를 묻는다(편집 화면 공통, 2026-10-30).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { correctFieldAction } from "@/app/(admin)/admin/actions";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Checkbox } from "@/components/ui/checkbox";
import { askChoice } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_ACTION_MESSAGES as A, GAME_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import type { FieldRow } from "./types";

const BOOL_CHOICES = [
  { value: "true", label: M.boolYes },
  { value: "false", label: M.boolNo },
];

export function toInputValue(v: FieldRow["current"]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

const shownValue = (r: FieldRow) => (r.current === null ? M.none : r.kind === "bool" ? (r.current ? M.boolYes : M.boolNo) : String(r.current));

/** 고를 줄, 고칠 값, 잠금, 저장을 쥔다. 화면 머리(툴바 저장, 조회 전 확인)와 탭 본문이 같이 쓴다 */
export function useCorrection(gameId: string, fields: FieldRow[]) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [selected, setSelected] = useState<string | null>(null);
  // null 이면 아직 손대지 않았다 — 지금 값을 그대로 보인다
  const [draft, setDraft] = useState<string | null>(null);
  const [lock, setLock] = useState(true);
  const [saving, start] = useTransition();
  const current = fields.find((f) => f.key === selected) ?? null;
  const dirty = Boolean(current && draft !== null && draft !== toInputValue(current.current));

  const reset = () => {
    setDraft(null);
    setLock(true);
  };

  const save = (then?: () => void) => {
    if (!current || !dirty) return;
    const fd = new FormData();
    fd.set("table", current.table);
    fd.set("rowId", current.rowId);
    fd.set("gameId", gameId);
    fd.set("field", current.field);
    fd.set("value", draft ?? "");
    fd.set("lock", lock ? "true" : "false");
    start(async () => {
      const r = await correctFieldAction(null, fd).catch(() => null);
      if (!r || !r.ok) return say(r && !r.ok ? r.error : A.failed, "error");
      say(r.message ?? "", "ok");
      reset();
      router.refresh();
      then?.();
    });
  };

  const select = async (key: string) => {
    if (key === selected) return;
    if (dirty) {
      const c = await askChoice(M.leaveConfirm, { title: M.leaveTitle, confirmLabel: M.leaveSave, altLabel: M.leaveDiscard });
      if (c === "cancel") return;
      if (c === "confirm") return save(() => setSelected(key));
    }
    reset();
    setSelected(key);
  };

  return { current, selected, select, draft, setDraft, lock, setLock, dirty, save, saving, reset };
}

type Correction = ReturnType<typeof useCorrection>;

const COLUMNS: GridCol<FieldRow>[] = [
  { key: "target", label: M.colTarget, width: "108px", value: (r) => r.target },
  { key: "field", label: M.colField, width: "128px", value: (r) => r.label },
  { key: "current", label: M.colCurrent, width: "minmax(160px,1fr)", value: (r) => shownValue(r) },
];

export function FieldsTab({ fields, c }: { fields: FieldRow[]; c: Correction }) {
  return (
    <MasterDetail
      listWidth="520px"
      list={
        <DataGrid
          label={M.fieldsListLabel}
          columns={COLUMNS}
          rows={fields}
          rowKey={(r) => r.key}
          selected={c.selected}
          onSelect={c.select}
          autoSelectFirst
          rowState={(r) => (c.dirty && r.key === c.selected ? "changed" : undefined)}
          searchable
          empty={M.fieldsEmpty}
          fit
        />
      }
      detailTitle={c.current ? `${c.current.target} | ${c.current.label}` : M.sectionCorrect}
      detail={c.current && <CorrectionForm key={c.current.key} row={c.current} c={c} />}
    />
  );
}

function CorrectionForm({ row, c }: { row: FieldRow; c: Correction }) {
  const value = c.draft ?? toInputValue(row.current);
  const id = `gf-${row.field}`;
  return (
    <FormSection title={M.sectionCorrect} labelWidth="72px">
      <Field label={M.fieldTarget}>
        <ReadValue>{row.target}</ReadValue>
      </Field>
      <Field label={M.fieldField}>
        <ReadValue>{row.label}</ReadValue>
      </Field>
      <Field label={M.fieldCurrent} wide>
        <ReadValue>
          <span className="break-all">{shownValue(row)}</span>
        </ReadValue>
      </Field>
      <Field label={M.fieldNext} htmlFor={id} wide>
        {row.kind === "bool" ? (
          <FormSelect name={id} label={M.fieldNext} hideLabel size="lg" value={value || "false"} onChange={c.setDraft} options={BOOL_CHOICES} />
        ) : row.kind === "date" ? (
          <DateField label={M.fieldNext} hideLabel value={value || null} onChange={(v) => c.setDraft(v ?? "")} />
        ) : (
          <TextField
            id={id}
            label={M.fieldNext}
            hideLabel
            inputMode={row.kind === "int" ? "numeric" : undefined}
            placeholder={M.nextPlaceholder}
            value={value}
            onChange={(e) => c.setDraft(e.target.value)}
            compact
          />
        )}
      </Field>
      <Field label={M.fieldLock} wide>
        <Checkbox checked={c.lock} onChange={(e) => c.setLock(e.target.checked)} className="min-h-10 items-center">
          {M.lockLabel}
        </Checkbox>
      </Field>
    </FormSection>
  );
}
