"use client";
// 관리자 화면 머리 — 제목, 메뉴 위치, 고정 툴바. 모든 관리 화면이 같은 자리에 같은 단추를 세운다.
//
// 신세계TV 백오피스 화면 틀을 따른다(2026-10-29 밤, 사용자 "SBO 처럼 화면 틀 전부 통일"):
//   - 제목 옆에 메뉴 위치(상품관리 > 상품등록). 메뉴 묶음은 기둥과 같은 표(admin-nav-items 의 GROUPS)에서 찾는다.
//   - 제목 줄 오른쪽 끝에 조회, 입력, 삭제, 저장, 엑셀이 늘 같은 순서로 선다. 그 화면에서 못 쓰는 단추는 지우지 않고 흐리게 둔다 —
//     자리가 화면마다 바뀌면 손이 기억하지 못한다. 단축키도 백오피스와 같다(F8 조회, F9 저장, Shift+F8 입력, Shift+F9 삭제).
//   - 머리는 위에 붙어 따라온다(sticky). 긴 목록을 내려도 저장, 조회가 손 닿는 곳에 있다.
// 조회는 기본이 "서버에서 다시 읽기"(router.refresh)다. 엑셀은 화면의 목록 표(그리드의 data-grid 표시)를 내려받는다.
// 입력, 삭제, 저장은 그 일을 하는 화면(폼)이 함수를 넘길 때만 켜진다.
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GROUPS, isActive } from "@/components/admin/admin-nav-items";
import { useAdminStatus } from "@/components/admin/screen/status";
import { useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { buildXlsx, withRowNumbers, xlsxFileName } from "@/lib/admin/xlsx";
import { formatDateTime } from "@/lib/format";
import { registeredGrids } from "@/components/admin/screen/data-grid/export";
import { GRID_MESSAGES, SCREEN_MESSAGES as M } from "@/lib/admin/messages";
import { useSession } from "@/components/auth/session-provider";
import { askConfirm } from "@/components/ui/confirm-dialog";

type IconProps = { size?: number };
const svg = (size = 16) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });
function RefreshIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
    </svg>
  );
}
function PlusCircleIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function MinusCircleIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}
function SaveIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}
function DownloadIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    </svg>
  );
}

/** 처리 결과를 건수 안내가 덮지 않는 동안. 처리 뒤 다시 읽기는 Neon 왕복 때문에 몇 초 걸린다(neon-roundtrip-cost) — 그보다 넉넉히 */
const KEEP_RESULT_MS = 15_000;

export type ScreenTools = {
  /** 조회를 바꿔 끼울 때(예: 폼이 저장 전 값을 버리고 다시 읽기). 없으면 서버에서 다시 읽는다 */
  retrieve?: () => void;
  insert?: () => void;
  delete?: () => void;
  save?: () => void;
  /** 저장할 수 없는 상태(바뀐 값 없음, 틀린 칸). 저장 단추를 흐린다 */
  saveDisabled?: boolean;
  saving?: boolean;
  /** 저장하지 않은 바뀐 값이 있나. 있으면 조회 전에 한 번 묻는다 */
  dirty?: boolean;
};

function ToolButton({ label, tip, Icon, onClick, disabled, busy }: { label: string; tip: string; Icon: (p: IconProps) => React.ReactNode; onClick?: () => void; disabled: boolean; busy?: boolean }) {
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(disabled ? M.unused(label) : tip, true);
  return (
    <>
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
        aria-busy={busy || undefined}
        className={cn(
          "press flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11.5px] font-semibold transition-colors duration-fast [@media(pointer:fine)]:h-10",
          disabled ? "cursor-default text-dim-2/60" : "text-ink-2 hover:bg-acc-soft hover:text-acc",
          busy && "text-acc",
        )}
        {...triggerProps}
      >
        <Icon size={17} />
        {label}
      </button>
      {tooltip}
    </>
  );
}

/** 지금 화면의 목록 표를 읽는다. 그리드가 단 data-grid 표시를 따른다 — 표가 없는 화면은 빈 값 */
function readGrid(): { head: string[]; rows: string[][] } {
  const head = [...document.querySelectorAll<HTMLElement>("[data-grid-head] > *")].map((el) => el.textContent?.trim() ?? "");
  const rows = [...document.querySelectorAll<HTMLElement>("[data-grid-row]")].map((row) =>
    // 칸이 내보낼 글자를 따로 적어 두었으면(data-grid-text, 입력칸 같은 칸) 그것을 쓴다
    [...row.querySelectorAll<HTMLElement>("[data-grid-value]")].map((el) => el.dataset.gridText ?? el.innerText.replace(/\s+/g, " ").trim()),
  );
  return { head, rows };
}

/** 메뉴 위치(묶음 > 화면). 기둥 표에 없는 화면(게임 고치기 등)은 비운다 */
function usePath(): string[] {
  const pathname = usePathname();
  for (const g of GROUPS) {
    const item = g.items.find((i) => isActive(pathname, i.href));
    if (item) return g.title ? [g.title, item.label] : [item.label];
  }
  return [];
}

export function AdminScreenHead({
  title,

  count,
  note,
  actions,
  tools = {},
}: {
  title: string;
  /** 조회된 건수. 상태줄에 "N건 조회됐어요" 로 남는다 */
  count?: number;
  /** 제목 옆 작은 글(건수 등) */
  note?: React.ReactNode;
  /** 툴바 왼쪽에 서는 이 화면만의 단추(백오피스의 주황 단추 줄 자리) */
  actions?: React.ReactNode;
  tools?: ScreenTools;
}) {
  const router = useRouter();
  const { say, status } = useAdminStatus();
  const { user } = useSession();
  const path = usePath();
  const [refreshing, startRefresh] = useTransition();
  const [hasGrid, setHasGrid] = useState(false);
  const toolsRef = useRef(tools);

  useEffect(() => {
    toolsRef.current = tools;
  });

  // 서버가 준 건수를 상태줄에 남긴다. 다시 조회해서 건수가 바뀌어도 다시 쓴다.
  // 단 방금 남긴 처리 결과(걸었어요, 승인했어요, 실패 사유)는 덮지 않는다 — 처리 뒤 서버가 다시 준 목록의 건수가 바뀌며
  // 그 말을 바로 지워 무엇이 되었는지 읽을 수 없었다(2026-10-30 광고 걸기 점검)
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  });
  useEffect(() => {
    if (count === undefined) return;
    const last = statusRef.current;
    if (last && last.tone !== "info" && Date.now() - last.at < KEEP_RESULT_MS) return;
    say(M.retrieved(count), "info");
  }, [count, say]);

  // 엑셀 단추는 목록 표가 있는 화면에서만 켠다. 표는 Suspense 뒤에 늦게 설 수 있어 바뀔 때마다 다시 본다
  useEffect(() => {
    const check = () => setHasGrid(document.querySelector("[data-grid-row]") !== null);
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const retrieve = async () => {
    const t = toolsRef.current;
    if (t.dirty && !(await askConfirm(M.confirmDiscard, { confirmLabel: M.retrieve, tone: "danger" }))) return;
    if (t.retrieve) {
      t.retrieve();
      return;
    }
    say(M.refreshing);
    startRefresh(() => router.refresh());
  };
  // 다시 조회가 끝나면 결과를 남긴다. 건수를 아는 화면은 새 건수로
  const wasRefreshing = useRef(false);
  useEffect(() => {
    if (wasRefreshing.current && !refreshing) say(count !== undefined ? M.retrieved(count) : M.refreshed, "ok");
    wasRefreshing.current = refreshing;
  }, [refreshing, count, say]);

  const excel = () => {
    // 공통 그리드가 걸어 둔 전체 줄이 먼저다(쪽을 나눠도 다 나간다). 없으면 화면의 목록 표(data-grid 표시)를 읽는다
    const grid = registeredGrids()[0];
    const { head, rows, pick } = grid ?? { ...readGrid(), pick: null };
    if (rows.length === 0) {
      say(M.excelEmpty, "error");
      return;
    }
    const now = new Date();
    // 누가 내려받았는지 덧말 줄에 남긴다(2026-10-30 사용자) — 파일이 돌아다녀도 출처를 안다
    const who = user ? (user.displayName ?? user.email) : null;
    const file = buildXlsx({ title, meta: M.excelMeta(formatDateTime(now), rows.length, who), ...withRowNumbers(head, rows, GRID_MESSAGES.no) });
    const blob = new Blob([file as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = xlsxFileName({ program: title, code: pick?.code, name: pick?.name }, now);
    a.click();
    URL.revokeObjectURL(a.href);
    say(M.excelDone(rows.length), "ok");
  };

  // 백오피스 단축키. 입력 칸 안에서도 먹는다 — F 키는 글자를 치지 않으니 친 글을 가로채지 않는다
  const keysRef = useRef({ retrieve, excel });
  useEffect(() => {
    keysRef.current = { retrieve, excel };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = toolsRef.current;
      const run = (fn: (() => void) | undefined) => {
        e.preventDefault();
        fn?.();
      };
      if (e.key === "F8" && !e.shiftKey) run(keysRef.current.retrieve);
      else if (e.key === "F8" && e.shiftKey) run(t.insert);
      else if (e.key === "F9" && !e.shiftKey) run(t.saveDisabled || t.saving ? undefined : t.save);
      else if (e.key === "F9" && e.shiftKey) run(t.delete);
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && t.save) run(t.saveDisabled || t.saving ? undefined : t.save);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // 판(layout 의 흰 판) 위쪽에 붙는다 — 판의 안쪽 여백만큼 바깥으로 당겨 판 너비를 다 쓴다
    <header className="sticky top-[var(--header-h)] z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[var(--radius-panel)] border-b border-line-soft bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5">
      <div className="flex min-w-0 flex-col gap-0.5 py-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
          {/* 묶음 없는 칸(대시보드)은 경로가 곧 제목이라 두 번 적지 않는다 */}
          {path.length > 1 && (
            <nav aria-label={M.pathLabel} className="text-[12px] font-medium text-dim">
              {path.join(" > ")}
            </nav>
          )}
          {note && <span className="text-[12.5px] text-dim">{note}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <div role="toolbar" aria-label={M.toolbar} className="flex items-center rounded-xl bg-surface-2 p-0.5">
          <ToolButton label={M.retrieve} tip={M.retrieveKey} Icon={RefreshIcon} onClick={retrieve} disabled={false} busy={refreshing} />
          <ToolButton label={M.insert} tip={M.insertKey} Icon={PlusCircleIcon} onClick={tools.insert} disabled={!tools.insert} />
          <ToolButton label={M.delete} tip={M.deleteKey} Icon={MinusCircleIcon} onClick={tools.delete} disabled={!tools.delete} />
          <ToolButton label={M.save} tip={M.saveKey} Icon={SaveIcon} onClick={tools.save} disabled={!tools.save || Boolean(tools.saveDisabled)} busy={tools.saving} />
          <ToolButton label={M.excel} tip={M.excelKey} Icon={DownloadIcon} onClick={excel} disabled={!hasGrid} />
        </div>
      </div>
    </header>
  );
}
