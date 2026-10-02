"use client";

// 옆으로 넘기는 줄 — 홈의 둘째 판 줄들이 쓴다(2026-10-02 홈 재구성).
//
// 왜 격자가 아니라 줄인가: 홈이 같은 카드 격자 44칸이었다(할인 24 + 최근 출시 20). 모양이 같으니 눈이 쉴 곳이 없었고
// 어디까지가 한 마디인지도 안 보였다. 줄은 높이가 카드 한 장이라, 마디마다 "여기서 하나 고르고 넘어가라" 를 모양으로 말한다.
//
// 손가락은 밀고, 마우스는 단추를 누른다. 단추는 hover 가 있는 기기에만 선다 — 터치 화면에서는 밀기가 더 빠르고,
// 단추가 카드 위에 떠 있으면 카드를 누르려다 단추를 누른다. 끝에 닿으면 그쪽 단추를 끈다.
// 칸은 scroll-snap 으로 한 장씩 멈춘다. 다음 칸 끝이 늘 조금 비쳐 "더 있다" 를 말한다(좁은 화면 80%).
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/ui/icons";

/** 단추 한 번에 넘기는 양 — 보이는 폭의 이만큼. 한 화면을 통째로 넘기면 어디까지 봤는지 놓친다 */
const PAGE_RATIO = 0.85;

export function Rail({ items, labels }: { items: Array<{ key: string; node: React.ReactNode }>; labels: { prev: string; next: string } }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  };
  // 칸 수와 폭은 그린 뒤에야 안다 — 줄이 화면보다 짧으면 처음부터 양쪽이 끝이다
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * PAGE_RATIO, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={ref}
        onScroll={measure}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {items.map((it) => (
          <li key={it.key} className="w-[80%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
            {it.node}
          </li>
        ))}
      </ul>
      <RailButton dir={-1} hidden={edge.start} label={labels.prev} onClick={() => go(-1)} />
      <RailButton dir={1} hidden={edge.end} label={labels.next} onClick={() => go(1)} />
    </div>
  );
}

function RailButton({ dir, hidden, label, onClick }: { dir: -1 | 1; hidden: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        "press absolute top-[calc(50%-22px)] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-2 transition-opacity duration-base [@media(hover:hover)]:flex",
        dir < 0 ? "-left-4" : "-right-4",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <ChevronLeftIcon className={cn("h-5 w-5", dir > 0 && "rotate-180")} />
    </button>
  );
}
