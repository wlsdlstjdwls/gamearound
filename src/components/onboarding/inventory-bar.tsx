"use client";
// 장르 인벤토리 — 고른 장르가 위쪽 다섯 칸에 하나씩 장착된다(2026-10-08 사용자: "선택하는 것도 게임하듯이").
//
// "3 / 5" 숫자 알약을 대신한다. 숫자는 몇 개 남았는지만 말하지만, 칸은 **무엇을** 골랐는지까지 한눈에 보여 주고,
// 다 차면 빈 칸이 없어지는 것 자체가 "더 못 넣는다" 를 말한다.
// 칸을 누르면 그 장르를 뺀다 — 17칸 격자에서 고른 것을 다시 찾아 누르는 수고를 던다.
// 잠긴 카드를 누르면 칸 줄이 흔들린다(shakeKey 가 바뀌면 요소를 새로 만들어 애니메이션을 다시 건다).
import { cn } from "@/lib/cn";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";

export function InventoryBar({
  items,
  max,
  onRemove,
  shakeKey,
}: {
  items: readonly { value: string; label: string }[];
  max: number;
  onRemove: (value: string) => void;
  /** 0 이면 흔들지 않는다 */
  shakeKey: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <ul key={shakeKey} aria-label={M.genres.inventory} className={cn("grid grid-cols-5 gap-1.5", shakeKey > 0 && "animate-shake")}>
        {Array.from({ length: max }, (_, i) => {
          const item = items[i];
          return (
            <li key={item?.value ?? `empty-${i}`} className="flex">
              {item ? (
                <button
                  type="button"
                  onClick={() => onRemove(item.value)}
                  aria-label={M.genres.remove(item.label)}
                  // data-on: 체크박스 없이 "고른 키" 차림을 입는다(globals.css .key[data-on]). 장착되는 순간 한 번 튄다
                  data-on=""
                  className="key flex h-11 flex-1 items-center justify-center rounded-[10px] px-1 text-center text-[12px] font-bold leading-[1.15] text-acc [overflow-wrap:anywhere]"
                >
                  {item.label}
                </button>
              ) : (
                // 빈 칸 — 점선 테두리. 장착할 자리가 남았다는 표시라 누를 것이 없다
                <span aria-hidden className="flex h-11 flex-1 rounded-[10px] border-[1.5px] border-dashed border-line-strong" />
              )}
            </li>
          );
        })}
      </ul>
      {/* 몇 개 골랐는지는 낭독기에만 숫자로. 눈에는 칸이 말한다 */}
      <p className="sr-only" aria-live="polite">
        {M.pickCount(items.length, max)}
      </p>
    </div>
  );
}
