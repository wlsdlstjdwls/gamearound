"use client";
// 사용자별프로그램관리 화면 본문(2026-11-19). 백오피스(SBO) 사용자프로그램관리(UserProgramConsentView) 꼴을 그대로 따른다 —
// 사용자 "사용자별프로그램관리는 왜 sbo랑 다르게 만듬". 처음에는 계정 목록 + "사용" 한 칸으로 만들었다가 갈아엎었다.
//
// 위 조회조건: 대상관리자, 복사대상 관리자 + [권한복사](대상 권한을 복사대상과 똑같이 덮어쓴다).
// 아래 넷: 왼쪽 상위메뉴 목록(SBO 의 메뉴 트리, 우리 메뉴는 상위메뉴 > 프로그램 두 단이라 상위메뉴 한 단이 곧 트리다)
//         | 권한없는 프로그램 | 부여, 회수 화살표 | 권한있는 프로그램(조회, 입력, 삭제, 저장, 엑셀 — SBO 칸 순서, 출력은 우리에게 없다).
// 부여, 회수, 권한복사는 누르는 즉시 저장된다(SBO 와 같다). 권한있는 프로그램의 칸 고침만 툴바 저장(F9)으로 보낸다.
// 부여는 다섯 권한을 다 켠다(SBO 가 YN 을 모두 1 로 넣는 것과 같다). 회수는 다섯을 다 끈다 — 줄이 없는 것과 같은 막힘이다(lib/admin/grants).
// 대시보드 조회는 늘 켜져 있어 늘 권한있는 쪽에 서고, 내 계정의 권한 화면 조회, 저장은 회수할 수 없다(isLockedCell).
import { useState } from "react";
import { saveUserProgramsAction } from "@/app/(admin)/admin/user-programs/actions";
import { Check, PROGRAM_GROUPS, PROGRAMS, toggled, useGrantDraft, type ProgramRow } from "@/components/admin/grants/shared";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { Pane, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { FormSelect } from "@/components/ui/select/fields";
import { ADMIN_NAV, GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { FULL_GRANT, isLockedCell, NO_GRANT, SELF_LOCKED, type ProgramGrant, type ProgramPerm } from "@/lib/admin/grants";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";

const ALL = "all";
/** 권한있는 프로그램의 칸 순서. SBO 사용자프로그램관리와 같다(조회, 입력, 삭제, 저장, 출력, 엑셀 — 출력은 없다) */
const PERM_ORDER: readonly ProgramPerm[] = ["read", "insert", "delete", "save", "excel"];

type GroupRow = { key: string; name: string; count: number };

export function UserProgramsScreen({ accounts, rows, meId }: { accounts: AdminAccountDto[]; rows: Record<string, GrantRowDto[]>; meId: string }) {
  const draft = useGrantDraft(accounts, rows, saveUserProgramsAction);
  const { say } = useAdminStatus();
  const [userId, setUserId] = useState<string>(accounts.find((a) => a.id === meId)?.id ?? accounts[0]?.id ?? "");
  const [copyFrom, setCopyFrom] = useState("");
  const [group, setGroup] = useState<string>(ALL);
  const [offChecked, setOffChecked] = useState<Set<string>>(() => new Set());
  const [onChecked, setOnChecked] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";
  const locked = (href: string, perm: ProgramPerm) => isLockedCell(meId, userId, href, perm);
  const has = (p: ProgramRow) => draft.cell(userId, p.href).read || locked(p.href, "read");

  const inGroup = PROGRAMS.filter((p) => group === ALL || p.group === group);
  const offRows = inGroup.filter((p) => !has(p));
  const onRows = inGroup.filter(has);

  const groupRows: GroupRow[] = [{ key: ALL, name: M.menuAll, count: PROGRAMS.length }, ...PROGRAM_GROUPS.map((g) => ({ key: g, name: g, count: PROGRAMS.filter((p) => p.group === g).length }))];

  const resetChecks = () => {
    setOffChecked(new Set());
    setOnChecked(new Set());
  };

  const pickUser = (id: string) => {
    setUserId(id);
    resetChecks();
    setSelected(null);
  };

  const grant = () => {
    const hrefs = offRows.filter((p) => offChecked.has(p.href)).map((p) => p.href);
    if (hrefs.length === 0) return say(M.pickToGrant, "error");
    draft.commit(userId, hrefs, () => FULL_GRANT, () => M.granted(hrefs.length));
    resetChecks();
  };

  const revoke = () => {
    const picked = onRows.filter((p) => onChecked.has(p.href));
    if (picked.length === 0) return say(M.pickToRevoke, "error");
    // 늘 켜진 칸(대시보드 조회, 내 권한 화면 조회, 저장)이 걸린 줄은 회수할 수 없다 — 빼고 나머지만 거둔다
    const hrefs = picked.filter((p) => !locked(p.href, "read")).map((p) => p.href);
    if (hrefs.length === 0) return say(M.lockedSkip, "error");
    draft.commit(userId, hrefs, () => NO_GRANT, (n) => (hrefs.length < picked.length ? `${M.revoked(n)} ${M.lockedSkip}` : M.revoked(n)));
    resetChecks();
  };

  const copy = async () => {
    if (!copyFrom) return say(M.copyPick, "error");
    if (copyFrom === userId) return say(M.copySame, "error");
    if (!(await askConfirm(M.copyConfirm(nameOf(copyFrom), nameOf(userId)), { tone: "danger", confirmLabel: M.copy }))) return;
    // 잠긴 칸은 복사로도 끄지 않는다 — 서버가 거절해 복사 전체가 실패한다
    const copied = (href: string): ProgramGrant => {
      const src = draft.cell(copyFrom, href);
      return Object.fromEntries(PERM_ORDER.map((p) => [p, src[p] || locked(href, p)])) as ProgramGrant;
    };
    const sent = draft.commit(userId, PROGRAMS.map((p) => p.href), (_old, href) => copied(href), M.copied);
    if (!sent) say(M.copied(0));
    resetChecks();
  };

  const groupColumns: GridCol<GroupRow>[] = [
    { key: "name", label: M.menuTree, width: "minmax(90px,1fr)", value: (g) => g.name },
    { key: "count", label: M.colCount, width: "48px", align: "right", value: (g) => g.count },
  ];

  const offColumns: GridCol<ProgramRow>[] = [
    { key: "id", label: M.colProgramId, width: "minmax(80px,1fr)", value: (p) => p.href },
    { key: "name", label: M.colName, width: "minmax(90px,1fr)", value: (p) => p.name },
  ];

  const permColumn = (perm: ProgramPerm): GridCol<ProgramRow> => ({
    key: perm,
    label: M.permLabels[perm],
    width: "42px",
    align: "center",
    editable: true,
    value: (p) => (draft.cell(userId, p.href)[perm] || locked(p.href, perm) ? "Y" : "N"),
    render: (p) => (
      <Check
        on={draft.cell(userId, p.href)[perm]}
        locked={locked(p.href, perm)}
        label={M.checkPerm(p.name, M.permLabels[perm])}
        lockedLabel={SELF_LOCKED.hrefs.includes(p.href) ? M.selfLocked : M.locked}
        onChange={(on) => draft.setGrant(userId, p.href, (g) => toggled(g, perm, on))}
      />
    ),
  });

  const onColumns: GridCol<ProgramRow>[] = [
    { key: "id", label: M.colProgramId, width: "minmax(80px,0.9fr)", value: (p) => p.href },
    { key: "name", label: M.colName, width: "minmax(100px,1.1fr)", value: (p) => p.name },
    ...PERM_ORDER.map(permColumn),
  ];

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.userPrograms}
        count={onRows.length}
        tools={{ retrieve: draft.retrieve, save: draft.save, saveDisabled: !draft.dirty, saving: draft.pending, dirty: draft.dirty }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.targetAccount}>
            <FormSelect name="up-target" label={M.targetAccount} hideLabel size="md" value={userId} onChange={pickUser} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          </SearchItem>
          <SearchItem label={M.copySource}>
            <FormSelect
              name="up-copy"
              label={M.copySource}
              hideLabel
              size="md"
              value={copyFrom}
              onChange={setCopyFrom}
              options={[{ value: "", label: M.copyPick }, ...accounts.filter((a) => a.id !== userId).map((a) => ({ value: a.id, label: a.name }))]}
            />
          </SearchItem>
          <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={draft.pending}>
            {M.copy}
          </Button>
        </SearchBand>

        <div className="grid items-start gap-3 lg:grid-cols-[170px_minmax(0,0.7fr)_auto_minmax(0,1.7fr)]">
          <Pane title={M.menuTree}>
            <DataGrid
              label={M.menuTree}
              columns={groupColumns}
              rows={groupRows}
              rowKey={(g) => g.key}
              selected={group}
              onSelect={(k) => {
                setGroup(k);
                resetChecks();
              }}
              empty={M.programsEmpty}
              fit
            />
          </Pane>
          <Pane title={M.revokedList}>
            <DataGrid
              label={M.revokedList}
              columns={offColumns}
              rows={offRows}
              rowKey={(p) => p.href}
              checked={offChecked}
              onChecked={setOffChecked}
              empty={M.revokedEmpty}
              fit
            />
          </Pane>
          <div className="flex flex-row justify-center gap-2 lg:flex-col lg:self-center">
            <Button size="sm" variant="secondary" onClick={grant} disabled={draft.pending} aria-label={M.grantHint}>
              {M.grant}
              <ChevronLeftIcon size={14} className="rotate-180" />
            </Button>
            <Button size="sm" variant="secondary" onClick={revoke} disabled={draft.pending} aria-label={M.revokeHint}>
              <ChevronLeftIcon size={14} />
              {M.revoke}
            </Button>
          </div>
          <Pane title={M.grantedList}>
            <DataGrid
              label={M.grantedList}
              columns={onColumns}
              rows={onRows}
              rowKey={(p) => p.href}
              fileKey={(p) => ({ code: p.href, name: p.name })}
              selected={selected}
              onSelect={setSelected}
              checked={onChecked}
              onChecked={setOnChecked}
              rowState={(p) => (draft.changed(userId, p.href) ? "changed" : undefined)}
              empty={M.grantedEmpty}
              fit
            />
          </Pane>
        </div>
      </div>
    </>
  );
}
