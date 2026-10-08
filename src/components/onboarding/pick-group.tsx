"use client";
// 선택 카드 한 묶음 — 온보딩 7단계 중 다섯이 이것 하나를 쓴다(규약 §3).
//
// 상태를 여기서 쥐는 이유는 둘이다.
// 1) 고른 개수에 상한이 있는 화면(장르 5개)은 상한에 닿는 순간 안 고른 카드를 잠가야 한다.
//    zod 로 뒤에서 막으면 사람은 여섯 개를 고르고 다음을 누른 뒤에야 답이 통째로 안 저장된 것을 안다.
// 2) "답했는가" 를 바닥 버튼에 알려야 한다(answer-gate).
//
// 상한이 있는 화면은 카드 위에 "고른 수 / 상한" 을 띄운다(2026-10-08, 인터랙티브 회차). 고를 때마다 숫자가 튀고,
// 꽉 찬 뒤 잠긴 카드를 누르면 숫자가 흔들린다 — 잠긴 카드가 그냥 무반응이면 고장으로 읽힌다.
// 흔들림을 다시 걸려면 요소를 새로 만들어야 한다(CSS 애니메이션은 같은 요소에서 다시 돌지 않는다) — key 에 누른 횟수를 섞는 이유다.
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { ChoiceCard, ChoiceGrid } from "@/components/ui/choice-card";
import { useAnswerGate } from "@/components/onboarding/answer-gate";

export type PickOption = {
  value: string;
  label: string;
  note?: string;
};

export function PickGroup({
  name,
  options,
  multiple = false,
  defaultSelected = [],
  /** 다중선택 상한. 없으면 무제한 */
  max,
}: {
  name: string;
  options: readonly PickOption[];
  multiple?: boolean;
  defaultSelected?: readonly string[];
  max?: number;
}) {
  const [selected, setSelected] = useState<string[]>(() => [...defaultSelected]);
  const { setAnswered } = useAnswerGate();

  // 렌더 중에 부모 상태를 건드리면 안 되므로 effect 로 민다. 답이 0개가 되는 되돌리기도 알려야 한다
  useEffect(() => {
    setAnswered(selected.length > 0);
  }, [selected.length, setAnswered]);

  const full = multiple && max !== undefined && selected.length >= max;
  // 잠긴 카드를 누른 횟수. 0 이면 아직 막힌 적이 없다
  const [blocked, setBlocked] = useState(0);

  function toggle(value: string, checked: boolean) {
    setSelected((prev) => {
      if (!multiple) return checked ? [value] : [];
      if (!checked) return prev.filter((v) => v !== value);
      if (prev.includes(value)) return prev;
      if (max !== undefined && prev.length >= max) return prev;
      return [...prev, value];
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {max !== undefined && (
        <p className="flex items-center gap-2 text-[13px] text-mut" aria-live="polite">
          <span
            key={`${selected.length}-${blocked}`}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-bold tabular-nums",
              full ? "bg-acc text-on-ink" : "bg-acc-soft text-acc",
              blocked > 0 ? "animate-shake" : selected.length > 0 && "animate-pop",
            )}
          >
            {M.pickCount(selected.length, max)}
          </span>
          {full && <span>{M.pickFull}</span>}
        </p>
      )}
      <ChoiceGrid>
        {options.map((o, i) => {
          const checked = selected.includes(o.value);
          const locked = full && !checked;
          return (
            // 등장(reveal)을 카드에 직접 걸지 않고 감싸는 칸에 건다 — reveal 은 끝난 뒤에도 transform 을 붙들고 있어서(fill both)
            // 카드에 걸면 누름 모션(.press 의 scale)이 먹지 않는다
            <div key={o.value} className="reveal flex" style={stagger(i + 1)}>
              <ChoiceCard
                multiple={multiple}
                name={name}
                value={o.value}
                label={o.label}
                note={o.note}
                checked={checked}
                disabled={locked}
                onChange={(e) => {
                  setBlocked(0);
                  toggle(o.value, e.target.checked);
                }}
                onClick={locked ? () => setBlocked((n) => n + 1) : undefined}
                className="flex-1"
              />
            </div>
          );
        })}
      </ChoiceGrid>
    </div>
  );
}
