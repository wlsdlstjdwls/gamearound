"use client";
// 필드 정정 폼 (§4.4 data_corrections). 필드 select + 값 input(타입별) + lock 체크
import { useActionState, useState } from "react";
import { correctFieldAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";

export type FieldOption = { name: string; label: string; kind: "text" | "int" | "bool" | "date"; current: string | number | boolean | null };

const inputCls = "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-amber-400";

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
  const [state, formAction] = useActionState(correctFieldAction, null);
  const [fieldName, setFieldName] = useState(fields[0]?.name ?? "");
  const field = fields.find((f) => f.name === fieldName) ?? fields[0];

  return (
    <form action={formAction} className="space-y-2 rounded-md border border-slate-800 p-3">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="rowId" value={rowId} />
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto_auto]">
        <select name="field" value={fieldName} onChange={(e) => setFieldName(e.target.value)} className={inputCls}>
          {fields.map((f) => (
            <option key={f.name} value={f.name}>{f.label}</option>
          ))}
        </select>
        {field?.kind === "bool" ? (
          <select name="value" key={`${field.name}-bool`} defaultValue={toInputValue(field.current) || "false"} className={inputCls}>
            <option value="true">예</option>
            <option value="false">아니오</option>
          </select>
        ) : field?.kind === "date" ? (
          <input name="value" key={`${field.name}-date`} type="date" defaultValue={toInputValue(field.current)} className={inputCls} />
        ) : field?.kind === "int" ? (
          <input name="value" key={`${field.name}-int`} type="number" step={1} defaultValue={toInputValue(field.current)} placeholder="비우면 null" className={inputCls} />
        ) : (
          <input name="value" key={`${field?.name}-text`} type="text" defaultValue={toInputValue(field?.current ?? null)} placeholder="비우면 null" className={inputCls} />
        )}
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" name="lock" defaultChecked className="accent-amber-400" />
          크롤러 덮어쓰기 잠금
        </label>
        <SubmitButton label="정정" />
      </div>
      {field && (
        <p className="text-xs text-slate-500">
          현재 값: <span className="text-slate-300">{field.current === null ? "(없음)" : toInputValue(field.current)}</span>
        </p>
      )}
      <ActionStatus state={state} />
    </form>
  );
}
