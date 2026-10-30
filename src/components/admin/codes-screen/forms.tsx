"use client";
// 공통코드관리 오른쪽 상세 — 그룹 정보 묶음, 코드 목록 그리드, 고른 코드의 묶음(2026-10-30).
// 코드 칸을 그리드 안에서 바로 고치지 않고 아래 묶음에서 고친다. 공통 그리드(screen/data-grid)는 줄 고르기, 복사, 엑셀을 맡고,
// 칸마다 입력을 세우면 그 기능(방향키 이동, Ctrl+C)이 입력과 부딪힌다. 다른 관리 화면도 목록 + 폼이라 손이 같은 길을 간다.
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { CodeName, Field, FormSection, ReadValue } from "@/components/admin/screen/layout";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { CODES_MESSAGES as M } from "@/lib/admin/messages";
import type { FieldErrors } from "@/lib/admin/validation";
import { codeErrorPath, type CodeDraft, type GroupDraft } from "./model";

const ACTIVE_OPTIONS = [
  { value: "on", label: M.activeLabels.on },
  { value: "off", label: M.activeLabels.off },
];

const nullable = (v: string) => (v.trim() ? v : null);

function ActiveSelect({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  return <FormSelect name={name} label={M.fieldActive} hideLabel size="lg" value={value ? "on" : "off"} onChange={(v) => onChange(v === "on")} options={ACTIVE_OPTIONS} />;
}

/**
 * 코드 + 이름 한 칸. 저장한 코드는 회색 읽기 칸(CodeName), 새 줄은 코드도 입력이다 — 저장하고 나면 다른 표가 그 값을 들고 있어 잠근다.
 * 새 줄도 CodeName 과 같은 2:3 으로 나눠 저장 전후 칸 자리가 같게 둔다
 */
function KeyName({ isNew, keyField, children }: { isNew: boolean; keyField: React.ReactNode; children: React.ReactNode }) {
  if (!isNew) return <CodeName code={keyField}>{children}</CodeName>;
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1.5">
      <div className="min-w-0">{keyField}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function GroupForm({ g, set, errors }: { g: GroupDraft; set: (next: Partial<GroupDraft>) => void; errors: FieldErrors }) {
  return (
    <FormSection title={M.sectionGroup} action={<span className="text-[11.5px] text-dim">{M.noDelete}</span>}>
      <Field label={M.fieldGroupCode} htmlFor={`cg-name-${g.key}`} required wide error={errors.groupCode}>
        <KeyName
          isNew={g.isNew}
          keyField={g.isNew ? <TextField id={`cg-code-${g.key}`} label={M.colGroup} hideLabel value={g.groupCode} onChange={(e) => set({ groupCode: e.target.value.toUpperCase() })} compact autoFocus /> : g.groupCode}
        >
          <TextField id={`cg-name-${g.key}`} label={M.colGroupName} hideLabel value={g.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} compact />
        </KeyName>
      </Field>
      <Field label={M.fieldDescription} htmlFor={`cg-desc-${g.key}`} wide>
        <TextField id={`cg-desc-${g.key}`} label={M.fieldDescription} hideLabel value={g.description ?? ""} onChange={(e) => set({ description: nullable(e.target.value) })} error={errors.description} compact />
      </Field>
      <Field label={M.attr1Label} htmlFor={`cg-a1-${g.key}`}>
        <TextField id={`cg-a1-${g.key}`} label={M.attr1Label} hideLabel value={g.attr1Label ?? ""} onChange={(e) => set({ attr1Label: nullable(e.target.value) })} error={errors.attr1Label} compact />
      </Field>
      <Field label={M.attr2Label} htmlFor={`cg-a2-${g.key}`}>
        <TextField id={`cg-a2-${g.key}`} label={M.attr2Label} hideLabel value={g.attr2Label ?? ""} onChange={(e) => set({ attr2Label: nullable(e.target.value) })} error={errors.attr2Label} compact />
      </Field>
      <Field label={M.fieldSort} htmlFor={`cg-sort-${g.key}`} required>
        <NumberField id={`cg-sort-${g.key}`} label={M.fieldSort} hideLabel value={g.sortOrder} onValue={(n) => set({ sortOrder: n })} error={errors.sortOrder} className="text-right tabular-nums" compact />
      </Field>
      <Field label={M.fieldActive} required>
        <ActiveSelect name={`cg-act-${g.key}`} value={g.active} onChange={(active) => set({ active })} />
      </Field>
    </FormSection>
  );
}

function codeColumns(g: GroupDraft): GridCol<CodeDraft>[] {
  const cols: GridCol<CodeDraft>[] = [
    { key: "code", label: M.colCode, width: "minmax(88px,0.8fr)", value: (c) => c.code },
    { key: "name", label: M.colCodeName, width: "minmax(110px,1fr)", value: (c) => c.name },
  ];
  // 덧값 칸은 그룹이 이름을 정했을 때만 세운다 — 이름 없는 "속성1" 칸은 무엇을 넣는지 말해 주지 않는다
  if (g.attr1Label) cols.push({ key: "attr1", label: g.attr1Label, width: "minmax(96px,0.9fr)", value: (c) => c.attr1 ?? "" });
  if (g.attr2Label) cols.push({ key: "attr2", label: g.attr2Label, width: "minmax(96px,0.9fr)", value: (c) => c.attr2 ?? "" });
  cols.push(
    { key: "sort", label: M.colSort, width: "60px", align: "right", value: (c) => c.sortOrder },
    { key: "active", label: M.colActive, width: "64px", align: "center", value: (c) => (c.active ? M.activeLabels.on : M.activeLabels.off) },
  );
  return cols;
}

export function CodeList({ g, saved, selected, onSelect, onAdd, errors }: { g: GroupDraft; saved: GroupDraft | undefined; selected: string | null; onSelect: (key: string) => void; onAdd: () => void; errors: FieldErrors }) {
  const savedByKey = new Map((saved?.codes ?? []).map((c) => [c.key, JSON.stringify(c)]));
  return (
    <DataGrid
      label={M.codeList}
      columns={codeColumns(g)}
      rows={g.codes}
      rowKey={(c) => c.key}
      fileKey={(c) => ({ code: g.groupCode, name: c.code })}
      selected={selected}
      onSelect={onSelect}
      autoSelectFirst
      rowState={(c) =>
        Object.keys(errors).some((k) => k.startsWith(`codes.${g.codes.indexOf(c)}.`)) ? "error" : c.isNew ? "new" : savedByKey.get(c.key) !== JSON.stringify(c) ? "changed" : undefined
      }
      rowTone={(c) => (c.active ? undefined : "muted")}
      searchable
      tools={
        <Button variant="secondary" size="sm" onClick={onAdd}>
          {M.addCode}
        </Button>
      }
      empty={M.codeEmpty}
    />
  );
}

export function CodeForm({ g, c, set, errors }: { g: GroupDraft; c: CodeDraft; set: (next: Partial<CodeDraft>) => void; errors: FieldErrors }) {
  const err = (f: string) => errors[codeErrorPath(g, c, f)];
  return (
    <FormSection title={M.sectionCode}>
      <Field label={M.fieldCode} htmlFor={`cc-name-${c.key}`} required wide error={err("code")}>
        <KeyName isNew={c.isNew} keyField={c.isNew ? <TextField id={`cc-code-${c.key}`} label={M.colCode} hideLabel value={c.code} onChange={(e) => set({ code: e.target.value.trim() })} compact autoFocus /> : c.code}>
          <TextField id={`cc-name-${c.key}`} label={M.colCodeName} hideLabel value={c.name} onChange={(e) => set({ name: e.target.value })} error={err("name")} compact />
        </KeyName>
      </Field>
      {g.attr1Label && (
        <Field label={M.fieldAttr(g.attr1Label, 1)} htmlFor={`cc-a1-${c.key}`}>
          <TextField id={`cc-a1-${c.key}`} label={M.fieldAttr(g.attr1Label, 1)} hideLabel value={c.attr1 ?? ""} onChange={(e) => set({ attr1: nullable(e.target.value) })} error={err("attr1")} compact />
        </Field>
      )}
      {g.attr2Label && (
        <Field label={M.fieldAttr(g.attr2Label, 2)} htmlFor={`cc-a2-${c.key}`}>
          <TextField id={`cc-a2-${c.key}`} label={M.fieldAttr(g.attr2Label, 2)} hideLabel value={c.attr2 ?? ""} onChange={(e) => set({ attr2: nullable(e.target.value) })} error={err("attr2")} compact />
        </Field>
      )}
      <Field label={M.fieldSort} htmlFor={`cc-sort-${c.key}`} required>
        <NumberField id={`cc-sort-${c.key}`} label={M.fieldSort} hideLabel value={c.sortOrder} onValue={(n) => set({ sortOrder: n })} error={err("sortOrder")} className="text-right tabular-nums" compact />
      </Field>
      <Field label={M.fieldActive} required>
        <ActiveSelect name={`cc-act-${c.key}`} value={c.active} onChange={(active) => set({ active })} />
      </Field>
      <Field label={M.fieldMemo} htmlFor={`cc-memo-${c.key}`} wide>
        <TextField id={`cc-memo-${c.key}`} label={M.fieldMemo} hideLabel value={c.memo ?? ""} onChange={(e) => set({ memo: nullable(e.target.value) })} error={err("memo")} compact />
      </Field>
    </FormSection>
  );
}

/** 코드를 고르기 전 자리 */
export function PickCode() {
  return <ReadValue>{M.pickCode}</ReadValue>;
}
