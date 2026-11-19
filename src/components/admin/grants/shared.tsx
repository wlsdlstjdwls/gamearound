"use client";
// 권한 화면 두 개(사용자별프로그램관리, 프로그램별사용자권한관리)가 같이 쓰는 초안 상태와 칸.
// 두 화면은 같은 표(admin_program_grants)를 축만 바꿔 본다 — 계정 하나에 프로그램 줄들, 프로그램 하나에 계정 줄들.
// 그래서 초안은 "계정 -> 프로그램 -> 권한" 한 벌로 들고, 왼쪽에서 다른 줄을 골라도 고친 값은 남는다(저장은 툴바 한 번에 전부).
//
// 프로그램 목록은 메뉴 표(admin-nav-items 의 GROUPS)다 — 입력, 삭제가 없는 이유다(프로그램관리와 같다).
// 줄이 없으면 전부 막힘이다(lib/admin/grants). 사용(조회)을 끄면 나머지도 꺼지고, 나머지 하나를 켜면 사용도 켜진다.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GROUPS } from "@/components/admin/admin-nav-items";
import { reportDirty } from "@/components/admin/program-shell/store";
import { useAdminStatus } from "@/components/admin/screen/status";
import { GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { NO_GRANT, normalizeGrant, PROGRAM_PERMS, type GrantsInput, type ProgramGrant, type ProgramPerm } from "@/lib/admin/grants";
import type { AdminAccountDto, GrantRowDto } from "@/server/services/admin-grants";
import type { GrantsActionResult } from "@/server/services/admin-grants-save";

export interface ProgramRow {
  href: string;
  /** 상위메뉴. 제목 없는 칸(대시보드)은 제 이름이 상위메뉴다 */
  group: string;
  name: string;
}

export type GrantCell = ProgramGrant & { updatedByName: string | null; updatedAt: string | null };

/** 메뉴 표 순서 그대로 */
export const PROGRAMS: ProgramRow[] = GROUPS.flatMap((g) => g.items.map((i) => ({ href: i.href, group: g.title ?? i.label, name: i.label })));
export const PROGRAM_GROUPS: string[] = Array.from(new Set(PROGRAMS.map((p) => p.group)));

const EMPTY_CELL: GrantCell = { ...NO_GRANT, updatedByName: null, updatedAt: null };

type Cells = Record<string, Record<string, GrantCell>>;

function cellsOf(accounts: AdminAccountDto[], rows: Record<string, GrantRowDto[]>): Cells {
  return Object.fromEntries(accounts.map((a) => [a.id, Object.fromEntries((rows[a.id] ?? []).map((r) => [r.href, r]))]));
}

export const sameGrant = (a: ProgramGrant, b: ProgramGrant) => PROGRAM_PERMS.every((p) => a[p] === b[p]);

/** 칸 하나를 켜고 끈 결과. 사용(조회)을 끄면 나머지도 끄고, 나머지를 켜면 사용도 켠다 */
export function toggled(g: ProgramGrant, perm: ProgramPerm, on: boolean): ProgramGrant {
  const next: ProgramGrant = { ...g, [perm]: on };
  if (perm !== "read" && on) next.read = true;
  return perm === "read" && !on ? normalizeGrant(next) : next;
}

/** 줄 전체 켜기, 끄기. 잠긴 칸은 켜진 채 둔다 */
export const allSet = (on: boolean, locked: (p: ProgramPerm) => boolean): ProgramGrant =>
  Object.fromEntries(PROGRAM_PERMS.map((p) => [p, locked(p) ? true : on])) as ProgramGrant;

export function useGrantDraft(accounts: AdminAccountDto[], initialRows: Record<string, GrantRowDto[]>, action: (input: GrantsInput[]) => Promise<GrantsActionResult>) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [saved, setSaved] = useState(() => cellsOf(accounts, initialRows));
  const [value, setValue] = useState(saved);
  const [pending, start] = useTransition();

  // 서버가 새 값을 주면(저장 뒤 새로 그리기, 조회) 그 값으로 다시 선다
  const [source, setSource] = useState(initialRows);
  if (source !== initialRows) {
    setSource(initialRows);
    const next = cellsOf(accounts, initialRows);
    setSaved(next);
    setValue(next);
  }

  const cell = (userId: string, href: string): GrantCell => value[userId]?.[href] ?? EMPTY_CELL;
  const changed = (userId: string, href: string) => !sameGrant(cell(userId, href), saved[userId]?.[href] ?? EMPTY_CELL);
  const changes = accounts.flatMap((a) => PROGRAMS.filter((p) => changed(a.id, p.href)).map((p) => ({ userId: a.id, href: p.href })));
  const dirty = changes.length > 0;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const setGrant = (userId: string, href: string, next: (g: ProgramGrant) => ProgramGrant) =>
    setValue((v) => {
      const old = v[userId]?.[href] ?? EMPTY_CELL;
      return { ...v, [userId]: { ...v[userId], [href]: { ...old, ...next(old) } } };
    });

  const save = () => {
    if (!dirty) return;
    const snapshot = value;
    const byUser = new Map<string, GrantsInput["rows"]>();
    for (const { userId, href } of changes) {
      const g = cell(userId, href);
      byUser.set(userId, [...(byUser.get(userId) ?? []), { href, read: g.read, insert: g.insert, save: g.save, delete: g.delete, excel: g.excel }]);
    }
    const input = Array.from(byUser, ([userId, rows]) => ({ userId, rows }));
    start(async () => {
      const res = await action(input).catch(() => ({ ok: false as const, error: M.failed }));
      if (!res.ok) return say(res.error, "error");
      setSaved(snapshot);
      say(M.saved(res.written), "ok");
      router.refresh();
    });
  };

  const retrieve = () => {
    setValue(saved);
    router.refresh();
    say(M.reloaded);
  };

  return { cell, changed, changes, dirty, setGrant, save, retrieve, pending };
}

/** 그리드 칸 안 체크. 프로그램관리의 칸과 같은 모양이다. 잠긴 칸은 켜진 채 흐리게 둔다 */
export function Check({ on, locked, label, lockedLabel, onChange }: { on: boolean; locked: boolean; label: string; lockedLabel: string; onChange: (on: boolean) => void }) {
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
