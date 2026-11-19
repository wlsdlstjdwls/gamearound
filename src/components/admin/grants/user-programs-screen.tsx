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
import { FitFillContext } from "@/components/admin/screen/data-grid/fit";
import { MenuTree, type TreeNode } from "@/components/admin/grants/menu-tree";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { Pane, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { useTooltip } from "@/components/ui/tooltip";
import { FormSelect } from "@/components/ui/select/fields";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { FULL_GRANT, isLockedCell, NO_GRANT, SELF_LOCKED, type ProgramGrant, type ProgramPerm } from "@/lib/admin/grants";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";

const ALL = "all";
/** 트리 마디 열쇠 머리. 상위메뉴 이름과 프로그램 주소가 겹치지 않게 가른다 */
const GROUP_KEY = "g:";
const PROGRAM_KEY = "p:";
/** 권한있는 프로그램의 칸 순서. SBO 사용자프로그램관리와 같다(조회, 입력, 삭제, 저장, 출력, 엑셀 — 출력은 없다) */
const PERM_ORDER: readonly ProgramPerm[] = ["read", "insert", "delete", "save", "excel"];

type Side = "off" | "on";
/** 끌어 놓기로 실어 나르는 값의 형식 이름. 다른 화면의 끌기(파일 등)는 받지 않는다 */
const DRAG_TYPE = "application/x-admin-programs";

export function UserProgramsScreen({ accounts, rows, meId }: { accounts: AdminAccountDto[]; rows: Record<string, GrantRowDto[]>; meId: string }) {
  const draft = useGrantDraft(accounts, rows, saveUserProgramsAction);
  const { say } = useAdminStatus();
  const [userId, setUserId] = useState<string>(accounts.find((a) => a.id === meId)?.id ?? accounts[0]?.id ?? "");
  const [copyFrom, setCopyFrom] = useState("");
  /** 왼쪽 트리에서 고른 마디. ALL, 상위메뉴(g:이름), 프로그램(p:주소) */
  const [node, setNode] = useState<string>(ALL);
  const [offChecked, setOffChecked] = useState<Set<string>>(() => new Set());
  const [onChecked, setOnChecked] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  /** 지금 끌고 있는 줄이 어느 목록에서 왔나. 반대쪽 목록만 받을 자리로 밝힌다 */
  const [dragFrom, setDragFrom] = useState<Side | null>(null);
  const [dropOver, setDropOver] = useState<Side | null>(null);

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";
  const locked = (href: string, perm: ProgramPerm) => isLockedCell(meId, userId, href, perm);
  const has = (p: ProgramRow) => draft.cell(userId, p.href).read || locked(p.href, "read");

  const inGroup = PROGRAMS.filter((p) => node === ALL || node === `${GROUP_KEY}${p.group}` || node === `${PROGRAM_KEY}${p.href}`);
  const offRows = inGroup.filter((p) => !has(p));
  const onRows = inGroup.filter(has);

  /** SBO 'Program' 트리 꼴: 전체 > 상위메뉴 > 프로그램(grants/menu-tree) */
  const tree: TreeNode = {
    key: ALL,
    label: M.menuAll,
    count: PROGRAMS.length,
    children: PROGRAM_GROUPS.map((g) => {
      const items = PROGRAMS.filter((p) => p.group === g);
      return { key: `${GROUP_KEY}${g}`, label: g, count: items.length, children: items.map((p) => ({ key: `${PROGRAM_KEY}${p.href}`, label: p.name })) };
    }),
  };

  const resetChecks = () => {
    setOffChecked(new Set());
    setOnChecked(new Set());
  };

  const pickUser = (id: string) => {
    setUserId(id);
    resetChecks();
    setSelected(null);
  };

  const grant = (hrefs = offRows.filter((p) => offChecked.has(p.href)).map((p) => p.href)) => {
    if (hrefs.length === 0) return say(M.pickToGrant, "error");
    draft.commit(userId, hrefs, () => FULL_GRANT, () => M.granted(hrefs.length));
    resetChecks();
  };

  const revoke = (pickedHrefs = onRows.filter((p) => onChecked.has(p.href)).map((p) => p.href)) => {
    const picked = onRows.filter((p) => pickedHrefs.includes(p.href));
    if (picked.length === 0) return say(M.pickToRevoke, "error");
    // 늘 켜진 칸(대시보드 조회, 내 권한 화면 조회, 저장)이 걸린 줄은 회수할 수 없다 — 빼고 나머지만 거둔다
    const hrefs = picked.filter((p) => !locked(p.href, "read")).map((p) => p.href);
    if (hrefs.length === 0) return say(M.lockedSkip, "error");
    draft.commit(userId, hrefs, () => NO_GRANT, (n) => (hrefs.length < picked.length ? `${M.revoked(n)} ${M.lockedSkip}` : M.revoked(n)));
    resetChecks();
  };

  /**
   * 끌어 놓기(2026-11-19 사용자 "각 프로그램 드래그앤드랍으로도"). SBO 도 두 목록 사이를 끌어 옮긴다.
   * 끈 줄이 체크돼 있으면 체크한 줄 전부를, 아니면 그 줄 하나를 옮긴다 — 화살표 단추와 같은 일을 한다(즉시 저장)
   */
  const dragStart = (from: Side) => (key: string, e: React.DragEvent<HTMLDivElement>) => {
    const checked = from === "off" ? offChecked : onChecked;
    const hrefs = checked.has(key) ? Array.from(checked) : [key];
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ from, hrefs }));
    e.dataTransfer.effectAllowed = "move";
    // 끌려가는 그림을 줄 통째 대신 작은 이름표로 — 줄 그림은 커서를 가려 어디에 닿았는지 안 보였다
    const name = PROGRAMS.find((p) => p.href === key)?.name ?? key;
    const tag = document.createElement("div");
    tag.textContent = M.dragLabel(name, hrefs.length);
    tag.className = "fixed -left-[999px] top-0 rounded-full bg-acc px-3 py-1.5 text-[13px] font-semibold text-on-ink shadow-2";
    document.body.appendChild(tag);
    e.dataTransfer.setDragImage(tag, 14, 14);
    requestAnimationFrame(() => tag.remove());
    setDragFrom(from);
  };
  const dragEnd = () => {
    setDragFrom(null);
    setDropOver(null);
  };
  const dropZone = (to: Side) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragFrom === null || dragFrom === to || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropOver(to);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOver(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(DRAG_TYPE);
      dragEnd();
      if (!raw) return;
      const { from, hrefs } = JSON.parse(raw) as { from: Side; hrefs: string[] };
      if (from === to) return;
      if (to === "on") grant(hrefs);
      else revoke(hrefs);
    },
    onDragEnd: dragEnd,
  });

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

  const offColumns: GridCol<ProgramRow>[] = [
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
    { key: "name", label: M.colName, width: "minmax(120px,1fr)", value: (p) => p.name },
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
          {/* 이 칸만 넓힌다 — 고르기 전 안내 문구와 관리자 이름이 고정 폭(SearchItem 기본)에서 잘렸다(2026-11-19 사용자) */}
          <SearchItem label={M.copySource} auto>
            <div className="w-56">
              <FormSelect
              name="up-copy"
              label={M.copySource}
              hideLabel
              size="md"
              value={copyFrom}
              onChange={setCopyFrom}
              options={[{ value: "", label: M.copyPlaceholder }, ...accounts.filter((a) => a.id !== userId).map((a) => ({ value: a.id, label: a.name }))]}
              />
            </div>
          </SearchItem>
          <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={draft.pending}>
            {M.copy}
          </Button>
        </SearchBand>

        <div className="grid items-start gap-3 lg:grid-cols-[250px_minmax(0,1fr)_auto_480px]">
          <Pane title={M.menuTree}>
            <MenuTree
              label={M.menuTree}
              root={tree}
              selected={node}
              onSelect={(k) => {
                setNode(k);
                resetChecks();
              }}
            />
          </Pane>
          <div {...dropZone("off")} className="relative self-stretch">
            <DropHint show={dragFrom === "on"} over={dropOver === "off"} text={M.dropToRevoke} />
            {/* 두 목록과 트리는 줄 수와 상관없이 화면 바닥까지 같은 높이로 선다(2026-11-19 사용자 "권한없는 프로그램도 높이를 고정") */}
            <FitFillContext value>
            <Pane title={M.revokedList}>
              <DataGrid
                label={M.revokedList}
                columns={offColumns}
                rows={offRows}
                rowKey={(p) => p.href}
                checked={offChecked}
                onChecked={setOffChecked}
                onRowDragStart={dragStart("off")}
                empty={M.revokedEmpty}
                fit
              />
            </Pane>
            </FitFillContext>
          </div>
          <div className="flex flex-row justify-center gap-2 lg:flex-col lg:self-center">
            <MoveButton label={M.grant} hint={M.grantHint} onClick={() => grant()} disabled={draft.pending} toRight />
            <MoveButton label={M.revoke} hint={M.revokeHint} onClick={() => revoke()} disabled={draft.pending} />
          </div>
          <div {...dropZone("on")} className="relative self-stretch">
            <DropHint show={dragFrom === "off"} over={dropOver === "on"} text={M.dropToGrant} />
            <FitFillContext value>
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
                onRowDragStart={dragStart("on")}
                rowState={(p) => (draft.changed(userId, p.href) ? "changed" : undefined)}
                empty={M.grantedEmpty}
                fit
              />
            </Pane>
            </FitFillContext>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 부여, 회수 단추. 글자 없이 화살표만 둔다(2026-11-19 사용자 "부여 회수 버튼은 문구는 지우고", SBO 도 아이콘만이다).
 * 무엇을 하는지는 올리면 말풍선으로 띄우고, 낭독기에는 이름과 설명을 같이 준다
 */
function MoveButton({ label, hint, onClick, disabled, toRight = false }: { label: string; hint: string; onClick: () => void; disabled: boolean; toRight?: boolean }) {
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(`${label} | ${hint}`, true, "press");
  return (
    <>
      <button
        type="button"
        {...triggerProps}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${label}, ${hint}`}
        className="press inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-line-strong bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <ArrowLeftIcon size={18} className={toRight ? "rotate-180" : undefined} />
      </button>
      {tooltip}
    </>
  );
}

/**
 * 받을 자리 표시(2026-11-19 사용자 "잡고 드래그 하면 금지 표시뜨고 옮길수 있는지 없는지 잘 모르겠네").
 * 끄는 동안 반대쪽 목록 칸 전체(목록이 짧아도 칸 높이 끝까지)를 점선 판으로 덮고 "여기에 놓으면 부여돼요" 를 띄운다. 올리면 판이 진해진다.
 * 판은 pointer-events 를 받지 않는다 — 끌기 신호는 그 밑 칸(dropZone)이 받는다
 */
function DropHint({ show, over, text }: { show: boolean; over: boolean; text: string }) {
  if (!show) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--acc)] transition-colors duration-fast",
        over ? "bg-acc-soft/90" : "bg-surface/70",
      )}
    >
      <span className="rounded-full bg-acc px-4 py-2 text-[13.5px] font-semibold text-on-ink shadow-2">{text}</span>
    </div>
  );
}
