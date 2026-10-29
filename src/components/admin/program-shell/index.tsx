"use client";
// 프로그램 껍데기(2026-10-30 사용자 "SBO 처럼 윈도우 프로그램, 탭 이동 때 새로 조회하지 말고 있던 화면, 입력값도 다 있어야").
// 메뉴에서 연 화면이 탭으로 쌓이고, 탭을 오가면 **그 화면이 내려가지 않고 숨었다가 다시 보인다** — 조회 결과, 입력 중인 값, 스크롤이 그대로다.
//
// 어떻게 붙드나:
//   - 처음 연 주소의 화면은 이 레이아웃의 children 그대로(inline 탭). 다시 그리지 않으려고 바깥 주소를 바꾸지 않는다.
//   - 그 뒤 여는 프로그램은 탭마다 iframe 하나로 띄운다. 같은 앱의 같은 주소를 연다 — 탭 안 문서는 html 에 data-admin-frame 이 찍혀
//     기둥, 탭 줄, 머리띠를 숨기고 판만 보인다(globals.css). 안 보이는 탭은 display:none 이라 상태가 그대로 산다.
//   - Next 의 경로 이동으로는 못 한다: 이동하면 앞 화면이 내려가고, 붙드는 cacheComponents(Activity)는 최근 셋까지이고 앱 전체 캐시 방식을 바꾼다.
//   - 탭 iframe 은 처음 고를 때 띄운다(새로 고친 뒤 기억한 탭을 한꺼번에 띄우면 화면 수만큼 조회가 몰린다).
//
// 링크: 다른 프로그램으로 가는 링크(기둥 메뉴, ProgramLink, 탭 안 링크)는 이동하지 않고 탭을 열거나 고른다. 같은 프로그램 안 이동은 그 탭 안에서 일어난다.
// 저장 안 한 값: 화면이 reportDirty 로 알리면(store) 탭에 점이 서고, 닫거나 새로 고칠 때 자체 팝업으로 묻는다.
// 좁은 화면(md 아래)은 탭 없이 평소처럼 이동한다 — 탭 줄이 설 자리가 없다.
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TabBar } from "@/components/admin/program-shell/tab-bar";
import { inFrame, isFrameMessage, postToTop } from "@/components/admin/program-shell/frame";
import { isAdminPath, programOf } from "@/components/admin/program-shell/programs";
import { reportDirty, setActivePath, useDirty } from "@/components/admin/program-shell/store";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

type Tab = { key: string; label: string; href: string };

const STORAGE_KEY = "admin-program-tabs";
/** 이보다 많이 열면 가장 오래 안 본 탭부터 닫는다(저장 안 한 값이 있는 탭은 남긴다). 넓은 화면 한 줄에 들어가는 수다 */
const MAX_TABS = 10;
/** 탭 줄과 판 위아래 여백을 뺀 높이 — 탭 안 문서가 제 안에서 굴러가야 머리 툴바, 미리 보기 기둥의 sticky 가 산다 */
const FRAME_HEIGHT = "calc(100dvh - 5rem)";
const WIDE = "(min-width: 768px)";

const HOME_KEY = ROUTES.admin;

function loadTabs(): Tab[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Tab[];
    return Array.isArray(raw) ? raw.filter((t) => t && typeof t.key === "string" && typeof t.href === "string" && typeof t.label === "string") : [];
  } catch {
    return [];
  }
}

function saveTabs(tabs: Tab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // 저장을 못 하면 이 창 안에서만 기억한다
  }
}

/** 눌린 것이 관리 화면으로 가는 평범한 링크면 그 주소. 새 창, 수정키, 내려받기는 건드리지 않는다 */
function adminLinkOf(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && isAdminPath(url.pathname) ? url : null;
}

type Mode = "pending" | "top" | "frame" | "off";
let modeCache: Mode | null = null;
/** 어느 문서인지 — 탭 안이면 판만, 좁으면 탭 없이, 넓은 바깥이면 껍데기. 문서가 사는 동안 바뀌지 않아 한 번만 잰다 */
function clientMode(): Mode {
  modeCache ??= inFrame() ? "frame" : window.matchMedia(WIDE).matches ? "top" : "off";
  return modeCache;
}
const subscribeNever = () => () => {};

const isReloadKey = (e: KeyboardEvent) => e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");

export function ProgramShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = programOf(pathname);
  const hereHref = search ? `${pathname}?${search}` : pathname;
  const mode = useSyncExternalStore(subscribeNever, clientMode, () => "pending" as const);
  // inline 탭 = 이 문서가 처음 그린 화면. 그 안에서 조건을 바꾸면 주소만 바뀐다
  const [tabs, setTabs] = useState<Tab[]>(() => [{ key: here.key, label: here.label, href: hereHref }]);
  const [active, setActive] = useState(here.key);
  const [inlineClosed, setInlineClosed] = useState(false);
  /** iframe 을 한 번이라도 띄운 탭. 처음 고를 때 띄운다 */
  const [mounted, setMounted] = useState<ReadonlySet<string>>(new Set());
  const [frameDirty, setFrameDirty] = useState<ReadonlyMap<string, boolean>>(new Map());
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const seen = useRef(new Map<string, number>());
  const inlineDirty = useDirty();
  const inlineKey = here.key;

  // 바깥 껍데기가 처음 서는 순간 기억해 둔 탭을 잇고, inline 화면의 주소가 바뀌면(조회조건) 그 탭이 마지막 주소로 기억한다.
  // 코드가 다른 프로그램으로 옮겨 갔으면(router.push) 그 프로그램이 새 inline 탭이 된다.
  // 이펙트가 아니라 렌더 중에 맞춘다(React 의 "앞 값과 견줘 상태 고치기") — 이펙트에서 바꾸면 한 번 옛 탭으로 그렸다가 다시 그린다
  const [synced, setSynced] = useState<string | null>(null);
  if (mode === "top" && synced !== hereHref) {
    const first = synced === null;
    setSynced(hereHref);
    setTabs((cur) => {
      const base = first ? [cur[0], ...loadTabs().filter((t) => t.key !== cur[0].key)] : cur;
      return base.some((t) => t.key === inlineKey) ? base.map((t) => (t.key === inlineKey ? { ...t, href: hereHref } : t)) : [...base, { key: inlineKey, label: here.label, href: hereHref }];
    });
    setInlineClosed(false);
    setActive(inlineKey);
  }

  useEffect(() => {
    if (mode === "top") saveTabs(tabs);
  }, [mode, tabs]);

  // 기둥 메뉴가 켤 칸 = 고른 탭
  useEffect(() => {
    if (mode !== "top") return setActivePath(null);
    seen.current.set(active, Date.now());
    // 대시보드는 목록(tabs)에 없고 withHome 이 앞에 붙인다 — 목록에서만 찾으면 대시보드를 골라도 처음 연 화면의 칸이 켜졌다
    const t = withHome(tabs).find((x) => x.key === active);
    setActivePath(t ? t.href.split("?")[0] : null);
  }, [mode, active, tabs]);

  const isDirty = useCallback((key: string) => (key === inlineKey && !inlineClosed ? inlineDirty : (frameDirty.get(key) ?? false)), [inlineKey, inlineClosed, inlineDirty, frameDirty]);

  const pick = useCallback((key: string) => {
    setActive(key);
    setMounted((m) => (m.has(key) ? m : new Set(m).add(key)));
  }, []);

  const open = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      const p = programOf(path);
      // 처음 그린 화면의 프로그램이면 그 화면을 고른다(닫았으면 새 탭으로 띄운다)
      if (p.key === inlineKey && !inlineClosed) return pick(p.key);
      setTabs((cur) => {
        if (cur.some((t) => t.key === p.key)) return cur;
        let next = [...cur, { key: p.key, label: p.label, href }];
        while (next.length > MAX_TABS) {
          const victim = next
            .filter((t) => t.key !== p.key && t.key !== HOME_KEY && !isDirty(t.key) && !(t.key === inlineKey && !inlineClosed))
            .sort((a, b) => (seen.current.get(a.key) ?? 0) - (seen.current.get(b.key) ?? 0))[0];
          if (!victim) break;
          next = next.filter((t) => t !== victim);
        }
        return next;
      });
      pick(p.key);
    },
    [inlineKey, inlineClosed, isDirty, pick],
  );

  const close = useCallback(
    async (key: string) => {
      if (key === HOME_KEY) return;
      const label = tabs.find((t) => t.key === key)?.label ?? "";
      if (isDirty(key) && !(await askConfirm(SM.closeDirtyConfirm(label), { title: SM.dirtyTitle, confirmLabel: SM.closeDirty, tone: "danger" }))) return;
      const all = withHome(tabs);
      const i = all.findIndex((t) => t.key === key);
      setTabs((cur) => cur.filter((t) => t.key !== key));
      setMounted((m) => {
        const n = new Set(m);
        n.delete(key);
        return n;
      });
      setFrameDirty((m) => {
        const n = new Map(m);
        n.delete(key);
        return n;
      });
      if (key === inlineKey) setInlineClosed(true);
      // 지금 탭을 닫으면 바로 앞 탭으로(윈도우 탭과 같다)
      if (key === active) pick(all[Math.max(0, i - 1)]?.key ?? HOME_KEY);
    },
    [tabs, isDirty, inlineKey, active, pick],
  );

  const closeOthers = useCallback(async () => {
    const others = tabs.filter((t) => t.key !== active && t.key !== HOME_KEY);
    if (others.some((t) => isDirty(t.key)) && !(await askConfirm(SM.closeOthersDirtyConfirm, { title: SM.dirtyTitle, confirmLabel: SM.closeDirty, tone: "danger" }))) return;
    if (others.some((t) => t.key === inlineKey)) setInlineClosed(true);
    setTabs((cur) => cur.filter((t) => t.key === active || t.key === HOME_KEY));
    setMounted((m) => new Set([...m].filter((k) => k === active || k === HOME_KEY)));
    setFrameDirty(new Map());
  }, [tabs, active, isDirty, inlineKey]);

  // 바깥: 탭 안 문서의 말을 받는다(어느 탭인지는 보낸 창으로 가린다)
  useEffect(() => {
    if (mode !== "top") return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !isFrameMessage(e.data)) return;
      const key = [...frames.current.entries()].find(([, f]) => f.contentWindow === e.source)?.[0];
      const msg = e.data;
      if (msg.type === "admin-open") return open(msg.href);
      if (!key) return;
      if (msg.type === "admin-loc") setTabs((cur) => cur.map((t) => (t.key === key ? { ...t, href: msg.href } : t)));
      else setFrameDirty((m) => new Map(m).set(key, msg.dirty));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, open]);

  // 탭 안: 주소와 저장 안 한 값을 바깥에 알린다(이 문서의 저장 안 한 값은 inlineDirty 와 같은 값이다)
  const frameDirtyHere = inlineDirty;
  useEffect(() => {
    if (mode === "frame") postToTop({ type: "admin-loc", href: hereHref });
  }, [mode, hereHref]);
  useEffect(() => {
    if (mode === "frame") postToTop({ type: "admin-dirty", dirty: frameDirtyHere });
  }, [mode, frameDirtyHere]);

  // 다른 프로그램으로 가는 링크는 이동하지 않고 탭을 연다. window 캡처라 화면의 이탈 확인(document 캡처)보다 먼저 받는다
  useEffect(() => {
    if (mode !== "top" && mode !== "frame") return;
    const onClick = (e: MouseEvent) => {
      const url = adminLinkOf(e);
      if (!url) return;
      const href = url.pathname + url.search + url.hash;
      const sameProgram = programOf(url.pathname).key === programOf(location.pathname).key;
      if (mode === "frame") {
        if (sameProgram) return;
        e.preventDefault();
        return postToTop({ type: "admin-open", href });
      }
      // 바깥: inline 화면 안에서 같은 프로그램으로 가는 링크만 그 자리에서 간다. 기둥, 탭 줄의 링크는 늘 탭을 연다
      const inInline = (e.target as Element).closest("[data-program-inline]");
      if (inInline && sameProgram) return;
      e.preventDefault();
      open(href);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [mode, open]);

  // 새로 고침 키: 탭 안이면 그 탭만 다시 연다, 바깥이면 저장 안 한 탭이 있을 때만 묻는다(브라우저 경고창은 쓰지 않는다)
  useEffect(() => {
    if (mode !== "top" && mode !== "frame") return;
    const onKey = async (e: KeyboardEvent) => {
      if (!isReloadKey(e)) return;
      const dirty = mode === "frame" ? frameDirtyHere : withHome(tabs).some((t) => isDirty(t.key));
      if (mode === "top" && !dirty) return;
      e.preventDefault();
      if (dirty && !(await askConfirm(SM.reloadDirtyConfirm, { title: SM.dirtyTitle, confirmLabel: SM.reloadDirty, tone: "danger" }))) return;
      if (mode === "frame") reportDirty(false);
      location.reload();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, frameDirtyHere, tabs, isDirty]);

  if (mode === "frame" || mode === "off") return <>{children}</>;

  const shown = withHome(tabs);
  const inlineVisible = active === inlineKey && !inlineClosed;
  return (
    <>
      <TabBar
        tabs={shown.map((t) => ({ key: t.key, label: t.label, dirty: isDirty(t.key), closable: t.key !== HOME_KEY }))}
        active={active}
        onPick={pick}
        onClose={close}
        onCloseOthers={closeOthers}
      />
      <div data-program-inline hidden={!inlineVisible}>
        {children}
      </div>
      {shown
        .filter((t) => !(t.key === inlineKey && !inlineClosed) && mounted.has(t.key))
        .map((t) => (
          <iframe
            key={t.key}
            ref={(el) => {
              if (el) frames.current.set(t.key, el);
              else frames.current.delete(t.key);
            }}
            title={t.label}
            src={t.href}
            hidden={t.key !== active}
            className="block w-full rounded-[var(--radius-panel)] border-0 bg-transparent"
            style={{ height: FRAME_HEIGHT }}
          />
        ))}
    </>
  );
}

/** 대시보드는 늘 맨 앞에 있다(닫지 못한다). 처음 연 화면이 대시보드면 그 탭이 곧 대시보드다 */
function withHome(tabs: Tab[]): Tab[] {
  if (tabs.some((t) => t.key === HOME_KEY)) return [tabs.find((t) => t.key === HOME_KEY)!, ...tabs.filter((t) => t.key !== HOME_KEY)];
  return [{ key: HOME_KEY, label: programOf(HOME_KEY).label, href: HOME_KEY }, ...tabs];
}
