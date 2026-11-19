"use client";
// 프로그램관리 화면 본문(2026-11-19, 사용자 "어드민 화면 메뉴 정리, 프로그램 노출 사용 여부 관리하는 화면"). 백오피스 프로그램관리 꼴:
// 위 조회조건(상위메뉴, 프로그램명, 노출여부, 사용여부), 아래 프로그램 그리드 한 장. 노출, 사용 칸을 그리드 안에서 바로 고치고 툴바 저장(F9, Ctrl+S)으로 한 번에 보낸다.
// 칸이 둘뿐이라 상세 폼을 따로 두지 않는다(admin-form-rules: 칸 몇 개짜리 상세는 만들지 않는다).
//
// 프로그램 목록은 메뉴 표(admin-nav-items 의 GROUPS)다 — 입력, 삭제가 없는 이유다. 화면은 코드가 있어야 열리므로 여기서 새 프로그램을 만들 수 없다.
// 저장하면 서버 응답을 기다리지 않고 메뉴부터 바꾼다(program-policy 의 publishProgramSettings). 실패하면 되돌린다(AGENTS §6).
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProgramSettingsAction } from "@/app/(admin)/admin/programs/actions";
import { GROUPS } from "@/components/admin/admin-nav-items";
import { publishProgramSettings, useProgramSettings } from "@/components/admin/program-policy";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, PROGRAMS_MESSAGES as M } from "@/lib/admin/messages";
import { isLockedProgram, settingOf, type ProgramSettings } from "@/lib/admin/programs";
import { formatDateTime } from "@/lib/format";
import type { ProgramSettingRowDto } from "@/server/services/admin-programs";

type Row = {
  href: string;
  group: string;
  name: string;
  visible: boolean;
  active: boolean;
  locked: boolean;
  updatedByName: string | null;
  updatedAt: string | null;
};

/** 메뉴 표 순서 그대로 줄을 세우고 DB 값을 덮는다. 묶음 제목이 없는 칸(대시보드)은 제 이름이 묶음이다 */
function rowsOf(settings: ProgramSettingRowDto[]): Row[] {
  const byHref = new Map(settings.map((s) => [s.href, s]));
  const map: ProgramSettings = Object.fromEntries(settings.map((s) => [s.href, s]));
  return GROUPS.flatMap((g) =>
    g.items.map((i) => {
      const s = settingOf(map, i.href);
      const row = byHref.get(i.href);
      return { href: i.href, group: g.title ?? i.label, name: i.label, visible: s.visible, active: s.active, locked: isLockedProgram(i.href), updatedByName: row?.updatedByName ?? null, updatedAt: row?.updatedAt ?? null };
    }),
  );
}

const settingsOf = (rows: Row[]): ProgramSettings => Object.fromEntries(rows.filter((r) => !(r.visible && r.active)).map((r) => [r.href, { visible: r.visible, active: r.active }]));

const ALL = "all";
const ON = "on";
const OFF = "off";
const matchFlag = (want: string, on: boolean) => want === ALL || (want === ON) === on;

export function ProgramsScreen({ settings }: { settings: ProgramSettingRowDto[] }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const live = useProgramSettings();
  const [saved, setSaved] = useState(() => rowsOf(settings));
  const [value, setValue] = useState(saved);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState({ group: ALL, name: "", visible: ALL, active: ALL });
  const [pending, start] = useTransition();

  // 서버가 새 값을 주면(저장 뒤 새로 그리기, 조회) 그 값으로 다시 선다
  const [source, setSource] = useState(settings);
  if (source !== settings) {
    setSource(settings);
    const next = rowsOf(settings);
    setSaved(next);
    setValue(next);
  }

  const savedOf = useMemo(() => new Map(saved.map((r) => [r.href, r])), [saved]);
  const changed = (r: Row) => {
    const old = savedOf.get(r.href);
    return !!old && (old.visible !== r.visible || old.active !== r.active);
  };
  const dirtyRows = value.filter(changed);
  const dirty = dirtyRows.length > 0;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const patch = (href: string, next: Partial<Pick<Row, "visible" | "active">>) => setValue((v) => v.map((r) => (r.href === href ? { ...r, ...next } : r)));

  const save = () => {
    if (!dirty) return;
    const input = dirtyRows.map((r) => ({ href: r.href, visible: r.visible, active: r.active }));
    const before = live;
    // 메뉴부터 바꾼다. 서버 응답은 뒤에서 기다린다
    publishProgramSettings(settingsOf(value));
    start(async () => {
      const r = await saveProgramSettingsAction(input).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        publishProgramSettings(before);
        return say(r.error, "error");
      }
      setSaved(value);
      say(M.saved(r.written), "ok");
      router.refresh();
    });
  };

  const columns: GridCol<Row>[] = [
    { key: "group", label: M.colGroup, width: "minmax(96px,0.8fr)", value: (r) => r.group },
    { key: "name", label: M.colName, width: "minmax(140px,1.2fr)", value: (r) => r.name },
    {
      key: "visible",
      label: M.colVisible,
      width: "76px",
      align: "center",
      editable: true,
      value: (r) => (r.visible ? M.visibleLabels.on : M.visibleLabels.off),
      render: (r) => <FlagBox on={r.visible} locked={r.locked} label={M.checkVisible(r.name)} onChange={(on) => patch(r.href, { visible: on })} />,
    },
    {
      key: "active",
      label: M.colActive,
      width: "76px",
      align: "center",
      editable: true,
      value: (r) => (r.active ? M.activeLabels.on : M.activeLabels.off),
      render: (r) => <FlagBox on={r.active} locked={r.locked} label={M.checkActive(r.name)} onChange={(on) => patch(r.href, { active: on })} />,
    },
    { key: "updatedBy", label: M.colUpdatedBy, width: "minmax(80px,0.6fr)", value: (r) => r.updatedByName ?? "" },
    { key: "updatedAt", label: M.colUpdatedAt, width: "128px", align: "center", value: (r) => r.updatedAt ?? "", text: (r) => (r.updatedAt ? formatDateTime(r.updatedAt) : "") },
  ];

  const groupOptions = [{ value: ALL, label: M.all }, ...Array.from(new Set(value.map((r) => r.group)), (g) => ({ value: g, label: g }))];
  const flagOptions = (labels: { on: string; off: string }) => [
    { value: ALL, label: M.all },
    { value: ON, label: labels.on },
    { value: OFF, label: labels.off },
  ];
  const q = f.name.trim().toLowerCase();
  const rows = value.filter((r) => (f.group === ALL || r.group === f.group) && (!q || r.name.toLowerCase().includes(q)) && matchFlag(f.visible, r.visible) && matchFlag(f.active, r.active));

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.programs}
        count={rows.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          save,
          saveDisabled: !dirty,
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchGroup}>
            <FormSelect name="pg-group" label={M.searchGroup} hideLabel size="md" value={f.group} onChange={(v) => setF((x) => ({ ...x, group: v }))} options={groupOptions} />
          </SearchItem>
          <SearchItem label={M.searchName} htmlFor="pg-name">
            <TextField id="pg-name" label={M.searchName} hideLabel value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchVisible}>
            <FormSelect name="pg-visible" label={M.searchVisible} hideLabel size="md" value={f.visible} onChange={(v) => setF((x) => ({ ...x, visible: v }))} options={flagOptions(M.visibleLabels)} />
          </SearchItem>
          <SearchItem label={M.searchActive}>
            <FormSelect name="pg-active" label={M.searchActive} hideLabel size="md" value={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} options={flagOptions(M.activeLabels)} />
          </SearchItem>
        </SearchBand>
        <DataGrid
          label={M.list}
          columns={columns}
          rows={rows}
          rowKey={(r) => r.href}
          fileKey={(r) => ({ code: r.href, name: r.name })}
          selected={selected}
          onSelect={setSelected}
          rowState={(r) => (changed(r) ? "changed" : undefined)}
          rowTone={(r) => (r.visible && r.active ? undefined : "muted")}
          empty={M.empty}
          searchable
          fit
        />
      </div>
    </>
  );
}

/** 그리드 칸 안 체크. 그리드의 줄 체크 칸과 같은 모양이다(data-grid). 끌 수 없는 줄은 켜진 채 흐리게 둔다 */
function FlagBox({ on, locked, label, onChange }: { on: boolean; locked: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <span className="flex w-full justify-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        aria-label={locked ? `${label}, ${M.locked}` : label}
        checked={on}
        disabled={locked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--acc)] disabled:opacity-50"
      />
    </span>
  );
}
