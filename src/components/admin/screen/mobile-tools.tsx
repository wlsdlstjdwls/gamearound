"use client";
// 휴대폰 툴바(2026-10-30, 사용자 "조회, 입력, 삭제, 저장 버튼 영역도 모바일 구조에 맞게"). 넓은 화면의 다섯 칸 툴바는 늘 같은 자리에
// 흐린 단추까지 세워 손이 자리를 기억하게 하지만(screen/head), 휴대폰은 머리 줄이 좁고 손가락은 바닥에 있다.
// 그래서 조회는 제목 옆 아이콘 하나로, 입력, 삭제, 저장은 **이 화면이 실제로 넘긴 것만** 바닥 띠(탭 띠 바로 위)에 글자 단추로 세운다.
// 상세 시트(MasterDetail)가 열리면 시트가 바닥 띠를 덮으므로 같은 단추를 시트 머리에도 세운다 — 그래서 머리가 넘긴 단추를 모듈 하나에 둔다.
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { SCREEN_MESSAGES as M } from "@/lib/admin/messages";
import type { ScreenTools } from "@/components/admin/screen/head";

type Shown = { insert: boolean; delete: boolean; save: boolean; saveDisabled: boolean; saving: boolean };

let tools: ScreenTools = {};
let shown: Shown | null = null;
const listeners = new Set<() => void>();

function same(a: Shown | null, b: Shown | null) {
  return a === b || (a !== null && b !== null && a.insert === b.insert && a.delete === b.delete && a.save === b.save && a.saveDisabled === b.saveDisabled && a.saving === b.saving);
}

/** 머리(screen/head)가 렌더마다 넘긴다. 함수는 늘 최신 것을 쥐고, 띠를 다시 그리는 것은 보일 단추가 바뀔 때만이다 */
export function publishMobileTools(next: ScreenTools | null) {
  tools = next ?? {};
  const s: Shown | null = next && (next.insert || next.delete || next.save) ? { insert: Boolean(next.insert), delete: Boolean(next.delete), save: Boolean(next.save), saveDisabled: Boolean(next.saveDisabled), saving: Boolean(next.saving) } : null;
  if (same(shown, s)) return;
  shown = s;
  for (const l of listeners) l();
}

function useShown() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => shown,
    () => null,
  );
}

/** 단추 묶음. compact 는 시트 머리 자리(작은 단추) */
export function MobileToolButtons({ compact = false }: { compact?: boolean }) {
  const s = useShown();
  if (!s) return null;
  const size = compact ? "sm" : "md";
  return (
    <div className={cn("flex items-center gap-2", !compact && "w-full [&>*]:flex-1")}>
      {s.delete && (
        <Button size={size} variant="secondary" onClick={() => tools.delete?.()}>
          {M.delete}
        </Button>
      )}
      {s.insert && (
        <Button size={size} variant="secondary" onClick={() => tools.insert?.()}>
          {M.insert}
        </Button>
      )}
      {s.save && (
        <Button size={size} variant="primary" disabled={s.saveDisabled || s.saving} onClick={() => tools.save?.()}>
          {M.save}
        </Button>
      )}
    </div>
  );
}

/** 바닥 띠. 탭 띠(admin-nav) 바로 위에 붙는다. 띠가 본문 끝을 덮지 않게 문서 바닥을 비우는 일은 globals.css 가 한다(data-admin-actionbar) */
export function MobileActionBar() {
  const s = useShown();
  if (!s) return null;
  return (
    <div data-admin-actionbar className="fixed inset-x-0 bottom-[var(--admin-tabbar-offset,0px)] z-30 border-t border-line bg-surface/95 px-4 py-2 backdrop-blur">
      <MobileToolButtons />
    </div>
  );
}
