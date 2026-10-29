"use client";
// 요금 카드 문구 판(2026-10-29 다시 짬, 사용자 "{saving}, {credits} 는 뭐가 뭔지 모르겠고, 필드 이름도 뭐가 뭔지 모르겠다").
//
// 칸 이름은 "카드 어디에 서는가" 로 부르고 칸마다 한 줄 도움말을 단다. 칸은 카드에 서는 순서(머리, 값 아래, 혜택, 단추)로 묶는다 —
// 오른쪽 미리 보기(preview)를 위에서 아래로 읽는 순서와 같다. 고른 카드 탭은 바깥(pricing-form)이 쥐어 미리 보기가 같은 카드를 보인다.
//
// 자리표시는 화면에서 [절약 금액] 꼴로 보이고 저장은 {saving} 꼴 그대로다(lib/pricing/copy-tokens).
// 넣는 길은 칸마다 붙은 "값 넣기" 단추와 `[` 치기다(pricing-form/token-menu). 판 맨 위 단추 상자는 2026-10-29 밤 걷었다(사용자 "불편하다").
import { cn } from "@/lib/cn";
import type { Patch } from "@/components/admin/pricing-form";
import { Panel } from "@/components/admin/pricing-form/sections";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { DetailTabs } from "@/components/ui/tabs";
import { TextField, TEXTAREA_CLASS } from "@/components/ui/text-field";
import { fromDisplayCopy, toDisplayCopy } from "@/lib/pricing/copy-tokens";
import { TokenMenu } from "@/components/admin/pricing-form/token-menu";
import { PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

type TextKey = "name" | "eyebrow" | "summary" | "tag" | "now" | "base" | "hint" | "cta";
type Field = { kind: "text"; key: TextKey } | { kind: "lines"; key: "lines" | "benefits" };

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

/** bare: 판 껍데기와 카드 탭 없이 그 카드 칸만(상품등록 상세의 카드문구 탭이 고른 상품의 카드 하나만 보인다) */
export function CopySection({ value, patch, tier, onTier, errors = {}, bare = false }: { value: PricingSettings; patch: Patch; tier: TierKey; onTier: (t: TierKey) => void; errors?: Record<string, string>; bare?: boolean }) {

  const setText = (t: TierKey, key: TextKey, display: string) => patch((d) => ({ ...d, copy: { ...d.copy, [t]: { ...d.copy[t], [key]: fromDisplayCopy(display) } } }));
  // 치는 동안은 빈 줄도 그대로 둔다(엔터 뒤 빈 줄이 바로 사라지면 다음 줄을 칠 수 없다). 저장할 때 걸러낸다(pricing-form 의 normalize)
  const setLines = (t: TierKey, key: "lines" | "benefits", display: string) =>
    patch((d) => ({ ...d, copy: { ...d.copy, [t]: { ...d.copy[t], [key]: fromDisplayCopy(display).split("\n") } } }));

  const field = (t: TierKey, f: Field) => {
    const id = `copy-${t}-${f.key}`;
    if (f.kind === "text") {
      const write = (display: string) => setText(t, f.key, display);
      return (
        <TokenMenu key={f.key} fieldId={id} write={write}>
          {(bind, trigger, menu) => (
            <TextField
              id={id}
              label={M.fields[f.key]}
              value={toDisplayCopy(value.copy[t][f.key])}
              onChange={(e) => write(e.target.value)}
              trailing={trigger}
              popup={menu}
              error={errors[`copy.${t}.${f.key}`]}
              labelSide
              compact
              {...bind}
            />
          )}
        </TokenMenu>
      );
    }
    const lines = f.key === "benefits" ? value.copy.membership.benefits : value.copy[t].lines;
    const write = (display: string) => setLines(t, f.key, display);
    // 줄 칸은 한 줄이라도 틀리면(길이 초과) 칸 아래에 말한다 — 경로가 "copy.single.lines.2" 처럼 줄 번호까지 붙는다
    const lineError = Object.entries(errors).find(([k]) => k.startsWith(`copy.${f.key === "benefits" ? "membership" : t}.${f.key}`))?.[1];
    return (
      <TokenMenu key={f.key} fieldId={id} write={write}>
        {(bind, trigger, menu) => (
          <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[var(--field-label-w,112px)_minmax(0,1fr)] sm:gap-x-3 sm:gap-y-1.5">
            <label htmlFor={id} className={cn(FIELD_LABEL_CLASS, "sm:pt-3")}>
              {M.fields[f.key]}
            </label>
            {/* 여러 줄 칸은 단추를 오른쪽 위 귀퉁이에 띄운다. 글이 단추 밑으로 들어가지 않게 오른쪽을 비운다 */}
            <div className="relative">
              <textarea
                id={id}
                rows={Math.max(2, lines.length + 1)}
                className={cn(TEXTAREA_CLASS, "pr-20")}
                value={toDisplayCopy(lines.join("\n"))}
                onChange={(e) => write(e.target.value)}
                {...bind}
              />
              <div className="absolute right-2 top-2">{trigger}</div>
              {menu}
            </div>
            {lineError && (
              <p role="alert" className="text-[12px] font-medium text-danger sm:col-start-2">
                {lineError}
              </p>
            )}
          </div>
        )}
      </TokenMenu>
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

  if (bare) return tierPanel(tier);

  return (
    <Panel title={M.copyTitle} lead={M.copyLead}>
      <DetailTabs
        label={M.copyTabs}
        active={tier}
        onChange={(k) => onTier(k as TierKey)}
        tabs={(Object.keys(TIER_LABELS) as TierKey[]).map((t) => ({ key: t, label: TIER_LABELS[t], panel: tierPanel(t) }))}
      />
    </Panel>
  );
}
