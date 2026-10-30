"use client";
// 목록, 상세 사이 구분선(2026-10-30, 사용자 "드래그로 자유롭게 조정" → "영역 사이 중간선을 끌게, 접기 펴기 단추는 양쪽으로 중간에"). MasterDetail 이 쓴다.
//
// 선 자체가 끄는 자리다(role=separator, 좌우 방향키로도 KEY_STEP 씩). 선 가운데에 단추 둘: 왼쪽 화살은 선을 왼쪽 끝으로(목록 접기),
// 오른쪽 화살은 오른쪽 끝으로(상세 접기). 접힌 쪽으로 미는 단추는 숨기고, 반대 단추가 "펼치기" 가 된다 — 화살 방향이 곧 선이 가는 방향이다.
// 단추 묶음은 선 길이의 가운데에 서되, 선이 화면보다 길면 화면 가운데 띠 안에 머문다(sticky top, bottom 을 둘 다 건다).
//
// 끈 폭은 화면(주소)마다 이 브라우저에 기억한다. 사람마다 모니터가 달라 서버에 둘 값이 아니다.
// 목록을 MIN_LIST 밑으로 끌면 목록을 접고, 상세가 MIN_DETAIL 밑이 되게 끌면 상세를 접는다(기억한 폭은 그대로 두고 접기만).
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";

/** 목록 최소 폭. 이보다 좁게 끌면 목록을 접는다 — 그리드 No 칸 + 두 칸쯤 */
const MIN_LIST = 240;
/** 상세 최소 폭. 이보다 좁아지게 끌면 상세를 접는다 — 폼 이름표 + 입력 칸 한 줄 */
const MIN_DETAIL = 360;
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

const BUTTON = "press grid size-6 place-items-center rounded-full border border-line bg-surface text-dim shadow-sm hover:border-acc hover:text-acc";

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
  const drag = useRef<{ x: number; start: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** 선 왼쪽 끝(목록 칸 시작)에서 상세 끝까지의 폭 */
  const totalOf = () => listRef.current?.parentElement?.clientWidth ?? 0;
  /** 지금 목록 폭. 접혀 있으면 접힌 쪽 끝 */
  const currentOf = () => (hidden === "list" ? 0 : hidden === "detail" ? totalOf() : (listRef.current?.offsetWidth ?? 0));

  const apply = (w: number, persist: boolean) => {
    const max = totalOf() - MIN_DETAIL;
    if (w < MIN_LIST) return setHidden("list");
    if (w > max) return setHidden("detail");
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

  // 선을 미는 방향 그대로: 왼쪽 단추는 상세가 접혀 있으면 펴고, 아니면 목록을 접는다. 오른쪽 단추는 그 반대
  const toLeft = () => setHidden(hidden === "detail" ? null : "list");
  const toRight = () => setHidden(hidden === "list" ? null : "detail");

  return (
    <div
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
        "group/split relative flex cursor-col-resize touch-none flex-col items-center self-stretch outline-none",
        // 선: 칸 가운데 1px, 손을 대거나 끄는 동안 파랑 2px
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-line",
        "hover:before:w-0.5 hover:before:bg-acc focus-visible:before:w-0.5 focus-visible:before:bg-acc data-[dragging]:before:w-0.5 data-[dragging]:before:bg-acc",
        className,
      )}
    >
      <div className="sticky top-[calc(50svh-28px)] bottom-[calc(50svh-28px)] my-auto flex cursor-default flex-col gap-1 py-1">
        {hidden !== "list" && (
          <button type="button" aria-label={hidden === "detail" ? SM.detailUnfold : SM.listFold} onClick={toLeft} className={BUTTON}>
            <ChevronLeftIcon size={13} />
          </button>
        )}
        {hidden !== "detail" && (
          <button type="button" aria-label={hidden === "list" ? SM.listUnfold : SM.detailFold} onClick={toRight} className={BUTTON}>
            <ChevronLeftIcon size={13} className="rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
