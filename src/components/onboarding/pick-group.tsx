"use client";
// 선택 카드 한 묶음 — 온보딩 7단계 중 다섯이 이것 하나를 쓴다(규약 §3).
//
// 상태를 여기서 쥐는 이유는 둘이다.
// 1) 고른 개수에 상한이 있는 화면(장르 5개)은 상한에 닿는 순간 안 고른 카드를 잠가야 한다.
//    zod 로 뒤에서 막으면 사람은 여섯 개를 고르고 다음을 누른 뒤에야 답이 통째로 안 저장된 것을 안다.
// 2) "답했는가" 를 바닥 버튼에 알려야 한다(answer-gate).
//
// 질문마다 다른 게임 장치를 붙인다(2026-10-08 사용자: "선택하는 것도 그대로다, 게임하듯이").
// - 상한이 있는 화면(장르): 위쪽 인벤토리 칸에 고른 것이 하나씩 장착된다(inventory-bar). 꽉 찬 뒤 잠긴 카드를 누르면
//   칸 줄이 흔들린다 — 잠긴 카드가 그냥 무반응이면 고장으로 읽힌다.
// - 게이지가 있는 선택지(성향, 플레이타임): 카드 아래 도트 게이지(pixel-meter).
// - 기기 모양이 있는 선택지(플랫폼): 이름 왼쪽 그림.
// 무엇을 붙일지는 선택지 데이터(PickOption)가 정한다 — 단계 이름으로 분기하지 않는다.
import { useEffect, useState, type ReactNode } from "react";
import { stagger } from "@/lib/motion";
import { METER_MAX, type PlatformShape } from "@/lib/onboarding/constants";
import { ChoiceCard, ChoiceGrid } from "@/components/ui/choice-card";
import { GamepadIcon, HandheldIcon, MonitorIcon } from "@/components/ui/icons";
import { useAnswerGate } from "@/components/onboarding/answer-gate";
import { InventoryBar } from "@/components/onboarding/inventory-bar";
import { PixelMeter } from "@/components/onboarding/pixel-meter";

export type PickOption = {
  value: string;
  label: string;
  note?: string;
  /** 이름 왼쪽 기기 그림 */
  shape?: PlatformShape;
  /** 카드 아래 도트 게이지. peak 는 꼭대기 칸을 빛 색으로 */
  meter?: { level: number; caption: string; peak?: boolean };
};

const SHAPE_ICON: Record<PlatformShape, ReactNode> = {
  pc: <MonitorIcon size={17} />,
  console: <GamepadIcon size={17} />,
  handheld: <HandheldIcon size={17} />,
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
    setBlocked(0);
    setSelected((prev) => {
      if (!multiple) return checked ? [value] : [];
      if (!checked) return prev.filter((v) => v !== value);
      if (prev.includes(value)) return prev;
      if (max !== undefined && prev.length >= max) return prev;
      return [...prev, value];
    });
  }

  // 인벤토리는 고른 순서대로 찬다 — 방금 고른 것이 맨 뒤 칸에 들어가는 것이 보여야 "장착" 으로 읽힌다
  const equipped = selected.flatMap((v) => options.filter((o) => o.value === v).map((o) => ({ value: o.value, label: o.label })));

  return (
    <div className="flex flex-col gap-3">
      {max !== undefined && <InventoryBar items={equipped} max={max} onRemove={(v) => toggle(v, false)} shakeKey={blocked} />}
      {/* 둘째 줄이 하나도 없으면 촘촘한 격자로 — 플랫폼, 장르, 구독처럼 이름만 있는 선택지다 */}
      <ChoiceGrid dense={options.every((o) => !o.note)}>
        {options.map((o, i) => {
          const checked = selected.includes(o.value);
          const locked = full && !checked;
          return (
            // 등장(reveal)을 카드에 직접 걸지 않고 감싸는 칸에 건다 — reveal 은 끝난 뒤에도 transform 을 붙들고 있어서(fill both)
            // 카드에 걸면 누름 모션(.key 의 내려앉기)과 고름 모션(pick)이 먹지 않는다
            <div key={o.value} className="reveal flex" style={stagger(i + 1)}>
              <ChoiceCard
                multiple={multiple}
                name={name}
                value={o.value}
                label={o.label}
                note={o.note}
                leading={o.shape ? SHAPE_ICON[o.shape] : undefined}
                footer={o.meter ? <PixelMeter level={o.meter.level} max={METER_MAX} caption={o.meter.caption} peak={o.meter.peak} /> : undefined}
                checked={checked}
                disabled={locked}
                onChange={(e) => toggle(o.value, e.target.checked)}
                onClick={locked ? () => setBlocked((n) => n + 1) : undefined}
                className="min-w-0 flex-1"
              />
            </div>
          );
        })}
      </ChoiceGrid>
    </div>
  );
}
