"use client";

// 옆으로 넘기는 줄 — 홈의 둘째 판 줄들이 쓴다(2026-10-02 홈 재구성).
//
// 왜 격자가 아니라 줄인가: 홈이 같은 카드 격자 44칸이었다(할인 24 + 최근 출시 20). 모양이 같으니 눈이 쉴 곳이 없었고
// 어디까지가 한 마디인지도 안 보였다. 줄은 높이가 카드 한 장이라, 마디마다 "여기서 하나 고르고 넘어가라" 를 모양으로 말한다.
//
// 손가락은 밀고, 마우스는 단추를 누른다. 단추는 hover 가 있는 기기에만 선다 — 터치 화면에서는 밀기가 더 빠르고,
// 단추가 카드 위에 떠 있으면 카드를 누르려다 단추를 누른다. 끝에 닿으면 그쪽 단추를 끈다.
// 칸은 scroll-snap 으로 한 장씩 멈춘다. 다음 칸 끝이 늘 조금 비쳐 "더 있다" 를 말한다(좁은 화면 80%).
// 단추의 세로 자리는 카드 그림의 가운데다(2026-11-20 점검). 카드 높이의 가운데에 두었더니 그림 아래 제목 줄 위에 떠
// 390, 700, 1280 모두 옆 카드 제목을 가렸다. 그림 높이는 카드 폭에 따라 달라 CSS 로 못 박지 못해 첫 그림을 재서 넘긴다(못 재면 가운데).
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { RAIL_ITEM_CLASS, RAIL_TRACK_CLASS } from "@/lib/rail";
import { ChevronLeftIcon } from "@/components/ui/icons";

/** 단추 한 번에 넘기는 양 — 보이는 폭의 이만큼. 한 화면을 통째로 넘기면 어디까지 봤는지 놓친다 */
const PAGE_RATIO = 0.85;

export function Rail({ items, labels }: { items: Array<{ key: string; node: React.ReactNode }>; labels: { prev: string; next: string } }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  // 단추 가운데가 설 자리(줄 상자 위에서 px). null 이면 줄 높이의 가운데
  const [mid, setMid] = useState<number | null>(null);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    const img = el.querySelector("li img")?.getBoundingClientRect();
    const box = el.parentElement?.getBoundingClientRect();
    setMid(img && box && img.height > 0 ? Math.round(img.top - box.top + img.height / 2) : null);
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
        // 넓은 화면에서도 카드 그림자 몫(3)만큼 바깥으로 넓혀 그 안을 비운다. 0 으로 붙이면 overflow 가 그림자를 직선으로 잘라
        // 줄 전체가 바탕과 다른 판 위에 얹힌 것처럼 보였다(2026-10-28 사용자 "배경이랑 분리되는 느낌").
        // 3(12px)으로는 모자랐다(같은 날 "여전히 분리된다"): --elev-2 그림자가 아래로 20px 번져 12px 자리에서 직선으로 잘렸다.
        // 세로만 6(24px)으로 늘린다 — 그림자 끝보다 넓다. 가로는 3 그대로다: 그림자는 옆으로 12px 만 번지고,
        // 가로를 24px 로 넓히면 다음 카드가 본문 오른쪽 끝 밖으로 비어져 나와 다른 줄과 끝선이 어긋났다(카드 사이 16px > 12px 라 3 에선 안 보인다)
        // rail-track: 이 줄 안 카드는 hover 그림자를 24px 안에 가둔다(globals.css 의 --elev-card-hover-rail, 2026-10-30)
        className={cn(RAIL_TRACK_CLASS, "rail-track sm:-mx-3 sm:-my-6 sm:scroll-px-3 sm:px-3 sm:py-6")}
      >
        {items.map((it) => (
          <li key={it.key} className={cn(RAIL_ITEM_CLASS, "sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]")}>
            {it.node}
          </li>
        ))}
      </ul>
      <RailButton dir={-1} hidden={edge.start} mid={mid} label={labels.prev} onClick={() => go(-1)} />
      <RailButton dir={1} hidden={edge.end} mid={mid} label={labels.next} onClick={() => go(1)} />
    </div>
  );
}

function RailButton({ dir, hidden, mid, label, onClick }: { dir: -1 | 1; hidden: boolean; mid: number | null; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      tabIndex={hidden ? -1 : 0}
      // 단추 높이(44)의 반을 빼 가운데를 맞춘다
      style={mid !== null ? { top: mid - 22 } : undefined}
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
