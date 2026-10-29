"use client";
// 요금 카드 문구 판(2026-10-29 다시 짬, 사용자 "{saving}, {credits} 는 뭐가 뭔지 모르겠고, 필드 이름도 뭐가 뭔지 모르겠다").
//
// 칸 이름은 "카드 어디에 서는가" 로 부르고 칸마다 한 줄 도움말을 단다. 칸은 카드에 서는 순서(머리, 값 아래, 혜택, 단추)로 묶는다 —
// 오른쪽 미리 보기(preview)를 위에서 아래로 읽는 순서와 같다. 고른 카드 탭은 바깥(pricing-form)이 쥐어 미리 보기가 같은 카드를 보인다.
//
// 자리표시는 화면에서 [절약 금액] 꼴로 보이고 저장은 {saving} 꼴 그대로다(lib/pricing/copy-tokens). 단추를 누르면 마지막에 누른 칸의
// 커서 자리에 들어간다. 단추가 칸의 포커스를 빼앗지 않게 mousedown 을 막는다 — 빼앗기면 커서 자리를 잃는다.
import { useRef } from "react";
import { cn } from "@/lib/cn";
import type { Patch } from "@/components/admin/pricing-form";
import { Panel } from "@/components/admin/pricing-form/sections";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { DetailTabs } from "@/components/ui/tabs";
import { TextField, TEXTAREA_CLASS } from "@/components/ui/text-field";
import { COPY_TOKENS, displayToken, fromDisplayCopy, toDisplayCopy } from "@/lib/pricing/copy-tokens";
import { PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

type TextKey = "name" | "eyebrow" | "summary" | "tag" | "now" | "base" | "hint" | "cta";
type Field = { kind: "text"; key: TextKey } | { kind: "lines"; key: "lines" | "benefits" };
type FieldEl = HTMLInputElement | HTMLTextAreaElement;

/**
 * 카드에 서는 순서. 칸이 카드에 안 서는 단은 뺀다 — 낱개 카드에는 혜택 목록 제목(base)이 없고(맨 아랫단이라 "OO에 더해" 가 없다),
 * 카드 아래 빨간 안내(hint)는 낱개 카드에만 선다(components/payments/plan-cards). 내 멤버십 화면 혜택은 멤버십에만 있다
 */
const COPY_GROUPS: { title: "groupHead" | "groupPrice" | "groupBenefits" | "groupAction"; fields: Field[]; only?: Partial<Record<string, TierKey[]>> }[] = [
  { title: "groupHead", fields: [{ kind: "text", key: "name" }, { kind: "text", key: "eyebrow" }, { kind: "text", key: "summary" }, { kind: "text", key: "tag" }] },
  { title: "groupPrice", fields: [{ kind: "text", key: "now" }] },
  { title: "groupBenefits", fields: [{ kind: "text", key: "base" }, { kind: "lines", key: "lines" }, { kind: "lines", key: "benefits" }], only: { base: ["bundle", "membership"], benefits: ["membership"] } },
  { title: "groupAction", fields: [{ kind: "text", key: "cta" }, { kind: "text", key: "hint" }], only: { hint: ["single"] } },
];

export function CopySection({ value, patch, tier, onTier }: { value: PricingSettings; patch: Patch; tier: TierKey; onTier: (t: TierKey) => void }) {
  /** 마지막에 누른 칸과 그 칸에 값을 써 넣는 함수. 자리표시 단추가 쓴다 */
  const last = useRef<{ el: FieldEl; write: (display: string) => void } | null>(null);

  const setText = (t: TierKey, key: TextKey, display: string) => patch((d) => ({ ...d, copy: { ...d.copy, [t]: { ...d.copy[t], [key]: fromDisplayCopy(display) } } }));
  // 치는 동안은 빈 줄도 그대로 둔다(엔터 뒤 빈 줄이 바로 사라지면 다음 줄을 칠 수 없다). 저장할 때 걸러낸다(pricing-form 의 normalize)
  const setLines = (t: TierKey, key: "lines" | "benefits", display: string) =>
    patch((d) => ({ ...d, copy: { ...d.copy, [t]: { ...d.copy[t], [key]: fromDisplayCopy(display).split("\n") } } }));

  const insert = (token: string) => {
    const f = last.current;
    if (!f || !document.contains(f.el)) return;
    const start = f.el.selectionStart ?? f.el.value.length;
    const end = f.el.selectionEnd ?? start;
    // 브라우저의 글 넣기로 넣는다 — 칸에 친 것과 같은 입력이라 Ctrl+Z 로 되돌릴 수 있다(2026-10-29 사용자 "컨트롤+z 가 안 된다").
    // 값을 손으로 갈아 끼우면 되돌리기 기록이 날아간다. 글 넣기를 못 하는 브라우저만 갈아 끼운다
    f.el.focus();
    f.el.setSelectionRange(start, end);
    if (document.execCommand("insertText", false, token)) return;
    f.write(f.el.value.slice(0, start) + token + f.el.value.slice(end));
    const caret = start + token.length;
    requestAnimationFrame(() => {
      f.el.focus();
      f.el.setSelectionRange(caret, caret);
    });
  };

  const field = (t: TierKey, f: Field) => {
    const id = `copy-${t}-${f.key}`;
    if (f.kind === "text") {
      const write = (display: string) => setText(t, f.key, display);
      return (
        <TextField
          key={f.key}
          id={id}
          label={M.fields[f.key]}
          hint={M.fieldHints[f.key]}
          value={toDisplayCopy(value.copy[t][f.key])}
          onChange={(e) => write(e.target.value)}
          onFocus={(e) => (last.current = { el: e.currentTarget, write })}
          labelSide
          compact
        />
      );
    }
    const lines = f.key === "benefits" ? value.copy.membership.benefits : value.copy[t].lines;
    const write = (display: string) => setLines(t, f.key, display);
    return (
      <div key={f.key} className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[var(--field-label-w,112px)_minmax(0,1fr)] sm:gap-x-3 sm:gap-y-1.5">
        <label htmlFor={id} className={cn(FIELD_LABEL_CLASS, "sm:pt-3")}>
          {M.fields[f.key]}
        </label>
        <textarea
          id={id}
          aria-describedby={`${id}-hint`}
          rows={Math.max(2, lines.length + 1)}
          className={TEXTAREA_CLASS}
          value={toDisplayCopy(lines.join("\n"))}
          onChange={(e) => write(e.target.value)}
          onFocus={(e) => (last.current = { el: e.currentTarget, write })}
        />
        <p id={`${id}-hint`} className="text-xs text-dim sm:col-start-2">
          {M.fieldHints[f.key]}
        </p>
      </div>
    );
  };

  const tierPanel = (t: TierKey) => (
    <div className="flex max-w-[760px] flex-col gap-4 pt-1">
      {COPY_GROUPS.map((g) => {
        const fields = g.fields.filter((f) => !g.only?.[f.key] || g.only[f.key]?.includes(t));
        return (
          // 묶음은 판이 아니라 얇은 머리 줄로 가른다(2026-10-29, 백오피스 상세 폼). 회색 판 넷이 겹겹이 쌓여 칸보다 판이 먼저 보였다
          <fieldset key={g.title} className="flex flex-col gap-2.5 border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
            <legend className="sr-only">{M[g.title]}</legend>
            <p aria-hidden className="text-[12px] font-bold tracking-[0.04em] text-acc">
              {M[g.title]}
            </p>
            {fields.map((f) => field(t, f))}
          </fieldset>
        );
      })}
    </div>
  );

  return (
    <Panel title={M.copyTitle} lead={M.copyLead}>
      <div className="flex flex-col gap-2 rounded-[var(--radius-inset)] border border-line-soft px-3.5 py-3">
        <p className="text-[12.5px] font-bold text-ink">{M.tokensTitle}</p>
        <p className="text-[12px] text-dim">{M.tokensLead}</p>
        <div className="flex flex-wrap gap-1.5">
          {COPY_TOKENS.map((t) => (
            <button
              key={t.key}
              type="button"
              // 칸의 포커스와 커서 자리를 지킨다(머리 주석)
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(displayToken(t.key))}
              className="press tap inline-flex items-center gap-1.5 rounded-full bg-acc-soft px-3 text-[12.5px] font-semibold text-acc hover:bg-acc hover:text-on-ink"
            >
              {displayToken(t.key)}
              <span className="font-normal opacity-80">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <DetailTabs
        label={M.copyTabs}
        active={tier}
        onChange={(k) => onTier(k as TierKey)}
        tabs={(Object.keys(TIER_LABELS) as TierKey[]).map((t) => ({ key: t, label: TIER_LABELS[t], panel: tierPanel(t) }))}
      />
    </Panel>
  );
}
