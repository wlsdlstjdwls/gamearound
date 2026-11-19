"use client";
// 사용자별프로그램관리 화면 본문(2026-11-19, 사용자 "사용자별프로그램관리... 화면이 보이냐 마냐, 접속 가능하냐 마냐").
// 왼쪽 관리자 계정, 오른쪽 그 계정이 쓸 수 있는 프로그램. 칸은 "사용" 하나다 — 켜면 메뉴에 보이고 들어갈 수 있고, 끄면 메뉴에서 빠지고 막힌다.
// 들어간 뒤 입력, 저장, 삭제, 엑셀까지 나누는 일은 프로그램별사용자권한관리가 한다. 사용은 그 화면의 첫 칸(조회)과 같은 값이다.
// 사용을 새로 켜면 조회만 켜진다 — 단추 권한은 따로 주게 둔다. 끄면 단추 권한도 같이 꺼진다(lib/admin/grants 의 normalizeGrant).
import { useState } from "react";
import { saveUserProgramsAction } from "@/app/(admin)/admin/user-programs/actions";
import { Check, PROGRAM_GROUPS, PROGRAMS, toggled, useGrantDraft, type ProgramRow } from "@/components/admin/grants/shared";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MasterDetail, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { isLockedCell, SELF_LOCKED } from "@/lib/admin/grants";
import { formatDateTime } from "@/lib/format";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";

const ALL = "all";
const USE_ON = "on";
const USE_OFF = "off";

export function UserProgramsScreen({ accounts, rows, meId }: { accounts: AdminAccountDto[]; rows: Record<string, GrantRowDto[]>; meId: string }) {
  const draft = useGrantDraft(accounts, rows, saveUserProgramsAction);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState({ account: "", group: ALL, name: "", use: ALL });

  const pickUser = (id: string) => {
    if (id === userId) return;
    setUserId(id);
    setSelected(null);
  };

  const accountColumns: GridCol<AdminAccountDto>[] = [
    { key: "name", label: M.colAccount, width: "minmax(90px,1fr)", value: (a) => a.name },
    { key: "email", label: M.colEmail, width: "minmax(120px,1.2fr)", value: (a) => a.email },
  ];

  const programColumns: GridCol<ProgramRow>[] = userId
    ? [
        { key: "group", label: M.colGroup, width: "minmax(84px,0.8fr)", value: (p) => p.group },
        { key: "name", label: M.colName, width: "minmax(150px,1.4fr)", value: (p) => p.name },
        {
          key: "use",
          label: M.colUse,
          width: "64px",
          align: "center",
          editable: true,
          value: (p) => (draft.cell(userId, p.href).read ? "Y" : "N"),
          render: (p) => (
            <Check
              on={draft.cell(userId, p.href).read}
              locked={isLockedCell(meId, userId, p.href, "read")}
              label={M.checkUse(p.name)}
              lockedLabel={SELF_LOCKED.hrefs.includes(p.href) ? M.selfLocked : M.locked}
              onChange={(on) => draft.setGrant(userId, p.href, (g) => toggled(g, "read", on))}
            />
          ),
        },
        { key: "updatedBy", label: M.colUpdatedBy, width: "minmax(70px,0.6fr)", value: (p) => draft.cell(userId, p.href).updatedByName ?? "" },
        {
          key: "updatedAt",
          label: M.colUpdatedAt,
          width: "128px",
          align: "center",
          value: (p) => draft.cell(userId, p.href).updatedAt ?? "",
          text: (p) => {
            const at = draft.cell(userId, p.href).updatedAt;
            return at ? formatDateTime(at) : "";
          },
        },
      ]
    : [];

  const aq = f.account.trim().toLowerCase();
  const accountRows = accounts.filter((a) => !aq || a.name.toLowerCase().includes(aq) || a.email.toLowerCase().includes(aq));
  const q = f.name.trim().toLowerCase();
  const used = (p: ProgramRow) => !!userId && (draft.cell(userId, p.href).read || isLockedCell(meId, userId, p.href, "read"));
  const programRows = PROGRAMS.filter(
    (p) => (f.group === ALL || p.group === f.group) && (!q || p.name.toLowerCase().includes(q)) && (f.use === ALL || (f.use === USE_ON) === used(p)),
  );
  const account = accounts.find((a) => a.id === userId);

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.userPrograms}
        count={accountRows.length}
        tools={{ retrieve: draft.retrieve, save: draft.save, saveDisabled: !draft.dirty, saving: draft.pending, dirty: draft.dirty }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchAccount} htmlFor="up-account">
            <TextField id="up-account" label={M.searchAccount} hideLabel value={f.account} onChange={(e) => setF((x) => ({ ...x, account: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchGroup}>
            <FormSelect
              name="up-group"
              label={M.searchGroup}
              hideLabel
              size="md"
              value={f.group}
              onChange={(v) => setF((x) => ({ ...x, group: v }))}
              options={[{ value: ALL, label: M.all }, ...PROGRAM_GROUPS.map((g) => ({ value: g, label: g }))]}
            />
          </SearchItem>
          <SearchItem label={M.searchName} htmlFor="up-name">
            <TextField id="up-name" label={M.searchName} hideLabel value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchUse}>
            <FormSelect
              name="up-use"
              label={M.searchUse}
              hideLabel
              size="md"
              value={f.use}
              onChange={(v) => setF((x) => ({ ...x, use: v }))}
              options={[
                { value: ALL, label: M.all },
                { value: USE_ON, label: M.useOn },
                { value: USE_OFF, label: M.useOff },
              ]}
            />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="360px"
          detailOpenKey={userId}
          list={
            <DataGrid
              label={M.accounts}
              columns={accountColumns}
              rows={accountRows}
              rowKey={(a) => a.id}
              fileKey={(a) => ({ code: a.email, name: a.name })}
              selected={userId}
              onSelect={pickUser}
              autoSelectFirst
              rowState={(a) => (draft.changes.some((c) => c.userId === a.id) ? "changed" : undefined)}
              empty={M.accountsEmpty}
              fit
            />
          }
          detailTitle={account ? M.userProgramsTitle(account.name) : M.userProgramsList}
          detail={
            userId ? (
              <DataGrid
                label={M.userProgramsList}
                columns={programColumns}
                rows={programRows}
                rowKey={(p) => p.href}
                fileKey={(p) => ({ code: p.href, name: p.name })}
                selected={selected}
                onSelect={setSelected}
                rowState={(p) => (draft.changed(userId, p.href) ? "changed" : undefined)}
                rowTone={(p) => (used(p) ? undefined : "muted")}
                empty={M.programsEmpty}
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
