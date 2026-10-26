"use client";
// 주소로 고르는 칩(탭, 정렬, 국가, 쪽 번호)이 누른 순간 켜지게 하는 공용 틀.
//
// 왜 필요한가(2026-10-12, 사용자: "토글은 빨라야 한다, 화면도 먼저 반영해줘야지", "다른 곳도 확인해 줘").
// 이 칩들은 상태가 주소(searchParams)에 있다. 같은 경로 안 이동이라 loading.tsx 가 뜨지 않고,
// 서버가 새 화면을 줄 때까지(로컬은 몇 초) 칩도 목록도 그대로라 단추가 죽은 것처럼 보였다.
//
// 수법은 목록 필터(game-filters/optimistic)와 같다: 누르면 useOptimistic 에 "어느 무리의 어느 칩" 을 넣고
// 같은 전환 안에서 router.push 한다. 전환이 끝나면 낙관 값은 저절로 사라지고 서버 값(active)이 다시 말한다.
//   - NavPendingScope: 화면 하나를 감싸는 틀. 없으면 NavChip 은 평범한 링크 칩처럼 동작한다(깨지지 않는다)
//   - NavChip: ChipLink 대신 쓰는 칩. group 이 같은 칩끼리 하나만 켜진다
//   - PendingRegion: 결과 자리. 기다리는 동안 흐리게 — 옛 목록이 새 조건의 결과처럼 보이면 안 된다
// 무리 이름(group)이 필요한 이유: 한 화면에 고르는 줄이 둘(예: 탭과 쪽 번호)이면 한쪽을 누를 때 다른 줄까지 꺼지면 안 된다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useOptimistic, useTransition, type ComponentProps } from "react";
import { chipClass, type ChipSize } from "@/components/ui/chip";
import { isPlainClick } from "@/components/ui/chip-nav";
import { cn } from "@/lib/cn";

type Picked = { group: string; href: string } | null;

type Scope = { picked: Picked; pending: boolean; go: (group: string, href: string, scroll: boolean) => void };

const ScopeContext = createContext<Scope | null>(null);

export function NavPendingScope({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useOptimistic<Picked>(null);
  const go = (group: string, href: string, scroll: boolean) =>
    startTransition(() => {
      setPicked({ group, href });
      router.push(href, { scroll });
    });
  return <ScopeContext.Provider value={{ picked, pending, go }}>{children}</ScopeContext.Provider>;
}

type NavChipProps = Omit<ComponentProps<typeof Link>, "className" | "href" | "onClick"> & {
  href: string;
  /** 같은 무리에서 하나만 켜진다. 켜짐이 없는 칩(이전, 다음)도 무리를 적어 둔다 — 누르면 그 무리의 켜짐이 옮겨 가야 한다 */
  group: string;
  /** 서버가 말하는 켜짐 */
  active?: boolean;
  size?: ChipSize;
  className?: string;
  compact?: boolean;
  outline?: boolean;
  /** 쪽 번호처럼 문서 맨 위로 가야 하는 이동. 거르는 칩은 제자리(false) */
  scroll?: boolean;
  /** aria-current 값. 쪽 번호는 "page", 나머지는 "true" */
  current?: "page" | "true";
};

export function NavChip({ href, group, active = false, size, className, compact, outline, scroll = false, current = "true", children, ...rest }: NavChipProps) {
  const scope = useContext(ScopeContext);
  const mine = scope?.picked?.group === group;
  const on = mine ? scope?.picked?.href === href : active;
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-current={on ? current : undefined}
      onClick={(e) => {
        if (!scope || !isPlainClick(e)) return;
        e.preventDefault();
        scope.go(group, href, scroll);
      }}
      className={chipClass({ active: on, size, className, compact, outline })}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * 링크가 아닌 자리(드롭다운, 입력칸)가 같은 틀 안에서 주소로 갈 때. 결과 자리(PendingRegion)가 같이 흐려진다.
 * 틀 밖이면 undefined — 부르는 쪽이 평범한 이동으로 내려간다.
 */
export function useNavPendingGo(): ((href: string) => void) | undefined {
  const scope = useContext(ScopeContext);
  return scope ? (href) => scope.go("", href, false) : undefined;
}

/**
 * 다시 조회 중 띠 — 머리띠 바로 아래 고정(globals.css 의 .pending-bar). 장식이라 낭독기에서 숨긴다 —
 * 기다린다는 사실은 결과 자리의 aria-busy 가 말한다.
 * 결과 자리(흐려지는 div) 밖에 둔다: 안에 두면 띠까지 반투명이 된다.
 */
export function PendingBar({ on }: { on: boolean }) {
  return on ? <span aria-hidden className="pending-bar" /> : null;
}

/** 결과 자리. 누를 수는 있다(가려 막지 않는다) — 기다리는 동안 다른 칩으로 바꿔 누를 수 있어야 한다 */
export function PendingRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  const pending = useContext(ScopeContext)?.pending ?? false;
  return (
    <>
      <PendingBar on={pending} />
      <div aria-busy={pending || undefined} className={cn("transition-opacity duration-base", pending && "opacity-50", className)}>
        {children}
      </div>
    </>
  );
}
