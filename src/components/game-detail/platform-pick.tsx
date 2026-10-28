"use client";
// 상세에서 "지금 어느 플랫폼을 보나" 한 값(2026-10-27, 사용자: "각 플랫폼별 선택 가능해야 되는데 안 된다, 목업은 되던데
// 그에 따라 차트나 할인 예측도 바뀌고"). 목업은 플랫폼 카드를 고르면 그래프와 할인 예측이 그 플랫폼 값으로 바뀐다.
//
// 값은 묶음 열쇠(brandKeyOf — steam, playstation, xbox, nintendo)다. 카드가 묶음 단위(PS5, PS4 는 PlayStation 카드 둘이지만
// 이름은 하나)라서, 기기 하나(ps5)를 고르면 같은 이름의 다른 카드가 고른 것인지 아닌지 애매해진다. null 은 "전체" 다.
// 처음 값은 줄 맨 앞에 선 파는 플랫폼 카드의 묶음이다(서버가 정해 넘긴다, 2026-10-27 사용자 지정). 그 뒤는 사람이 고를 때마다 바뀐다.
//
// 바깥(가격 자세히 화면)처럼 Provider 가 없는 자리에서는 usePlatformPick 이 null 을 돌려주고 쓰는 쪽이 제 상태를 쓴다.
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/cn";

type PlatformPick = { brand: string | null; setBrand: (brand: string | null) => void };

const PlatformPickContext = createContext<PlatformPick | null>(null);

export function PlatformPickProvider({ initial, children }: { initial: string | null; children: React.ReactNode }) {
  const [brand, setBrand] = useState<string | null>(initial);
  return <PlatformPickContext.Provider value={{ brand, setBrand }}>{children}</PlatformPickContext.Provider>;
}

export function usePlatformPick(): PlatformPick | null {
  return useContext(PlatformPickContext);
}

/**
 * 고를 수 있는 플랫폼 카드(li). 카드 어디를 눌러도 고른다 — 단 안의 링크, 단추(구매하기, 추가 콘텐츠)는 제 일을 한다.
 * 키보드와 낭독기는 카드 안 감춘 단추로 고른다(카드 통째를 단추로 만들면 안의 단추가 단추 속 단추가 된다).
 */
export function PickableTile({ brand, label, id, className, children }: { brand: string; label: string; id?: string; className?: string; children: React.ReactNode }) {
  const pick = usePlatformPick();
  const on = pick?.brand === brand;
  return (
    <li
      id={id}
      data-picked={on || undefined}
      onClick={(e) => {
        if (!pick || (e.target as HTMLElement).closest("a, button")) return;
        pick.setBrand(brand);
      }}
      className={cn(
        className,
        pick && "cursor-pointer transition-[box-shadow,transform] duration-base",
        // 고른 카드는 파랑 고리 + 살짝 떠오름. 최저가 표시(딱지)와 겹쳐도 둘은 다른 말이다 — 고리는 "지금 보는 것", 딱지는 "가장 싼 것".
        // 끝의 ! 는 카드 바탕 그림자(shadow-hair)를 이기기 위해서다. cn 은 클래스를 합치지 않아 둘 중 CSS 뒤에 나온 쪽이 이겼고,
        // 고리가 통째로 안 보였다(2026-10-28 사용자 "플랫폼 선택돼도 테두리가 안 보인다")
        on && "-translate-y-0.5 shadow-[0_0_0_2px_var(--acc),var(--elev-card-hover)]!",
      )}
    >
      {pick && (
        <button type="button" className="sr-only" aria-pressed={on} onClick={() => pick.setBrand(brand)}>
          {label} 기준으로 가격 추이와 할인 예측 보기
        </button>
      )}
      {children}
    </li>
  );
}
