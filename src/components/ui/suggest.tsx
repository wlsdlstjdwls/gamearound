"use client";

// 입력칸 밑에 뜨는 제안 목록 — 자유 입력은 그대로 두고, 고를 수 있는 이름을 보여 준다.
//
// 브라우저 datalist 를 대신한다(2026-09-30 사용자 지적: "목록도 이쁘게"). datalist 는 모양을 바꿀 수 없어
// 우리 화면 위에 회색 시스템 목록이 떴다. 거르는 일은 부르는 쪽이 한다(items) — 이 파일은 무엇을 걸렀는지 모르고
// 보여 주기, 키보드, 낭독기 연결만 맡는다. 그래서 부품 사전이 아닌 목록에도 그대로 쓴다.
//
// 훅으로 낸 이유: 입력칸의 차림이 자리마다 다르다(공용 TextField, 온보딩의 맨 input).
// 칸을 이 파일이 그리면 차림이 한 벌로 묶이거나 복제된다 — 칸에 붙일 속성과 목록만 돌려준다.
// 부르는 쪽은 칸과 목록을 `relative` 상자 하나에 넣는다.
//
// 접근성은 ARIA combobox(목록형) 꼴이다: 포커스는 칸에 머물고 aria-activedescendant 로 고른 줄을 알린다.
// 바깥 누르기는 blur 로 닫는다 — 줄은 mousedown 에서 preventDefault 해서 누르는 동안 칸이 포커스를 잃지 않게 한다.
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export type SuggestItem = { key: string; name: string };

export function useSuggest<T extends SuggestItem>({
  id,
  value,
  onValue,
  items,
}: {
  /** 칸의 id. 목록과 줄의 id 가 여기서 나온다 */
  id: string;
  value: string;
  onValue: (next: string) => void;
  /** 지금 값으로 이미 거른 목록 */
  items: readonly T[];
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-suggest`;
  // 친 값이 곧 유일한 제안이면 목록이 할 말이 없다 — 방금 고른 뒤 목록이 그대로 떠 있지 않게 한다
  const redundant = items.length === 1 && items[0].name === value;
  const shown = open && items.length > 0 && !redundant;

  const pick = (item: T) => {
    onValue(item.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (items.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + items.length) % items.length);
    } else if (e.key === "Enter" && shown && active >= 0) {
      // 줄을 고르는 엔터만 삼킨다 — 목록이 닫혀 있으면 엔터는 폼 제출 그대로다
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape" && shown) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const inputProps = {
    id,
    value,
    role: "combobox" as const,
    autoComplete: "off",
    "aria-autocomplete": "list" as const,
    "aria-expanded": shown,
    "aria-controls": listId,
    "aria-activedescendant": shown && active >= 0 ? `${listId}-${active}` : undefined,
    onChange: (e: { target: { value: string } }) => {
      onValue(e.target.value);
      setOpen(true);
      setActive(-1);
    },
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onKeyDown,
  };

  const popup: ReactNode = shown ? (
    <ul
      id={listId}
      role="listbox"
      className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 origin-top animate-scale-in overflow-y-auto overscroll-contain rounded-xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-2)]"
    >
      {items.map((item, i) => {
        const selected = item.name === value;
        return (
          <li
            key={item.key}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={selected}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(item)}
            className={cn(
              // 줄 높이 44px — 손가락 목표(규약 §6). 고른 줄은 칩과 같은 브랜드 옅은 면이다
              "flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[14.5px] text-ink",
              i === active ? "bg-surface-2" : "",
              selected && "font-semibold text-acc",
            )}
          >
            <Clamp lines={1} className="min-w-0 flex-1">
              {item.name}
            </Clamp>
            {selected && <CheckIcon size={15} className="shrink-0 text-acc" />}
          </li>
        );
      })}
    </ul>
  ) : null;

  return { inputProps, popup };
}
