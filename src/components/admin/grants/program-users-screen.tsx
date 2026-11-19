"use client";
// 프로그램별사용자권한관리 화면 본문(2026-11-19). 왼쪽 프로그램(메뉴 표), 오른쪽 그 프로그램을 두고 관리자 계정마다 단추 권한.
// 칸은 툴바 단추와 같은 다섯(사용=조회, 입력, 저장, 삭제, 엑셀)과 줄 전체를 한 번에 켜고 끄는 "전체".
// 어느 계정이 어떤 프로그램을 쓰는지만 볼 때는 사용자별프로그램관리를 쓴다(같은 표, 축만 다르다 — grants/shared 머리 주석).
// 대시보드 사용은 늘 켜져 있고, 내 계정의 권한 화면 사용, 저장은 끌 수 없다(잠긴 칸은 켜진 채 흐리게 둔다).
import { useState } from "react";
import { saveGrantsAction } from "@/app/(admin)/admin/grants/actions";
import { allSet, Check, PROGRAM_GROUPS, PROGRAMS, toggled, useGrantDraft, type ProgramRow } from "@/components/admin/grants/shared";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MasterDetail, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { isLockedCell, PROGRAM_PERMS, SELF_LOCKED, type ProgramPerm } from "@/lib/admin/grants";
import { formatDateTime } from "@/lib/format";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";

const ALL = "all";

export function ProgramUsersScreen({ accounts, rows, meId }: { accounts: AdminAccountDto[]; rows: Record<string, GrantRowDto[]>; meId: string }) {
  const draft = useGrantDraft(accounts, rows, saveGrantsAction);
  const [href, setHref] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState({ group: ALL, name: "", account: "" });

  const pickProgram = (h: string) => {
    if (h === href) return;
    setHref(h);
    setSelected(null);
  };

  const programColumns: GridCol<ProgramRow>[] = [
    { key: "group", label: M.colGroup, width: "minmax(84px,0.8fr)", value: (p) => p.group },
    { key: "name", label: M.colName, width: "minmax(140px,1.4fr)", value: (p) => p.name },
  ];

  const program = PROGRAMS.find((p) => p.href === href);
  const locked = (userId: string, perm: ProgramPerm) => !!href && isLockedCell(meId, userId, href, perm);
  const lockedLabel = href && SELF_LOCKED.hrefs.includes(href) ? M.selfLocked : M.locked;
  const permLabel = (perm: ProgramPerm) => (perm === "read" ? M.colUse : M.permLabels[perm]);

  const permColumn = (perm: ProgramPerm): GridCol<AdminAccountDto> => ({
    key: perm,
    label: permLabel(perm),
    width: "56px",
    align: "center",
    editable: true,
    value: (a) => (href && draft.cell(a.id, href)[perm] ? "Y" : "N"),
    render: (a) =>
      href && (
        <Check
          on={draft.cell(a.id, href)[perm]}
          locked={locked(a.id, perm)}
          label={M.checkPerm(a.name, permLabel(perm))}
          lockedLabel={lockedLabel}
          onChange={(on) => draft.setGrant(a.id, href, (g) => toggled(g, perm, on))}
        />
      ),
  });

  const userColumns: GridCol<AdminAccountDto>[] = href
    ? [
        { key: "name", label: M.colAccount, width: "minmax(80px,0.8fr)", value: (a) => a.name },
        { key: "email", label: M.colEmail, width: "minmax(100px,1fr)", value: (a) => a.email },
        {
          key: "all",
          label: M.colAll,
          width: "56px",
          align: "center",
          editable: true,
          value: (a) => (PROGRAM_PERMS.every((p) => draft.cell(a.id, href)[p]) ? "Y" : "N"),
          render: (a) => (
            <Check
              on={PROGRAM_PERMS.every((p) => draft.cell(a.id, href)[p] || locked(a.id, p))}
              locked={false}
              label={M.checkAll(a.name)}
              lockedLabel={M.locked}
              onChange={(on) => draft.setGrant(a.id, href, () => allSet(on, (p) => locked(a.id, p)))}
            />
          ),
        },
        ...PROGRAM_PERMS.map(permColumn),
        { key: "updatedBy", label: M.colUpdatedBy, width: "minmax(64px,0.5fr)", value: (a) => draft.cell(a.id, href).updatedByName ?? "" },
        {
          key: "updatedAt",
          label: M.colUpdatedAt,
          width: "128px",
          align: "center",
          value: (a) => draft.cell(a.id, href).updatedAt ?? "",
          text: (a) => {
            const at = draft.cell(a.id, href).updatedAt;
            return at ? formatDateTime(at) : "";
          },
        },
      ]
    : [];

  const q = f.name.trim().toLowerCase();
  const programRows = PROGRAMS.filter((p) => (f.group === ALL || p.group === f.group) && (!q || p.name.toLowerCase().includes(q)));
  const aq = f.account.trim().toLowerCase();
  const userRows = accounts.filter((a) => !aq || a.name.toLowerCase().includes(aq) || a.email.toLowerCase().includes(aq));

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.grants}
        count={programRows.length}
        tools={{ retrieve: draft.retrieve, save: draft.save, saveDisabled: !draft.dirty, saving: draft.pending, dirty: draft.dirty }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchGroup}>
            <FormSelect
              name="pu-group"
              label={M.searchGroup}
              hideLabel
              size="md"
              value={f.group}
              onChange={(v) => setF((x) => ({ ...x, group: v }))}
              options={[{ value: ALL, label: M.all }, ...PROGRAM_GROUPS.map((g) => ({ value: g, label: g }))]}
            />
          </SearchItem>
          <SearchItem label={M.searchName} htmlFor="pu-name">
            <TextField id="pu-name" label={M.searchName} hideLabel value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchAccount} htmlFor="pu-account">
            <TextField id="pu-account" label={M.searchAccount} hideLabel value={f.account} onChange={(e) => setF((x) => ({ ...x, account: e.target.value }))} compact />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="300px"
          detailOpenKey={href}
          list={
            <DataGrid
              label={M.programs}
              columns={programColumns}
              rows={programRows}
              rowKey={(p) => p.href}
              fileKey={(p) => ({ code: p.href, name: p.name })}
              selected={href}
              onSelect={pickProgram}
              autoSelectFirst
              rowState={(p) => (draft.changes.some((c) => c.href === p.href) ? "changed" : undefined)}
              empty={M.programsEmpty}
              fit
            />
          }
          detailTitle={program ? M.programUsersTitle(program.name) : M.programUsersList}
          detail={
            href ? (
              <DataGrid
                label={M.programUsersList}
                columns={userColumns}
                rows={userRows}
                rowKey={(a) => a.id}
                fileKey={(a) => ({ code: a.email, name: a.name })}
                selected={selected}
                onSelect={setSelected}
                rowState={(a) => (draft.changed(a.id, href) ? "changed" : undefined)}
                rowTone={(a) => (draft.cell(a.id, href).read || locked(a.id, "read") ? undefined : "muted")}
                empty={M.accountsEmpty}
                fit
              />
            ) : (
              <p className="px-1 py-6 text-center text-[13px] text-dim">{M.pickProgram}</p>
            )
          }
        />
      </div>
    </>
  );
}
