// 그리드 체크 칸 다루기(2026-11-19, data-grid/index 가 300줄에 닿아 뗐다). 머리 칸 전체 켜기, 줄 하나 켜기, 그리고 클릭 다중 선택.
//
// 클릭 다중 선택(같은 날 사용자 "컨트롤키+마우스왼쪽 누르면 체크박스 선택되게, 다중선택도"): 체크 칸이 있는 그리드에서
// - Ctrl(맥은 Cmd)+클릭: 그 줄 체크를 켜고 끈다. 고르기(onSelect)는 하지 않는다 — 체크만 바꾸려는 손이다
// - Shift+클릭: 마지막으로 체크를 건드린 줄부터 이 줄까지를 켠다(탐색기, 엑셀과 같은 범위 선택). 기준 줄이 없으면 이 줄 하나
// 범위는 지금 보이는 순서(정렬, 찾기 뒤)로 센다. 줄 열쇠 목록을 받는 이유다.
import { useRef } from "react";

export function useRowChecks({ checked, onChecked, keys }: { checked?: ReadonlySet<string>; onChecked?: (next: Set<string>) => void; keys: string[] }) {
  const anchor = useRef<string | null>(null);
  const on = !!(checked && onChecked);
  const set = checked ?? new Set<string>();

  const allOn = on && keys.length > 0 && keys.every((k) => set.has(k));
  const someOn = on && keys.some((k) => set.has(k));
  const toggleAll = () => onChecked?.(allOn ? new Set([...set].filter((k) => !keys.includes(k))) : new Set([...set, ...keys]));
  const toggleOne = (k: string) => {
    if (!onChecked) return;
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    anchor.current = k;
    onChecked(next);
  };

  /** 줄 클릭이 체크 다중 선택이었으면 처리하고 true. 아니면 false(부르는 쪽이 평소대로 줄을 고른다) */
  const rowClick = (e: React.MouseEvent, k: string): boolean => {
    if (!onChecked) return false;
    if (e.shiftKey) {
      const from = anchor.current === null ? -1 : keys.indexOf(anchor.current);
      const to = keys.indexOf(k);
      const [a, b] = from < 0 ? [to, to] : [Math.min(from, to), Math.max(from, to)];
      // 범위를 끄는 기능은 두지 않는다 — Shift 는 늘 켠다(탐색기와 같다). 끄려면 Ctrl+클릭
      onChecked(new Set([...set, ...keys.slice(a, b + 1)]));
      window.getSelection()?.removeAllRanges();
      return true;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleOne(k);
      return true;
    }
    return false;
  };

  return { on, allOn, someOn, toggleAll, toggleOne, rowClick };
}
