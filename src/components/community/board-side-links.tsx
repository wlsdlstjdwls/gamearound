"use client";
// 게시판 보조 메뉴의 칸들(post-board 의 SideMenu 가 글 수를 세어 넘긴다).
//
// 누른 순간 켜진다(AGENTS 6장). 칸마다 다른 경로라 loading.tsx 가 뜨긴 하지만, 서버가 첫 조각을 줄 때까지(로컬 수백 ms)
// 누른 칸이 그대로라 단추가 죽은 것처럼 보였다(2026-11-20 390px 실측: 두 프레임 뒤에도 앞 칸이 켜져 있었다).
// 좁은 화면에서는 판 없는 칩 한 줄이라(post-board) 더 그렇게 읽혔다. 바닥 탭바(site-tabbar)와 같은 수법이다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { isPlainClick } from "@/components/ui/chip-nav";
import { cn } from "@/lib/cn";

export type BoardSideItem = { href: string; label: string; count: number | null };

export function BoardSideLinks({ items, current }: { items: readonly BoardSideItem[]; current: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, setPicked] = useOptimistic<string | null>(null);
  const on = picked ?? current;
  return (
    <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col">
      {items.map((it) => (
        <li key={it.href}>
          <Link
            href={it.href}
            aria-current={it.href === on ? "page" : undefined}
            onClick={(e) => {
              if (!isPlainClick(e) || it.href === on) return;
              e.preventDefault();
              startTransition(() => {
                setPicked(it.href);
                router.push(it.href);
              });
            }}
            className={cn(
              "flex min-h-10 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 text-[13.5px] transition-colors",
              it.href === on ? "bg-acc-soft font-bold text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <span>{it.label}</span>
            {it.count !== null && <span className="tabular-nums text-[12px] text-dim">{it.count.toLocaleString("ko-KR")}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
