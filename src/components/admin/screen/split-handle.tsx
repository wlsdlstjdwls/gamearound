"use client";
// 목록, 상세 사이 구분선(2026-10-30, 사용자 "드래그로 자유롭게 조정" → "영역 사이 중간선을 끌게, 접기 펴기 단추는 양쪽으로 중간에"). MasterDetail 이 쓴다.
//
// 선 자체가 끄는 자리다(role=separator, 좌우 방향키로도 KEY_STEP 씩). 선 가운데에 단추 둘: 왼쪽 화살은 선을 왼쪽 끝으로(목록 접기),
// 오른쪽 화살은 오른쪽 끝으로(상세 접기). 접힌 쪽으로 미는 단추는 숨기고, 반대 단추가 "펼치기" 가 된다 — 화살 방향이 곧 선이 가는 방향이다.
// 단추 묶음은 선 중 **지금 보이는 구간**의 가운데에 선다(사용자 "화면 중앙이 아니라 그 프로그램 영역 안에서"). 화면 가운데에 sticky 로 두면
// 짧은 화면에서는 선 밖으로, 탭 줄과 머리 툴바가 있는 바깥 문서에서는 영역 위쪽으로 쏠렸다. 굴리고 크기가 바뀔 때마다 다시 잰다.
// 단추는 얇은 알약 하나에 삼각 둘을 담았다(사용자 "투박하다, 납작하게") — 그림자, 테두리 없이 선 위에 얹힌다.
// 보이는 알약은 16px 폭이지만 누르는 자리는 구분선 칸 폭 전체, 높이 44px 이다(사용자 "높이가 좁아 누르기 어렵다", AGENTS §6 터치 타깃).
// 꺾쇠(< >)는 그 크기에서 글자처럼 보여 채운 삼각으로 바꿨다.
//
// 끈 폭은 화면(주소)마다 이 브라우저에 기억한다. 사람마다 모니터가 달라 서버에 둘 값이 아니다.
// 끌기는 끝선까지 자유롭다. 끝선 EDGE_SNAP 안까지 가야 그쪽을 접는다(기억한 폭은 그대로 두고 접기만) —
// 처음엔 목록 240, 상세 360 밑에서 접었더니 "끝선에 닿기도 전에 착 달라붙는다" 고 했다.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { CaretLeftIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";

/** 끝선에서 이만큼 안으로 들어오면 그쪽을 접는다. 손이 끝선에 "닿았다" 고 볼 거리 */
const EDGE_SNAP = 8;
/** 구분선 칸 폭(MasterDetail 의 1.5rem) */
const LINE_W = 24;
/** 방향키 한 번에 움직이는 폭 */
const KEY_STEP = 40;
const STORAGE_PREFIX = "admin-list-w:";

/** 접힌 쪽. null 이면 둘 다 보인다 */
export type SplitHidden = "list" | "detail" | null;

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

function save(key: string, w: number) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(Math.round(w)));
  } catch {
    // 저장 못 해도 이번 화면에서는 끄는 동안의 폭(live)이 산다
  }
  listeners.forEach((cb) => cb());
}

/** 목록 폭(px, 끌어 본 적 없으면 null = 화면 기본 폭)과 접힌 쪽 */
export function useListSplit() {
  const key = usePathname();
  const stored = useSyncExternalStore(subscribe, () => load(key), () => null);
  /** 끄는 동안의 폭. 손을 떼면 기억한 폭(stored)으로 넘긴다 */
  const [live, setLive] = useState<number | null>(null);
  const [hidden, setHidden] = useState<SplitHidden>(null);
  return { key, width: live ?? stored, setLive, hidden, setHidden };
}

/** 누르는 자리(칸 폭 전체 x 44px)와 그 안의 보이는 알약 조각. 둘째 단추 조각 위에 가르는 선, 묶음 위아래 끝만 둥글게 */
const BUTTON = "group grid h-11 w-full place-items-center [&+&>span]:border-t [&+&>span]:border-line first:[&>span]:rounded-t-full last:[&>span]:rounded-b-full";
const PIECE = "grid h-full w-4 place-items-center bg-surface-3 text-dim transition-colors duration-fast group-hover:bg-acc-soft group-hover:text-acc";

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
  const { key, width, setLive, hidden, setHidden } = split;
  const lineRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** 선 왼쪽 끝(목록 칸 시작)에서 상세 끝까지의 폭 */
  const totalOf = () => listRef.current?.parentElement?.clientWidth ?? 0;
  /** 지금 목록 폭. 접혀 있으면 접힌 쪽 끝 */
  const currentOf = () => (hidden === "list" ? 0 : hidden === "detail" ? totalOf() : (listRef.current?.offsetWidth ?? 0));

  const apply = (w: number, persist: boolean) => {
    if (w <= EDGE_SNAP) return setHidden("list");
    if (w >= totalOf() - LINE_W - EDGE_SNAP) return setHidden("detail");
    setHidden(null);
    if (persist) {
      save(key, w);
      setLive(null);
    } else setLive(w);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, start: currentOf() };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) apply(d.start + e.clientX - d.x, false);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d && e.clientX !== d.x) apply(d.start + e.clientX - d.x, true);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }[e.key];
    if (step === undefined || e.target !== e.currentTarget) return;
    e.preventDefault();
    apply(currentOf() + step, true);
  };

  // 끄는 동안 글자가 긁혀 골라지지 않고, 선 밖으로 나가도 커서가 유지되게 문서 전체에 건다
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

  // 단추 묶음을 선의 보이는 구간 가운데로. 상태로 두지 않고 style 을 바로 쓴다 — 굴릴 때마다 다시 그리지 않는다
  useEffect(() => {
    const line = lineRef.current;
    const knob = knobRef.current;
    if (!line || !knob) return;
    const place = () => {
      const r = line.getBoundingClientRect();
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, window.innerHeight);
      knob.style.top = `${(bottom > top ? (top + bottom) / 2 : (r.top + r.bottom) / 2) - r.top}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(line);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, []);

  // 선을 미는 방향 그대로: 왼쪽 단추는 상세가 접혀 있으면 펴고, 아니면 목록을 접는다. 오른쪽 단추는 그 반대
  const toLeft = () => setHidden(hidden === "detail" ? null : "list");
  const toRight = () => setHidden(hidden === "list" ? null : "detail");

  return (
    <div
      ref={lineRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={SM.listResize}
      aria-valuenow={width ?? undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => ((drag.current = null), setDragging(false))}
      onKeyDown={onKeyDown}
      data-dragging={dragging || undefined}
      className={cn(
        "relative cursor-col-resize touch-none self-stretch outline-none",
        // 선: 칸 가운데 1px, 손을 대거나 끄는 동안 파랑 2px
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-line",
        "hover:before:w-0.5 hover:before:bg-acc focus-visible:before:w-0.5 focus-visible:before:bg-acc data-[dragging]:before:w-0.5 data-[dragging]:before:bg-acc",
        className,
      )}
    >
      <div
        ref={knobRef}
        className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 cursor-default flex-col"
      >
        {hidden !== "list" && (
          <button type="button" aria-label={hidden === "detail" ? SM.detailUnfold : SM.listFold} onClick={toLeft} className={BUTTON}>
            <span className={PIECE}>
              <CaretLeftIcon size={10} />
            </span>
          </button>
        )}
        {hidden !== "detail" && (
          <button type="button" aria-label={hidden === "list" ? SM.listUnfold : SM.detailFold} onClick={toRight} className={BUTTON}>
            <span className={PIECE}>
              <CaretLeftIcon size={10} className="rotate-180" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
