"use client";
// 사용자별프로그램권한관리 화면 본문(2026-11-19, 사용자 "사용자별프로그램권한 관리할 수 있는 화면"). 백오피스 권한관리 꼴:
// 위 조회조건, 왼쪽 관리자 계정 그리드, 오른쪽 그 계정의 프로그램 권한 그리드. 칸은 툴바 단추와 같은 다섯(조회, 입력, 저장, 삭제, 엑셀)과
// 줄 전체를 한 번에 켜고 끄는 "전체". 그리드 안에서 바로 고치고 툴바 저장(F9, Ctrl+S)으로 한 번에 보낸다.
//
// 프로그램 목록은 메뉴 표(admin-nav-items 의 GROUPS)다 — 입력, 삭제가 없는 이유다(프로그램관리와 같다).
// 줄이 없으면 전부 막힘이다(lib/admin/grants). 조회를 끄면 나머지도 꺼지고, 나머지 하나를 켜면 조회도 켜진다 — 열리지 않는 화면의 저장 권한은 뜻이 없다.
// 대시보드 조회는 늘 켜져 있고, 내 계정의 권한관리 조회, 저장은 끌 수 없다(잠긴 칸은 켜진 채 흐리게 둔다).
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGrantsAction } from "@/app/(admin)/admin/grants/actions";
import { GROUPS } from "@/components/admin/admin-nav-items";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MasterDetail, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { confirmRowLeave } from "@/components/admin/screen/row-leave";
import { useAdminStatus } from "@/components/admin/screen/status";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { ALWAYS_READ, NO_GRANT, normalizeGrant, PROGRAM_PERMS, SELF_LOCKED, type ProgramGrant, type ProgramPerm } from "@/lib/admin/grants";
import { formatDateTime } from "@/lib/format";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";

type Row = ProgramGrant & { href: string; group: string; name: string; updatedByName: string | null; updatedAt: string | null };

/** 메뉴 표 순서 그대로 줄을 세우고 DB 값을 덮는다. 제목 없는 칸(대시보드)은 제 이름이 상위메뉴다 */
function rowsOf(dto: GrantRowDto[] = []): Row[] {
  const byHref = new Map(dto.map((r) => [r.href, r]));
  return GROUPS.flatMap((g) =>
    g.items.map((i) => {
      const r = byHref.get(i.href);
      const grant: ProgramGrant = r ? { read: r.read, insert: r.insert, save: r.save, delete: r.delete, excel: r.excel } : NO_GRANT;
      return { ...grant, href: i.href, group: g.title ?? i.label, name: i.label, updatedByName: r?.updatedByName ?? null, updatedAt: r?.updatedAt ?? null };
    }),
  );
}

const rowsByUser = (accounts: AdminAccountDto[], rows: Record<string, GrantRowDto[]>) => Object.fromEntries(accounts.map((a) => [a.id, rowsOf(rows[a.id])]));
const sameGrant = (a: ProgramGrant, b: ProgramGrant) => PROGRAM_PERMS.every((p) => a[p] === b[p]);

const ALL = "all";

export function GrantsScreen({ accounts, rows: initialRows, meId }: { accounts: AdminAccountDto[]; rows: Record<string, GrantRowDto[]>; meId: string }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [saved, setSaved] = useState(() => rowsByUser(accounts, initialRows));
  const [value, setValue] = useState(saved);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState({ account: "", group: ALL, name: "" });
  const [pending, start] = useTransition();

  // 서버가 새 값을 주면(저장 뒤 새로 그리기, 조회) 그 값으로 다시 선다
  const [source, setSource] = useState(initialRows);
  if (source !== initialRows) {
    setSource(initialRows);
    const next = rowsByUser(accounts, initialRows);
    setSaved(next);
    setValue(next);
  }

  const current = userId ? (value[userId] ?? []) : [];
  const savedOf = useMemo(() => new Map((userId ? (saved[userId] ?? []) : []).map((r) => [r.href, r])), [saved, userId]);
  const changed = (r: Row) => {
    const old = savedOf.get(r.href);
    return !!old && !sameGrant(old, r);
  };
  const dirtyRows = current.filter(changed);
  const dirty = dirtyRows.length > 0;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  /** 잠긴 칸: 대시보드 조회, 내 계정의 권한관리 조회, 저장 */
  const lockedOf = (r: Row, perm: ProgramPerm) => (perm === "read" && ALWAYS_READ.includes(r.href)) || (userId === meId && r.href === SELF_LOCKED.href && SELF_LOCKED.perms.includes(perm));

  const setRow = (href: string, next: (r: Row) => ProgramGrant) =>
    userId && setValue((v) => ({ ...v, [userId]: (v[userId] ?? []).map((r) => (r.href === href ? { ...r, ...next(r) } : r)) }));

  const toggle = (r: Row, perm: ProgramPerm, on: boolean) =>
    setRow(r.href, (row) => {
      // 조회를 끄면 나머지도 끄고, 나머지를 켜면 조회도 켠다(머리 주석)
      const g: ProgramGrant = { ...row, [perm]: on };
      if (perm !== "read" && on) g.read = true;
      return perm === "read" && !on ? normalizeGrant(g) : g;
    });
  const toggleAll = (r: Row, on: boolean) => setRow(r.href, (row) => Object.fromEntries(PROGRAM_PERMS.map((p) => [p, lockedOf(row, p) ? true : on])) as ProgramGrant);

  const revert = () => userId && setValue((v) => ({ ...v, [userId]: saved[userId] ?? [] }));

  const save = (): boolean => {
    if (!dirty || !userId) return true;
    const id = userId;
    const snapshot = value[id] ?? [];
    const input = { userId: id, rows: dirtyRows.map((r) => ({ href: r.href, read: r.read, insert: r.insert, save: r.save, delete: r.delete, excel: r.excel })) };
    start(async () => {
      const res = await saveGrantsAction(input).catch(() => ({ ok: false as const, error: M.failed }));
      if (!res.ok) return say(res.error, "error");
      setSaved((s) => ({ ...s, [id]: snapshot }));
      say(M.saved(res.written), "ok");
      router.refresh();
    });
    return true;
  };

  const pickUser = async (id: string) => {
    if (id === userId) return;
    if (!(await confirmRowLeave({ dirty, save, revert }))) return;
    setUserId(id);
    setSelected(null);
  };

  const accountColumns: GridCol<AdminAccountDto>[] = [
    { key: "name", label: M.colAccount, width: "minmax(90px,1fr)", value: (a) => a.name },
    { key: "email", label: M.colEmail, width: "minmax(120px,1.2fr)", value: (a) => a.email },
    { key: "readCount", label: M.colReadCount, width: "72px", align: "right", value: (a) => a.readCount, text: (a) => M.readCount(a.readCount) },
  ];

  const permColumn = (perm: ProgramPerm): GridCol<Row> => ({
    key: perm,
    label: M.permLabels[perm],
    width: "56px",
    align: "center",
    editable: true,
    value: (r) => (r[perm] ? "Y" : "N"),
    render: (r) => (
      <Check
        on={r[perm]}
        locked={lockedOf(r, perm)}
        label={M.checkPerm(r.name, M.permLabels[perm])}
        lockedLabel={userId === meId && r.href === SELF_LOCKED.href ? M.selfLocked : M.locked}
        onChange={(on) => toggle(r, perm, on)}
      />
    ),
  });

  const grantColumns: GridCol<Row>[] = [
    { key: "group", label: M.colGroup, width: "minmax(84px,0.7fr)", value: (r) => r.group },
    { key: "name", label: M.colName, width: "minmax(130px,1.2fr)", value: (r) => r.name },
    {
      key: "all",
      label: M.colAll,
      width: "56px",
      align: "center",
      editable: true,
      value: (r) => (PROGRAM_PERMS.every((p) => r[p]) ? "Y" : "N"),
      render: (r) => <Check on={PROGRAM_PERMS.every((p) => r[p])} locked={false} label={M.checkAll(r.name)} lockedLabel={M.locked} onChange={(on) => toggleAll(r, on)} />,
    },
    ...PROGRAM_PERMS.map(permColumn),
    { key: "updatedBy", label: M.colUpdatedBy, width: "minmax(70px,0.6fr)", value: (r) => r.updatedByName ?? "" },
    { key: "updatedAt", label: M.colUpdatedAt, width: "128px", align: "center", value: (r) => r.updatedAt ?? "", text: (r) => (r.updatedAt ? formatDateTime(r.updatedAt) : "") },
  ];

  const aq = f.account.trim().toLowerCase();
  const accountRows = accounts.filter((a) => !aq || a.name.toLowerCase().includes(aq) || a.email.toLowerCase().includes(aq));
  const groupOptions = [{ value: ALL, label: M.all }, ...Array.from(new Set(rowsOf().map((r) => r.group)), (g) => ({ value: g, label: g }))];
  const q = f.name.trim().toLowerCase();
  const grantRows = current.filter((r) => (f.group === ALL || r.group === f.group) && (!q || r.name.toLowerCase().includes(q)));
  const account = accounts.find((a) => a.id === userId);

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.grants}
        count={accountRows.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          save: () => void save(),
          saveDisabled: !dirty,
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchAccount} htmlFor="gr-account">
            <TextField id="gr-account" label={M.searchAccount} hideLabel value={f.account} onChange={(e) => setF((x) => ({ ...x, account: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchGroup}>
            <FormSelect name="gr-group" label={M.searchGroup} hideLabel size="md" value={f.group} onChange={(v) => setF((x) => ({ ...x, group: v }))} options={groupOptions} />
          </SearchItem>
          <SearchItem label={M.searchName} htmlFor="gr-name">
            <TextField id="gr-name" label={M.searchName} hideLabel value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} compact />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="420px"
          detailOpenKey={userId}
          list={
            <DataGrid
              label={M.accounts}
              columns={accountColumns}
              rows={accountRows}
              rowKey={(a) => a.id}
              fileKey={(a) => ({ code: a.email, name: a.name })}
              selected={userId}
              onSelect={(id) => void pickUser(id)}
              autoSelectFirst
              rowState={(a) => (a.id === userId && dirty ? "changed" : undefined)}
              empty={M.accountsEmpty}
              fit
            />
          }
          detailTitle={account ? M.listTitle(account.name) : M.list}
          detail={
            userId ? (
              <DataGrid
                label={M.list}
                columns={grantColumns}
                rows={grantRows}
                rowKey={(r) => r.href}
                fileKey={(r) => ({ code: r.href, name: r.name })}
                selected={selected}
                onSelect={setSelected}
                rowState={(r) => (changed(r) ? "changed" : undefined)}
                rowTone={(r) => (r.read ? undefined : "muted")}
                empty={M.empty}
                fit
              />
            ) : (
              <p className="px-1 py-6 text-center text-[13px] text-dim">{M.pickAccount}</p>
            )
          }
        />
      </div>
    </>
  );
}

/** 그리드 칸 안 체크. 프로그램관리의 칸과 같은 모양이다. 잠긴 칸은 켜진 채 흐리게 둔다 */
function Check({ on, locked, label, lockedLabel, onChange }: { on: boolean; locked: boolean; label: string; lockedLabel: string; onChange: (on: boolean) => void }) {
  return (
    <span className="flex w-full justify-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        aria-label={locked ? `${label}, ${lockedLabel}` : label}
        checked={locked || on}
        disabled={locked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--acc)] disabled:opacity-50"
      />
    </span>
  );
}
