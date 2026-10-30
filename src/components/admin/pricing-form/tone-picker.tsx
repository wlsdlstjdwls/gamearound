"use client";
// 색 고르기 칸 — 요금 카드 배지, 띠, 안내 문구와 프로모션 배지(lib/pricing/copy-tones, 2026-10-30 사용자 "색상도 바꿀 수 있으면").
// 보기마다 그 색으로 칠한 칩에 색 이름을 적는다 — 이름만 있으면 "진한 보라" 가 어떤 색인지 눌러 봐야 알았다.
// 라디오 묶음으로 세운다: 방향키로 옮기고 낭독기가 "배지 색상, 보라, 2/5" 로 읽는다. 누르면 바로 바뀐다(미리 보기도 같이, AGENTS 6장).
import { useId } from "react";
import { cn } from "@/lib/cn";
import { tagClass, type TagTone } from "@/components/ui/tag";
import { BOX_TONE_CLASS, TEXT_TONE_CLASS } from "@/components/payments/copy-tone";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import type { BoxTone, TextTone } from "@/lib/pricing/copy-tones";

type Kind = "badge" | "box" | "text";

/** 칩 모양. 실제 카드에 서는 모양을 작게 옮긴다 — 배지는 Tag, 띠는 옅은 면, 안내는 글자색 + 옅은 테두리 */
function chipClass(kind: Kind, tone: string): string {
  if (kind === "badge") return tagClass({ tone: tone as TagTone });
  if (kind === "box") return cn("rounded-md px-2 py-0.5 text-[12px] font-semibold", BOX_TONE_CLASS[tone as BoxTone]);
  return cn("rounded-md px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset ring-line", TEXT_TONE_CLASS[tone as TextTone]);
}

export function TonePicker<T extends string>({ label, kind, tones, value, onChange }: { label: string; kind: Kind; tones: readonly T[]; value: T; onChange: (tone: T) => void }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex min-h-10 flex-wrap items-center gap-1.5">
      {tones.map((t) => (
        <label key={t} className="press relative inline-flex min-h-8 cursor-pointer items-center rounded-lg p-0.5 has-[:checked]:shadow-[0_0_0_2px_var(--acc)] has-[:focus-visible]:shadow-[0_0_0_2px_var(--acc),0_0_0_5px_var(--acc-glow)]">
          <input type="radio" name={name} value={t} checked={value === t} onChange={() => onChange(t)} className="sr-only" />
          <span className={chipClass(kind, t)}>{M.toneLabels[t as keyof typeof M.toneLabels]}</span>
        </label>
      ))}
    </div>
  );
}
