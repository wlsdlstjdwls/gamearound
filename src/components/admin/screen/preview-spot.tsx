"use client";
// 폼 칸 포커스 → 미리 보기 자리 강조(2026-10-30, 사용자 "필드에 포커스인 되면 어디가 수정되는지 미리보기 화면에서 표기").
//
// 짝은 이름 하나로 맺는다: 폼 쪽은 Field 의 spot(또는 아무 감싼 요소의 data-preview-spot), 미리 보기 쪽은 그리는 부품이
// 같은 이름의 data-preview-spot 을 단다(요금 카드는 components/payments/plan-cards). 이름은 lib/pricing/preview-spots 에 모았다.
// 칸 id 로 짝을 추측하지 않는다 — id 는 상품마다 바뀌고, 한 자리를 칸 여럿이 움직인다(정가, 할인 값, 대상은 모두 "값" 자리).
//
// 강조는 미리 보기 위에 겹친 테두리로 그린다. 미리 보기 속 요소에 클래스를 넣지 않는 이유: 미리 보기는 실제 카드 부품을 그대로 그린다(inert).
// 미리 보기는 줄여 맞추느라 transform 이 걸릴 수 있어 잰 값을 그 비율로 되돌린다.
// 자리가 지금 안 보이면(문구가 비어 카드에 안 서는 줄) 아무것도 그리지 않는다 — 엉뚱한 곳을 가리키는 것보다 낫다.
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

/** 짝을 맺는 속성 이름. JSX 에는 글자 그대로 data-preview-spot 을 쓴다 */
export const PREVIEW_SPOT_ATTR = "data-preview-spot";

const SpotContext = createContext<string | null>(null);

/**
 * 폼 영역에 붙인다. 포커스가 들어간 칸에서 가장 가까운 data-preview-spot 을 고른 자리로 삼는다.
 * 폼 밖(툴바, 목록)으로 포커스가 나가면 지운다 — 칸 안 팝업(값 넣기 목록)으로 옮겨 가는 것은 폼 안이라 유지된다
 */
export function useSpotFocus() {
  const [spot, setSpot] = useState<string | null>(null);
  const bind = {
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const at = (e.target as HTMLElement).closest(`[${PREVIEW_SPOT_ATTR}]`);
      setSpot(at && e.currentTarget.contains(at) ? at.getAttribute(PREVIEW_SPOT_ATTR) : null);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSpot(null);
    },
  };
  return { spot, bind };
}

export function SpotProvider({ spot, children }: { spot: string | null; children: React.ReactNode }) {
  return <SpotContext.Provider value={spot}>{children}</SpotContext.Provider>;
}

type Box = { top: number; left: number; width: number; height: number };

/** 상자 둘레 여백(px) — 글자에 테두리가 딱 붙으면 글자를 가린다 */
const BOX_PAD = 4;

function sameBoxes(a: Box[], b: Box[]) {
  return a.length === b.length && a.every((x, i) => x.top === b[i].top && x.left === b[i].left && x.width === b[i].width && x.height === b[i].height);
}

/** 미리 보기를 감싼다. 고른 자리와 이름이 같은 요소 위에 테두리를 겹친다 */
export function PreviewSpotlight({ children }: { children: React.ReactNode }) {
  const spot = useContext(SpotContext);
  const wrap = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);

  // 값을 칠 때마다(카드 글 길이가 바뀐다) 다시 잰다 — 렌더마다 돌고, 상자가 같으면 상태를 안 바꿔 다시 그리지 않는다
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      // 미리 보기가 줄여 그려져(transform: scale) 있으면 화면 좌표를 감싼 상자 좌표로 되돌린다 — 겹친 상자도 같은 비율로 줄어 그려진다
      const scale = el.offsetWidth > 0 ? base.width / el.offsetWidth : 1;
      const next = spot
        ? [...el.querySelectorAll<HTMLElement>(`[${PREVIEW_SPOT_ATTR}~="${CSS.escape(spot)}"]`)]
            .map((t) => t.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0)
            .map((r) => ({
              top: Math.round((r.top - base.top) / scale - BOX_PAD),
              left: Math.round((r.left - base.left) / scale - BOX_PAD),
              width: Math.round(r.width / scale + BOX_PAD * 2),
              height: Math.round(r.height / scale + BOX_PAD * 2),
            }))
        : [];
      setBoxes((cur) => (sameBoxes(cur, next) ? cur : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  return (
    <div ref={wrap} className="relative">
      {children}
      {boxes.map((b, i) => (
        <span
          key={i}
          aria-hidden
          // 자리를 옮기면 테두리가 미끄러져 간다(같은 순번 상자를 다시 쓴다) — 어디서 어디로 바뀌었는지가 눈에 따라온다
          className="pointer-events-none absolute animate-fade-in rounded-lg bg-[var(--acc-glow)] shadow-[0_0_0_2px_var(--acc)] transition-[top,left,width,height] duration-base ease-standard"
          style={b}
        />
      ))}
    </div>
  );
}
