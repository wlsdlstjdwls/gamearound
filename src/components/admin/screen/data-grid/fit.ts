"use client";
// 그리드 몸통을 화면 바닥에 맞추는 높이(2026-10-30, 사용자 "아래에 더 없는데도 스크롤이 생긴다").
//
// 전에는 화면마다 `calc(100svh - 330px)` 처럼 그리드 위아래 조각의 높이를 어림해 적었다. 조회 띠, 일괄 처리 띠, 프로그램 탭 줄이
// 붙고 바뀔 때마다 어림이 틀어져, 몸통이 제 안에서 구르는데 문서도 30~60px 더 구르는 이중 스크롤이 생겼다(회사정보관리 66px, 게시글관리 52px 실측).
// 그래서 숫자를 적지 않고 잰다: 그리드 위쪽 위치 + 그리드 아래에 쌓인 것(쪽 넘김 줄, 처리 띠, 상태줄, 판 여백)을 빼고 남은 만큼을 몸통에 준다.
//
// "아래에 쌓인 것" 은 조상을 거슬러 오르며 **그리드 밑에서 시작하는 형제**만 센다. 옆에 나란히 선 상세 칸(MasterDetail)은
// 그리드보다 길어도 세지 않는다 — 그건 상세가 길어서 문서가 구르는 것이라 그리드를 줄여도 스크롤이 사라지지 않는다.
// 좁은 화면처럼 상세가 그리드 밑으로 내려가면 남는 높이가 바닥(FIT_MIN)에 걸린다. 그때는 문서가 구르는 게 맞고, 목록 높이는 STACKED_SHARE 로 준다.
import { useLayoutEffect, useState, type RefObject } from "react";

/** 이보다 작게는 줄이지 않는다. 머리 + 다섯 줄쯤 — 이보다 작으면 목록으로 못 쓴다 */
const FIT_MIN = 240;
/**
 * 맞춘 값이 FIT_MIN 밑이면(좁은 화면에서 상세가 그리드 밑으로 쌓였다) 어차피 문서가 구른다. 그때는 화면 높이의 이만큼을 목록에 준다 —
 * 옛 어림(`100svh - 330px`)이 900 높이에서 570, 6할 남짓이었다
 */
const STACKED_SHARE = 0.6;

/** el 아래(문서 끝 방향)에 쌓여 그리드와 함께 화면에 들어와야 하는 높이 */
function spaceBelow(el: HTMLElement): number {
  let below = 0;
  let node: HTMLElement = el;
  while (node.parentElement && node !== document.body) {
    const parent = node.parentElement;
    const cs = getComputedStyle(parent);
    const after = Array.from(parent.children).slice(Array.from(parent.children).indexOf(node) + 1).filter((sib): sib is HTMLElement => {
      if (!(sib instanceof HTMLElement) || sib.offsetHeight === 0) return false;
      const pos = getComputedStyle(sib).position;
      return pos !== "absolute" && pos !== "fixed";
    });
    if (cs.display === "block" || (cs.display.endsWith("flex") && cs.flexDirection.startsWith("column"))) {
      // 세로로 쌓는 부모: 뒤 형제는 전부 밑에 선다. 위치가 아니라 높이를 더한다 — 바닥 상태줄은 sticky 라
      // 문서가 넘치는 동안 화면 바닥에 붙어 그리드 위로 올라와 보이고, 위치로 재면 빠져서 넘침이 풀리지 않았다(탭 안 회사정보관리 28px)
      for (const sib of after) {
        const m = getComputedStyle(sib);
        below += sib.offsetHeight + parseFloat(m.marginTop) + parseFloat(m.marginBottom) + (parseFloat(cs.rowGap) || 0);
      }
    } else {
      // 가로로 늘어놓는 부모(그리드 칸, 가로 flex): 그리드 밑에서 시작하는 형제만 센다(줄바꿈되어 내려온 칸)
      const bottom = node.getBoundingClientRect().bottom;
      const last = after.reduce((max, sib) => {
        const r = sib.getBoundingClientRect();
        return r.top >= bottom - 1 ? Math.max(max, r.bottom) : max;
      }, bottom);
      below += last - bottom;
    }
    below += parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
    node = parent;
  }
  return below;
}

/** on 이면 ref 상자의 최대 높이(px)를 화면 바닥에 맞춰 돌려준다. 꺼져 있으면 undefined */
export function useFitHeight(ref: RefObject<HTMLElement | null>, on: boolean): number | undefined {
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const fit = Math.floor(window.innerHeight - top - spaceBelow(el));
      setHeight(fit >= FIT_MIN ? fit : Math.max(FIT_MIN, Math.floor(window.innerHeight * STACKED_SHARE)));
    };
    measure();
    // 위 조각(조회 띠 줄바꿈, 상태줄 글)이 커지고 작아지면 다시 잰다. 제 높이를 바꿔도 같은 값이 나와 되풀이되지 않는다
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, on]);
  return on ? height : undefined;
}
