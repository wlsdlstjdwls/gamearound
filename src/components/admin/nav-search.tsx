"use client";
// 관리자 메뉴 검색(2026-11-02, 사용자 "메뉴 검색 기능", SBO 오른쪽 위 돋보기의 프로그램 검색).
//
// 넓은 화면은 가운데 위에 뜨는 판 하나다. 기둥의 검색 단추, 접힌 기둥의 돋보기, 어느 화면에서든 Ctrl+K 가 같은 판을 연다.
// 휴대폰은 더보기 시트 맨 위에 같은 입력칸과 결과 목록(MenuSearchPanel)을 그대로 세운다 — 시트 위에 판을 또 띄우지 않는다.
// 거르는 규칙(초성, 별칭, 순위)은 lib/admin/menu-search 순수 함수다.
//
// 빈 칸으로 열면 즐겨찾기와 최근 연 화면을 보여 준다. 최근은 이 기기의 localStorage 에만 둔다(lib/admin/favorites 주석).
// 결과 줄은 진짜 링크다 — 탭 껍데기(program-shell)가 링크 누름을 가로채 탭으로 연다. Enter 도 그 링크를 누른다(따로 이동하지 않는다).
// 탭 안 문서(iframe)에서 누른 Ctrl+K 는 그 문서에만 닿으므로 바깥에 알려 바깥이 판을 연다 — 판이 탭 안에 갇히면 기둥 폭만큼 잘린다.
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { groupsFor, ITEMS, type Item } from "@/components/admin/admin-nav-items";
import { useMobilePolicy } from "@/components/admin/mobile-policy";
import { useFavorites } from "@/components/admin/nav-favorites";
import { StarIcon } from "@/components/admin/nav-icons";
import { inFrame, isFrameMessage, postToTop } from "@/components/admin/program-shell/frame";
import { programOf } from "@/components/admin/program-shell/programs";
import { SearchIcon } from "@/components/ui/icons";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ADMIN_MENU_KEYWORDS } from "@/lib/admin/menu-keywords";
import { ADMIN_RECENT_MAX, ADMIN_RECENT_STORAGE_KEY } from "@/lib/admin/favorites";
import { pushRecent, searchMenu } from "@/lib/admin/menu-search";
import { cn } from "@/lib/cn";

type Entry = Item & { group?: string; keywords?: readonly string[] };

// ---- 판 열림 상태(기둥 단추, 단축키, 탭 안 문서가 같이 연다) ----
let open = false;
const listeners = new Set<() => void>();
function setOpen(v: boolean) {
  open = v;
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const openMenuSearch = () => setOpen(true);

// ---- 최근 연 화면 ----
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(ADMIN_RECENT_STORAGE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((h): h is string => typeof h === "string") : [];
  } catch {
    return [];
  }
}

/** 지금 화면이 메뉴 칸이면 최근 목록 맨 앞에 올린다. 기둥이 지금 주소(탭 껍데기면 고른 탭)를 넘긴다 */
export function useTrackRecent(pathname: string) {
  const key = programOf(pathname).key;
  useEffect(() => {
    if (!ITEMS.some((i) => i.href === key)) return;
    try {
      localStorage.setItem(ADMIN_RECENT_STORAGE_KEY, JSON.stringify(pushRecent(readRecent(), key, ADMIN_RECENT_MAX)));
    } catch {
      // 못 적으면 최근 목록이 비어 보일 뿐이다
    }
  }, [key]);
}

/** Ctrl+K(맥은 Cmd+K). 바깥 문서는 판을 열고, 탭 안 문서는 바깥에 알린다. 메뉴(admin-nav)가 한 번 부른다 */
export function useMenuSearchHotkey() {
  useEffect(() => {
    const frame = inFrame();
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      if (frame) postToTop({ type: "admin-search" });
      else setOpen(true);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && isFrameMessage(e.data) && e.data.type === "admin-search") setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    if (!frame) window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMessage);
    };
  }, []);
}

/** 찾을 칸 전부. 휴대폰이면 닫힌 화면은 메뉴처럼 뺀다(groupsFor) */
function useEntries(): Entry[] {
  const { mobile } = useMobilePolicy();
  return useMemo(
    () => groupsFor(mobile).flatMap((g) => g.items.map((item) => ({ ...item, group: g.title, keywords: ADMIN_MENU_KEYWORDS[item.href] }))),
    [mobile],
  );
}

/**
 * 입력칸 + 결과 목록. 판(MenuSearchDialog)과 휴대폰 더보기 시트가 같이 쓴다.
 * `withEmptyLists` 면 빈 칸일 때 즐겨찾기, 최근 연 화면을 보인다(시트는 그 아래에 메뉴 전체가 이미 있어 끈다).
 */
export function MenuSearchPanel({
  query,
  onQuery,
  onPick,
  withEmptyLists,
  autoFocus,
}: {
  query: string;
  onQuery: (q: string) => void;
  onPick?: () => void;
  withEmptyLists?: boolean;
  autoFocus?: boolean;
}) {
  const entries = useEntries();
  const favorites = useFavorites();
  const [recent] = useState(() => (withEmptyLists ? readRecent() : []));
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const sections = useMemo(() => {
    const byHref = (hrefs: readonly string[]) => hrefs.map((h) => entries.find((e) => e.href === h)).filter((e): e is Entry => Boolean(e));
    if (query.trim()) return [{ title: ADMIN_NAV.searchResults, rows: searchMenu(entries, query), favorite: false }];
    if (!withEmptyLists) return [];
    return [
      { title: ADMIN_NAV.groupFavorites, rows: byHref(favorites ?? []), favorite: true },
      // 즐겨찾기에 이미 선 칸은 최근에서 뺀다 — 같은 줄이 두 번 서면 고를 줄만 늘어난다
      { title: ADMIN_NAV.searchRecent, rows: byHref(recent.filter((h) => !(favorites ?? []).includes(h))), favorite: false },
    ].filter((s) => s.rows.length > 0);
  }, [entries, favorites, recent, query, withEmptyLists]);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  // 고른 줄이 상자 밖이면 끌어온다. 질의가 바뀌면 첫 줄부터(입력칸 onChange 가 되돌린다)
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!total) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + total) % total);
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      listRef.current?.querySelector<HTMLAnchorElement>(`[data-row="${active}"]`)?.click();
    }
  };

  let index = 0;
  return (
    <div className="flex min-h-0 flex-col">
      <label className="flex items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 focus-within:border-acc">
        <SearchIcon size={17} className="shrink-0 text-dim" />
        <span className="sr-only">{ADMIN_NAV.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={total > 0}
          aria-controls={listId}
          aria-activedescendant={total ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={ADMIN_NAV.searchPlaceholder}
          // 16px — iOS 가 입력칸을 누를 때 화면을 키우지 않는다(AGENTS §6)
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim [@media(pointer:fine)]:h-10 [@media(pointer:fine)]:text-[14px]"
        />
      </label>
      <div ref={listRef} id={listId} role="listbox" aria-label={ADMIN_NAV.search} className="mt-2 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain empty:mt-0">
        {query.trim() && total === 0 && <p className="px-2 py-3 text-[13px] text-dim">{ADMIN_NAV.searchEmpty(query.trim())}</p>}
        {sections.map((s) => (
          <div key={s.title} role="group" aria-label={s.title} className="flex flex-col gap-px">
            <p aria-hidden className="px-2 pb-1 pt-1 text-[11.5px] font-bold text-dim-2">
              {s.title}
            </p>
            {s.rows.map((row) => {
              const i = index++;
              const on = i === active;
              const { Icon } = row;
              return (
                <Link
                  key={`${s.title}-${row.href}`}
                  id={`${listId}-${i}`}
                  data-row={i}
                  role="option"
                  aria-selected={on}
                  href={row.href}
                  onClick={onPick}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors duration-fast [@media(pointer:fine)]:min-h-9",
                    on ? "bg-acc-soft text-acc" : "text-ink-2",
                  )}
                >
                  {s.favorite ? <StarIcon size={15} filled className="shrink-0 text-acc" /> : <Icon size={15} />}
                  <span className="min-w-0 flex-1 truncate font-semibold">{row.label}</span>
                  {row.group && <span className="shrink-0 text-[12px] text-dim">{row.group}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 넓은 화면의 검색 판. 메뉴(admin-nav)에 하나만 둔다 */
export function MenuSearchDialog() {
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    else if (!isOpen && d.open) d.close();
  }, [isOpen]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <dialog
      ref={ref}
      aria-label={ADMIN_NAV.search}
      onClose={close}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // 막(바깥) 누름으로 닫는다 — 판 안을 누르면 target 이 판 안쪽 요소다
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className="confirm-dialog mx-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] rounded-[var(--radius-md)] border border-line bg-surface p-3 text-ink shadow-3"
    >
      {/* 열 때마다 새로 그린다 — 최근 목록을 다시 읽고 입력칸에 포커스가 간다 */}
      {isOpen && (
        <div className="flex max-h-[min(480px,70vh)] flex-col">
          <MenuSearchPanel query={query} onQuery={setQuery} onPick={close} withEmptyLists autoFocus />
        </div>
      )}
    </dialog>
  );
}

/** 기둥 맨 위 검색 단추. 펼친 기둥은 입력칸 꼴(단축키 표시), 접힌 기둥은 돋보기 하나 */
export function MenuSearchButton({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={openMenuSearch}
        aria-label={ADMIN_NAV.search}
        aria-keyshortcuts="Control+K"
        className="press mx-auto flex size-10 shrink-0 items-center justify-center rounded-lg text-mut transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <SearchIcon size={18} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openMenuSearch}
      aria-keyshortcuts="Control+K"
      className="press flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 text-[13px] text-dim transition-colors hover:border-line-strong hover:text-ink"
    >
      <SearchIcon size={15} className="shrink-0" />
      <span className="flex-1 text-left">{ADMIN_NAV.search}</span>
      <kbd className="rounded border border-line bg-surface px-1 font-sans text-[11px] text-dim">{ADMIN_NAV.searchKey}</kbd>
    </button>
  );
}
