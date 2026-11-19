"use client";
// 사용자별프로그램관리 왼쪽 메뉴 트리(2026-11-19 사용자 "상위메뉴도 sbo 처럼 만들 수 있나"). SBO 사용자프로그램관리의 'Program' 트리 꼴:
// 전체 > 상위메뉴(접고 펴기) > 프로그램(잎). 고른 마디가 가운데 두 목록을 거른다 — 상위메뉴면 그 아래 프로그램, 잎이면 그 프로그램 하나.
// SBO 는 처음에 다 접어 둔다(collapseAll). 우리도 상위메뉴는 접어 두고 전체만 펴 둔다 — 상위메뉴 열 개가 한눈에 서야 고르기 쉽다.
//
// 키보드는 트리 표준을 따른다(WAI-ARIA tree): 위아래로 옮기고, 오른쪽은 펴기 또는 첫 자식, 왼쪽은 접기 또는 부모, Enter, Space 로 고른다.
// 높이는 화면 바닥까지 맞추고(그리드의 fit 과 같은 자로 잰다) 넘치면 트리 안만 구른다.
import { useMemo, useRef, useState } from "react";
import { useFitHeight } from "@/components/admin/screen/data-grid/fit";
import { CaretLeftIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export type TreeNode = { key: string; label: string; count?: number; children?: TreeNode[] };

type Flat = { node: TreeNode; depth: number; parent: string | null; open: boolean };

/** 마디 한 단의 들여쓰기(px). 펴기 단추 폭만큼이라 잎 글자가 부모 글자 밑에 줄 선다 */
const INDENT = 16;

export function MenuTree({ label, root, selected, onSelect }: { label: string; root: TreeNode; selected: string; onSelect: (key: string) => void }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([root.key]));
  const [focus, setFocus] = useState(selected);
  const boxRef = useRef<HTMLDivElement>(null);
  const fitted = useFitHeight(boxRef, true);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  const flat = useMemo(() => {
    const out: Flat[] = [];
    const walk = (n: TreeNode, depth: number, parent: string | null) => {
      const isOpen = open.has(n.key);
      out.push({ node: n, depth, parent, open: isOpen });
      if (isOpen) n.children?.forEach((c) => walk(c, depth + 1, n.key));
    };
    walk(root, 0, null);
    return out;
  }, [root, open]);

  const toggle = (key: string, to?: boolean) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (to ?? !next.has(key)) next.add(key);
      else next.delete(key);
      return next;
    });

  const moveTo = (key: string) => {
    setFocus(key);
    itemRefs.current.get(key)?.focus();
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const f = flat[i];
    const has = !!f.node.children?.length;
    if (e.key === "ArrowDown" && i < flat.length - 1) moveTo(flat[i + 1].node.key);
    else if (e.key === "ArrowUp" && i > 0) moveTo(flat[i - 1].node.key);
    else if (e.key === "ArrowRight" && has) {
      if (f.open) moveTo(flat[i + 1].node.key);
      else toggle(f.node.key, true);
    } else if (e.key === "ArrowLeft") {
      if (has && f.open) toggle(f.node.key, false);
      else if (f.parent) moveTo(f.parent);
    } else if (e.key === "Enter" || e.key === " ") onSelect(f.node.key);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={boxRef}
      role="tree"
      aria-label={label}
      className="overflow-auto rounded-lg border border-line bg-surface py-1"
      style={fitted?.fits ? { height: fitted.px } : fitted ? { maxHeight: fitted.px } : undefined}
    >
      {flat.map((f, i) => {
        const has = !!f.node.children?.length;
        const on = f.node.key === selected;
        return (
          <div
            key={f.node.key}
            ref={(el) => {
              if (el) itemRefs.current.set(f.node.key, el);
              else itemRefs.current.delete(f.node.key);
            }}
            role="treeitem"
            aria-level={f.depth + 1}
            aria-selected={on}
            aria-expanded={has ? f.open : undefined}
            tabIndex={f.node.key === focus ? 0 : -1}
            onClick={() => {
              setFocus(f.node.key);
              onSelect(f.node.key);
            }}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "mx-1 flex min-h-9 cursor-pointer items-center gap-1 rounded-md pr-2 text-[13px] outline-none transition-colors duration-fast focus-visible:shadow-[inset_0_0_0_2px_var(--acc)]",
              on ? "bg-acc-row font-semibold text-ink" : "text-ink-2 hover:bg-surface-2",
              f.depth === 0 && "font-semibold",
            )}
            style={{ paddingLeft: 4 + f.depth * INDENT }}
          >
            {has ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(f.node.key);
                }}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded text-dim hover:text-ink"
              >
                {/* 접혔으면 오른쪽, 펴졌으면 아래를 가리킨다 */}
                <CaretLeftIcon size={10} className={cn("transition-transform duration-fast", f.open ? "-rotate-90" : "rotate-180")} />
              </button>
            ) : (
              <span className="inline-block size-5 shrink-0" />
            )}
            <Clamp text={f.node.label} className="min-w-0 flex-1">
              {f.node.label}
            </Clamp>
            {f.node.count !== undefined && <span className="shrink-0 text-[12px] tabular-nums text-dim">{f.node.count}</span>}
          </div>
        );
      })}
    </div>
  );
}
