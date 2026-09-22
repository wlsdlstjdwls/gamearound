"use client";
// 선택 카드 한 묶음 — 온보딩 7단계 중 다섯이 이것 하나를 쓴다(규약 §3).
//
// 상태를 여기서 쥐는 이유는 둘이다.
// 1) 고른 개수에 상한이 있는 화면(장르 5개)은 상한에 닿는 순간 안 고른 카드를 잠가야 한다.
//    zod 로 뒤에서 막으면 사람은 여섯 개를 고르고 다음을 누른 뒤에야 답이 통째로 안 저장된 것을 안다.
// 2) "답했는가" 를 바닥 버튼에 알려야 한다(answer-gate).
import { useEffect, useState } from "react";
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
    <ChoiceGrid>
      {options.map((o) => {
        const checked = selected.includes(o.value);
        return (
          <ChoiceCard
            key={o.value}
            multiple={multiple}
            name={name}
            value={o.value}
            label={o.label}
            note={o.note}
            checked={checked}
            disabled={full && !checked}
            onChange={(e) => toggle(o.value, e.target.checked)}
          />
        );
      })}
    </ChoiceGrid>
  );
}
