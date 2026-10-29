"use client";
// 열린 프로그램 탭(2026-10-30 사용자 "화면 프로그램들처럼, SBO 보면 상단 헤더쪽에 윈도우 프로그램처럼 되어 있잖아").
// 백오피스는 메뉴에서 연 화면이 창 머리 줄에 탭으로 쌓이고, 탭을 눌러 오가며, 다 쓴 화면은 X 로 닫는다. 그 줄을 판 위에 붙인다.
//
// 탭 하나 = 메뉴 칸 하나(프로그램). 같은 프로그램 안에서 조건을 바꾸거나 하위 주소로 가도 탭은 늘지 않고, 그 탭이 마지막 주소를 기억한다 —
// 다른 탭에 갔다 돌아오면 고른 조회조건(주소의 searchParams)이 그대로다. 메뉴에 없는 화면(게임 고치기)은 그 주소가 곧 탭이다.
//
// 하지 않은 것: 탭을 오갈 때 화면 속 입력 중인 값까지 붙들어 두는 일. Next 는 경로를 옮기면 화면을 내리고, 붙들려면 cacheComponents(Activity, 최근 셋까지)
// 전환이 필요하다. 그 전까지는 저장 안 한 값이 있으면 옮기기 전에 묻는다(pricing-form 의 이탈 확인).
//
// 열린 탭 목록은 이 브라우저에만 둔다(localStorage) — 남과 나눌 상태가 아니고, 못 읽으면 대시보드 하나로 시작하면 된다.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ITEMS, isActive } from "@/components/admin/admin-nav-items";
import { XIcon } from "@/components/ui/icons";
import { GAME_ADMIN_MESSAGES, SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";

type Tab = { key: string; label: string; href: string };

const STORAGE_KEY = "admin-program-tabs";
/** 이보다 많이 열면 가장 오래 안 본 탭부터 닫는다 — 백오피스도 창 수를 묶는다. 넓은 화면 한 줄에 들어가는 수다 */
const MAX_TABS = 10;
/** 대시보드는 늘 맨 앞, 닫지 못한다(백오피스의 홈 탭) */
const HOME: Tab = { key: ROUTES.admin, label: ITEMS.find((i) => i.href === ROUTES.admin)?.label ?? "", href: ROUTES.admin };

/** 주소가 속한 프로그램. 메뉴 칸 중 가장 긴 주소가 이긴다 */
function programOf(pathname: string): { key: string; label: string; Icon?: (typeof ITEMS)[number]["Icon"] } {
  const item = ITEMS.filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  if (item) return { key: item.href, label: item.label, Icon: item.Icon };
  return { key: pathname, label: pathname.startsWith("/admin/games/") ? GAME_ADMIN_MESSAGES.title : pathname };
}

function load(): Tab[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Tab[];
    return Array.isArray(raw) ? raw.filter((t) => t && typeof t.key === "string" && typeof t.href === "string" && t.key !== HOME.key) : [];
  } catch {
    return [];
  }
}

function save(tabs: Tab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // 저장을 못 하면 이 창 안에서만 기억한다
  }
}

export function ProgramTabs() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>([]);
  /** 마지막으로 본 순서. 넘칠 때 가장 오래 안 본 탭을 닫는 데 쓴다 */
  const seen = useRef<Map<string, number>>(new Map());
  const loaded = useRef(false);
  const here = programOf(pathname);
  const href = search ? `${pathname}?${search}` : pathname;

  // 지금 화면을 탭에 올리고(없으면 끝에 더하고, 있으면 마지막 주소만 바꾼다), 넘치면 오래된 탭을 닫는다
  useEffect(() => {
    seen.current.set(here.key, Date.now());
    setTabs((cur) => {
      const base = loaded.current ? cur : load();
      loaded.current = true;
      if (here.key === HOME.key) return base;
      let next = base.some((t) => t.key === here.key) ? base.map((t) => (t.key === here.key ? { ...t, href } : t)) : [...base, { key: here.key, label: here.label, href }];
      while (next.length > MAX_TABS - 1) {
        const oldest = next.filter((t) => t.key !== here.key).sort((a, b) => (seen.current.get(a.key) ?? 0) - (seen.current.get(b.key) ?? 0))[0];
        next = next.filter((t) => t !== oldest);
      }
      save(next);
      return next;
    });
  }, [here.key, here.label, href]);

  const all = [HOME, ...tabs];
  const close = (key: string) => {
    const i = all.findIndex((t) => t.key === key);
    const rest = tabs.filter((t) => t.key !== key);
    setTabs(rest);
    save(rest);
    // 지금 탭을 닫으면 바로 앞 탭으로 간다(윈도우 탭과 같다)
    if (key === here.key) router.push(all[Math.max(0, i - 1)]?.href ?? ROUTES.admin);
  };
  const closeOthers = () => {
    const keep = tabs.filter((t) => t.key === here.key);
    setTabs(keep);
    save(keep);
  };

  return (
    <div className="hidden min-w-0 items-end gap-2 md:flex">
      <nav aria-label={SM.tabsLabel} className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden">
        {all.map((t) => {
          const on = t.key === here.key;
          const Icon = ITEMS.find((i) => i.href === t.key)?.Icon;
          return (
            <div
              key={t.key}
              // 가운데 단추로 닫기 — 브라우저 탭과 같은 손버릇
              onAuxClick={(e) => {
                if (e.button === 1 && t.key !== HOME.key) {
                  e.preventDefault();
                  close(t.key);
                }
              }}
              className={cn(
                "group flex h-9 max-w-[200px] shrink-0 items-center rounded-t-lg border border-b-0 text-[12.5px] transition-colors duration-fast",
                on ? "border-line-strong bg-surface font-bold text-ink shadow-[inset_0_2px_0_var(--acc)]" : "border-line bg-surface-2 font-medium text-mut hover:bg-surface hover:text-ink",
              )}
            >
              <Link href={t.href} aria-current={on ? "page" : undefined} className="press flex h-full min-w-0 items-center gap-1.5 pl-3 pr-2">
                {Icon && <Icon size={14} />}
                <span className="truncate">{t.label}</span>
              </Link>
              {t.key !== HOME.key && (
                <button
                  type="button"
                  aria-label={SM.closeTab(t.label)}
                  onClick={() => close(t.key)}
                  className="press mr-1 grid size-6 shrink-0 place-items-center rounded-md text-dim hover:bg-surface-2 hover:text-ink"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          );
        })}
      </nav>
      {tabs.length > 1 && (
        <button type="button" onClick={closeOthers} className="press mb-1 shrink-0 rounded-md px-2 py-1 text-[12px] font-medium text-mut hover:bg-surface-2 hover:text-ink">
          {SM.closeOthers}
        </button>
      )}
    </div>
  );
}
