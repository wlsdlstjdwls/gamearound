"use client";
// 관리자 메뉴 즐겨찾기 상태와 별 단추(2026-11-02, SBO 창 머리의 별 + 시작 메뉴 즐겨찾기). 저장은 DB(admin_favorites, 계정마다).
//
// 상태는 모듈 하나에 둔다(useSyncExternalStore) — 별은 화면 머리(AdminScreenHead)에, 묶음은 기둥(admin-rail)에 서는데
// 둘은 레이아웃에서 형제라 props 로 잇지 못한다. program-shell/store 와 같은 판단이다.
// 첫 목록은 레이아웃이 약속(Promise)째로 넘긴다. 레이아웃은 관리자 화면 전부의 길목이라 여기서 기다리면 그 왕복이 모든 화면에 붙는다 —
// 메뉴는 먼저 그리고 즐겨찾기 묶음만 목록이 오면 선다. 그 전에는 별도 자리만 잡아 두고 그리지 않는다(꺼진 별이 켜진 별로 바뀌면 고장처럼 보인다).
//
// 누른 순간 바꾸고 실패하면 되돌린다(AGENTS §6). 탭 안 문서(iframe)에서 누르면 바깥 기둥에 **바뀐 한 칸만** 알린다 —
// 목록째 보내면 탭 안 문서가 들고 있던 낡은 목록이 바깥에서 지운 칸을 되살린다.
import { useEffect, useSyncExternalStore } from "react";
import { toggleAdminFavorite } from "@/app/(admin)/admin/favorite-actions";
import { inFrame, isFrameMessage, postToTop } from "@/components/admin/program-shell/frame";
import { useAdminStatus } from "@/components/admin/screen/status";
import { StarIcon } from "@/components/admin/nav-icons";
import { useTooltip } from "@/components/ui/tooltip";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";

/** null = 아직 못 읽었다 */
let hrefs: string[] | null = null;
const listeners = new Set<() => void>();

function setAll(next: string[]) {
  hrefs = next;
  for (const l of listeners) l();
}

function apply(href: string, on: boolean) {
  const cur = hrefs ?? [];
  if (on === cur.includes(href)) return;
  setAll(on ? [...cur, href] : cur.filter((h) => h !== href));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 즐겨찾기 주소, 추가한 차례대로. 아직 못 읽었으면 null */
export function useFavorites(): string[] | null {
  return useSyncExternalStore(subscribe, () => hrefs, () => null);
}

/**
 * 레이아웃이 넘긴 첫 목록을 받고, 바깥 문서면 탭 안 문서의 별 소식을 듣는다. 메뉴(admin-nav)가 한 번 부른다.
 * 먼저 누른 것이 있으면(목록이 오기 전에 별을 눌렀다) 늦게 온 목록으로 덮지 않는다.
 */
export function useSeedFavorites(initial: Promise<string[]>) {
  useEffect(() => {
    let alive = true;
    // 서버가 넘긴 약속은 React 의 thenable 이라 then 만 제대로 돈다(catch 는 undefined 를 돌려준다) — 진짜 Promise 로 감싼다
    Promise.resolve(initial)
      .catch(() => [] as string[])
      .then((list) => {
        if (alive && hrefs === null) setAll(list);
      });
    if (inFrame()) return () => void (alive = false);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !isFrameMessage(e.data) || e.data.type !== "admin-favorites") return;
      apply(e.data.href, e.data.on);
    };
    window.addEventListener("message", onMessage);
    return () => {
      alive = false;
      window.removeEventListener("message", onMessage);
    };
  }, [initial]);
}

function applyEverywhere(href: string, on: boolean) {
  apply(href, on);
  if (inFrame()) postToTop({ type: "admin-favorites", href, on });
}

/** 켜거나 끈다. 화면을 먼저 바꾸고, 저장이 실패하면 되돌린 뒤 false */
export async function toggleFavorite(href: string, on: boolean): Promise<boolean> {
  applyEverywhere(href, on);
  const res = await toggleAdminFavorite(href, on).catch(() => ({ ok: false }));
  if (!res.ok) applyEverywhere(href, !on);
  return res.ok;
}

/** 화면 머리 제목 옆 별. 메뉴 칸인 화면에만 선다(부르는 쪽이 거른다) */
export function FavoriteStar({ href, className }: { href: string; className?: string }) {
  const list = useFavorites();
  const { say } = useAdminStatus();
  const on = list?.includes(href) ?? false;
  const label = on ? ADMIN_NAV.favoriteRemove : ADMIN_NAV.favoriteAdd;
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(label, list !== null);
  // 목록이 오기 전에는 자리만 잡는다 — 제목 줄이 나중에 밀리지 않게
  if (list === null) return <span aria-hidden className={cn("inline-block size-8 shrink-0", className)} />;
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={() => void toggleFavorite(href, !on).then((ok) => !ok && say(ADMIN_NAV.favoriteFailed, "error"))}
        className={cn(
          "press inline-flex size-8 shrink-0 items-center justify-center self-center rounded-lg transition-colors duration-fast",
          on ? "text-acc hover:bg-acc-soft" : "text-dim hover:bg-surface-2 hover:text-ink",
          className,
        )}
        {...triggerProps}
      >
        <StarIcon size={17} filled={on} />
      </button>
      {tooltip}
    </>
  );
}
