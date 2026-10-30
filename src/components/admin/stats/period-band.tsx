"use client";
// 통계 화면 조회조건 띠(2026-10-30) — 매출현황, 이용현황이 같이 쓴다. 기간 칸 둘 + 빠른 선택.
// 칸을 고친 뒤 툴바 조회(F8)를 눌러야 다시 읽는다. 빠른 선택만은 고르는 즉시 조회한다 — 그 칸을 고르는 이유가 바로 보려는 것이다.
// 기간은 주소(?from=&to=)에 싣는다. 서버가 같은 규칙(lib/stats/period 의 resolvePeriod)으로 읽고 상한을 자른다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldPair, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select/fields";
import { STATS_MESSAGES as M } from "@/lib/admin/messages";
import { PERIOD_PRESETS, presetPeriod, type Period, type PeriodPreset } from "@/lib/stats/period";

const NONE = "";

export function usePeriodBand(basePath: string, initial: Period) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const go = (next: Period) => router.push(`${basePath}?${new URLSearchParams({ from: next.from, to: next.to })}`, { scroll: false });
  const preset = PERIOD_PRESETS.find((k) => {
    const q = presetPeriod(k);
    return q.from === p.from && q.to === p.to;
  });
  const band = (
    <SearchBand label={M.search}>
      <SearchItem label={M.period} auto>
        <div className="w-full sm:w-[380px]">
          <FieldPair
            from={<DateField label={M.period} hideLabel value={p.from} max={p.to} clearable={false} onChange={(v) => v && setP((x) => ({ ...x, from: v }))} />}
            to={<DateField label={M.period} hideLabel value={p.to} min={p.from} clearable={false} onChange={(v) => v && setP((x) => ({ ...x, to: v }))} />}
          />
        </div>
      </SearchItem>
      <SearchItem label={M.preset}>
        <FormSelect
          name="stats-preset"
          label={M.preset}
          hideLabel
          size="md"
          value={preset ?? NONE}
          onChange={(v) => {
            if (!v) return;
            const next = presetPeriod(v as PeriodPreset);
            setP(next);
            go(next);
          }}
          options={[{ value: NONE, label: M.presetNone }, ...PERIOD_PRESETS.map((k) => ({ value: k, label: M.presets[k] }))]}
        />
      </SearchItem>
    </SearchBand>
  );
  return { band, retrieve: () => go(p) };
}
