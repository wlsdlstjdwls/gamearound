"use client";
// 필드 정정 폼 (§4.4 data_corrections). 필드 select + 값 input(타입별) + lock 체크
import { useActionState, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { correctFieldAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";
import { panelClass } from "@/components/ui/page";
import { ADMIN_FIELD } from "@/components/admin/field";
import { FormSelect } from "@/components/ui/select";

export type FieldOption = { name: string; label: string; kind: "text" | "int" | "bool" | "date"; current: string | number | boolean | null };


/** 참/거짓 칸의 두 값. 화면 낱말은 여기서만 정한다 */
const BOOL_CHOICES = [
  { value: "true", label: "예" },
  { value: "false", label: "아니오" },
];

function toInputValue(v: FieldOption["current"]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function CorrectionForm({
  table,
  rowId,
  gameId,
  fields,
  title,
}: {
  table: "games" | "game_platforms";
  rowId: string;
  gameId: string;
  fields: FieldOption[];
  title: string;
}) {
  const [state, formAction, submitting] = useActionState(correctFieldAction, null);
  const [fieldName, setFieldName] = useState(fields[0]?.name ?? "");
  const field = fields.find((f) => f.name === fieldName) ?? fields[0];

  return (
    <ActionForm action={formAction} state={state} pending={submitting} className={panelClass("flex flex-col gap-2.5 p-4")}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="rowId" value={rowId} />
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-[13px] font-bold text-ink">{title}</p>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto_auto]">
        <FormSelect
          name="field"
          label="고칠 칸"
          hideLabel
          value={fieldName}
          onChange={setFieldName}
          options={fields.map((f) => ({ value: f.name, label: f.label }))}
        />
        {field?.kind === "bool" ? (
          <FormSelect
            name="value"
            label={field.label}
            hideLabel
            key={`${field.name}-bool`}
            defaultValue={toInputValue(field.current) || "false"}
            options={BOOL_CHOICES}
          />
        ) : field?.kind === "date" ? (
          <input name="value" key={`${field.name}-date`} type="date" defaultValue={toInputValue(field.current)} className={ADMIN_FIELD} />
        ) : field?.kind === "int" ? (
          <input name="value" key={`${field.name}-int`} type="number" step={1} defaultValue={toInputValue(field.current)} placeholder="비우면 null" className={ADMIN_FIELD} />
        ) : (
          <input name="value" key={`${field?.name}-text`} type="text" defaultValue={toInputValue(field?.current ?? null)} placeholder="비우면 null" className={ADMIN_FIELD} />
        )}
        <label className="flex items-center gap-1.5 text-[11.5px] text-mut">
          <input type="checkbox" name="lock" defaultChecked className="accent-[var(--ink)]" />
          크롤러 덮어쓰기 잠금
        </label>
        <SubmitButton label="정정" />
      </div>
      {field && (
        <p className="text-[11.5px] text-dim">
          현재 값: <span className="text-mut">{field.current === null ? "(없음)" : toInputValue(field.current)}</span>
        </p>
      )}
      <ActionStatus state={state} />
    </ActionForm>
  );
}
