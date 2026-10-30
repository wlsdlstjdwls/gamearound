"use client";
// 목록, 상세 사이 손잡이(2026-10-30, 사용자 "접기 펴기 말고 드래그로 자유롭게 조정"). MasterDetail 이 쓴다.
//
// 손잡이 하나가 두 일을 한다: 누르면 접고 펴고(전과 같다), 끌면 목록 폭이 바뀐다. 손잡이를 둘로 나누지 않은 이유는
// 사이 칸이 20px 이라 단추 둘이 서면 둘 다 누르기 어렵다. 끈 거리가 DRAG_SLOP 을 넘어야 끌기로 본다 — 손이 살짝 떨려도 누르기다.
// 끈 폭은 화면(주소)마다 이 브라우저에 기억한다. 사람마다 모니터가 달라 서버에 둘 값이 아니다.
// 목록을 MIN_LIST 밑으로 끌면 접는다(기억한 폭은 두고 접기만). 접힌 손잡이를 오른쪽으로 끌면 그만큼 펴진다.
// 두 번 눌러 기본 폭으로 되돌리기는 두지 않았다 — 첫 누름에 접히며 손잡이가 옮겨 가 둘째 누름이 상세에 떨어졌다(실측).
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";

/** 이 거리 안에서 손을 떼면 누르기(접기)다 */
const DRAG_SLOP = 4;
/** 목록 최소 폭. 이보다 좁게 끌면 접는다 — 그리드 No 칸 + 두 칸쯤 */
const MIN_LIST = 240;
/** 상세에 남기는 최소 폭. 폼 이름표 + 입력 칸 한 줄 */
const MIN_DETAIL = 360;
/** 방향키 한 번에 움직이는 폭 */
const KEY_STEP = 40;
const STORAGE_PREFIX = "admin-list-w:";

function load(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(STORAGE_PREFIX + key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// 기억한 폭을 읽는 쪽에 바뀜을 알린다. 서버 그림에는 기본 폭(null)을 그리고 붙은 뒤에 기억한 폭으로 바꾼다 — 서버는 이 브라우저 값을 모른다
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

function save(key: string, w: number | null) {
  try {
    if (w === null) localStorage.removeItem(STORAGE_PREFIX + key);
    else localStorage.setItem(STORAGE_PREFIX + key, String(Math.round(w)));
  } catch {
    // 저장 못 해도 이번 화면에서는 끄는 동안의 폭(live)이 산다
  }
  listeners.forEach((cb) => cb());
}

/** 목록 폭(px, 끌어 본 적 없으면 null = 화면 기본 폭)과 접힘 */
export function useListSplit() {
  const key = usePathname();
  const stored = useSyncExternalStore(subscribe, () => load(key), () => null);
  /** 끄는 동안의 폭. 손을 떼면 기억한 폭(stored)으로 넘긴다 */
  const [live, setLive] = useState<number | null>(null);
  const [folded, setFolded] = useState(false);
  return { key, width: live ?? stored, setLive, folded, setFolded };
}

export function SplitHandle({
  split,
  listRef,
  className,
}: {
  split: ReturnType<typeof useListSplit>;
  /** 목록 칸 — 끌기 시작 폭과 상한(바깥 틀 폭)을 여기서 잰다 */
  listRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const { key, setLive, folded, setFolded } = split;
  const drag = useRef<{ x: number; start: number; max: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const maxOf = () => (listRef.current?.parentElement?.clientWidth ?? 0) - MIN_DETAIL;
  const apply = (w: number, persist: boolean) => {
    if (w < MIN_LIST) {
      setFolded(true);
      return;
    }
    const next = Math.min(w, Math.max(MIN_LIST, maxOf()));
    setFolded(false);
    if (persist) {
      save(key, next);
      setLive(null);
    } else setLive(next);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, start: folded ? 0 : (listRef.current?.offsetWidth ?? 0), max: maxOf(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    apply(d.start + dx, false);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.moved) apply(d.start + e.clientX - d.x, true);
    else setFolded((f) => !f);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    apply((folded ? 0 : (listRef.current?.offsetWidth ?? 0)) + step, true);
  };

  // 끄는 동안 글자가 긁혀 골라지지 않고, 손잡이 밖으로 나가도 커서가 유지되게 문서 전체에 건다
  useEffect(() => {
    if (!dragging) return;
    const root = document.documentElement;
    root.style.cursor = "col-resize";
    root.style.userSelect = "none";
    return () => {
      root.style.cursor = "";
      root.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <button
      type="button"
      aria-expanded={!folded}
      aria-label={`${folded ? SM.listUnfold : SM.listFold}. ${SM.listResizeHint}`}
      // 누르기는 pointerup 이 맡는다. 키보드 Enter, Space 의 click(detail 0)만 여기서 받는다
      onClick={(e) => e.detail === 0 && setFolded((f) => !f)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => ((drag.current = null), setDragging(false))}
      onKeyDown={onKeyDown}
      data-dragging={dragging || undefined}
      className={className}
      style={{ cursor: "col-resize", touchAction: "none" }}
    >
      <ChevronDownIcon size={14} className={folded ? "-rotate-90" : "rotate-90"} />
    </button>
  );
}
