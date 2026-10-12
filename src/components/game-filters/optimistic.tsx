"use client";
// 필터를 누른 순간 화면 먼저 — 칩, 드롭다운, 걸린 조건, 내 취향이 새 조건으로 곧장 바뀌고 목록은 뒤에서 따라온다.
//
// 2026-10-12 사용자: "토글은 빨라야 한다, 조회는 좀 느려도", "화면도 먼저 반영해줘야지, 필터 아래 걸린 조건도 보이잖아".
// 필터의 상태는 전부 주소에 있어서, 서버가 새 주소로 다시 그려 줄 때까지 아무것도 안 바뀌었다(로컬은 그게 몇 초다).
//
// 수법: 누르면 그 주소를 lib/games/read-query 로 읽어 useOptimistic 에 넣고, 같은 전환(startTransition) 안에서
// router.push 한다. 전환이 끝나면(서버가 새 화면을 주면) 낙관 값은 저절로 서버 값으로 돌아간다 — 따로 되돌릴 일이 없다.
// 서버와 같은 읽기 함수를 쓰므로 둘이 다른 말을 하지 않는다.
//
// 링크는 그대로 링크다(새 탭 열기, 미리 받기, 낭독기의 "링크"). 평범한 왼쪽 클릭만 가로챈다(chip-nav 의 isPlainClick).
// 목록은 기다리는 동안 흐리게 둔다(PendingResults) — 옛 목록이 새 조건의 결과처럼 보이면 안 된다.
import { createContext, useContext, useOptimistic, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { isPlainClick } from "@/components/ui/chip-nav";
import { PendingBar } from "@/components/ui/nav-pending";
import { queryFromHref } from "@/lib/games/read-query";
import type { GamesQuery } from "@/lib/games-query";
import { cn } from "@/lib/cn";

type FilterState = {
  query: GamesQuery;
  pending: boolean;
  /** 주소로 간다. over 는 주소만으로는 모르는 결과(취향을 켜면 서버가 취향 조건을 얹는다)를 먼저 그릴 때 */
  navigate: (href: string, over?: GamesQuery) => void;
};

const FilterContext = createContext<FilterState | null>(null);

export function FilterStateProvider({ filter, children }: { filter: GamesQuery; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useOptimistic(filter);

  const navigate = (href: string, over?: GamesQuery) => {
    startTransition(() => {
      setQuery(over ?? queryFromHref(href));
      router.push(href, { scroll: false });
    });
  };

  return <FilterContext.Provider value={{ query, pending, navigate }}>{children}</FilterContext.Provider>;
}

/** 지금 그릴 조건. 제공자 밖(목록 화면의 loading.tsx 뼈대)에서는 받은 값을 그대로 쓴다 */
export function useFilterQuery(fallback: GamesQuery): GamesQuery {
  return useContext(FilterContext)?.query ?? fallback;
}

/**
 * 링크의 onClick. 제공자 밖이면 아무것도 안 해서 링크가 평소대로 간다.
 * 평범한 클릭만 가로챈다 — 새 탭 열기는 이 화면을 바꾸지 않는다.
 */
export function useFilterClick(): (href: string, over?: GamesQuery) => ((e: MouseEvent) => void) | undefined {
  const ctx = useContext(FilterContext);
  return (href, over) =>
    ctx
      ? (e) => {
          if (!isPlainClick(e)) return;
          e.preventDefault();
          ctx.navigate(href, over);
        }
      : undefined;
}

/** 드롭다운처럼 링크가 아닌 자리 — 제공자가 있으면 먼저 그리고, 없으면 그냥 간다 */
export function useFilterNavigate(): ((href: string) => void) | undefined {
  return useContext(FilterContext)?.navigate;
}

/** 목록 자리 — 새 조건의 결과가 오기 전까지 옛 목록을 흐리게 둔다. 누를 수는 있다(가려 막지 않는다) */
export function PendingResults({ className, children }: { className?: string; children: React.ReactNode }) {
  const pending = useContext(FilterContext)?.pending ?? false;
  return (
    <>
      <PendingBar on={pending} />
      <div aria-busy={pending || undefined} className={cn("transition-opacity duration-base", pending && "opacity-50", className)}>
        {children}
      </div>
    </>
  );
}
