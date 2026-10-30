"use client";
// 전시관리 화면 본문(2026-10-30). 백오피스 등록 화면 꼴: 왼쪽 전시 목록 그리드, 오른쪽 고른 전시의 폼, 저장은 툴바(F9, Ctrl+S).
// 앞 판은 설명 문단 + 큰 라디오 카드 셋 + 슬라이더 + 저장 단추를 판 하나에 쌓았다. 지금 전시는 명예의 전당 1위 인트로 하나지만,
// 늘면 줄(site_settings 키 하나씩)을 더하면 되게 목록부터 세운다.
//
// 보여 주는 때는 고르기 칸, 머무는 시간은 슬라이더 그대로 — 0.1초 단위라 고르기 칸으로는 목록이 너무 길다.
// 값은 누르는 즉시 폼과 그리드에 그려지고 저장은 한 번에 보낸다(슬라이더를 끄는 동안 저장이 수십 번 나가면 안 된다).
// 실패하면 고친 값은 그대로 두고 상태줄에 사유를 남긴다 — 다시 저장하면 된다. 검증은 서버와 같은 스키마(lib/indie/fame-intro).
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFameIntroAction } from "@/app/(admin)/admin/effects/actions";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { CodeName, Field, FormSection, MasterDetail, ReadValue } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { FormSelect } from "@/components/ui/select/fields";
import { ADMIN_NAV, EFFECTS_MESSAGES as M } from "@/lib/admin/messages";
import { FAME_INTRO_HOLD_MAX_MS, FAME_INTRO_HOLD_MIN_MS, FAME_INTRO_HOLD_STEP_MS, FAME_INTRO_MODES, fameIntroSettingsSchema, type FameIntroMode, type FameIntroSettings } from "@/lib/indie/fame-intro";
import { ROUTES } from "@/lib/routes";

const MS_PER_SECOND = 1000;

type Row = { code: string; name: string; value: FameIntroSettings; changed: boolean };

const COLUMNS: GridCol<Row>[] = [
  { key: "name", label: M.colName, width: "minmax(160px,1fr)", value: (r) => r.name },
  { key: "mode", label: M.colMode, width: "112px", align: "center", value: (r) => M.modeLabels[r.value.mode] },
  { key: "hold", label: M.colHold, width: "88px", align: "right", value: (r) => r.value.holdMs, text: (r) => M.seconds(r.value.holdMs / MS_PER_SECOND) },
];

/** code: 전시코드 = site_settings 키. 서버(services/settings SETTING_KEYS)가 넘긴다 — 화면에 키 글자를 다시 적지 않는다 */
export function EffectsScreen({ code, initial }: { code: string; initial: FameIntroSettings }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [selected, setSelected] = useState<string | null>(code);
  const [pending, start] = useTransition();
  const dirty = value.mode !== saved.mode || value.holdMs !== saved.holdMs;
  const valid = fameIntroSettingsSchema.safeParse(value).success;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const save = () => {
    const next = value;
    start(async () => {
      const r = await saveFameIntroAction(next).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      setSaved(next);
      say(M.saved, "ok");
    });
  };

  const rows: Row[] = [{ code, name: M.fameIntroName, value, changed: dirty }];
  const current = rows.find((r) => r.code === selected) ?? null;

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.effects}
        count={rows.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          save,
          saveDisabled: !dirty || !valid,
          saving: pending,
          dirty,
        }}
      />
      <MasterDetail
        listWidth="440px"
        list={
          <DataGrid
            label={M.listLabel}
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.code}
            selected={selected}
            onSelect={setSelected}
            autoSelectFirst
            rowState={(r) => (r.changed ? "changed" : undefined)}
            empty={M.empty}
          />
        }
        detailTitle={current?.name}
        detailActions={
          <a href={ROUTES.hallOfFame} target="_blank" rel="noopener" className="text-[12.5px] font-semibold text-acc hover:underline">
            {M.preview}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        }
        detail={current && <FameIntroForm code={current.code} value={value} onChange={setValue} />}
      />
    </>
  );
}

function FameIntroForm({ code, value, onChange }: { code: string; value: FameIntroSettings; onChange: (v: FameIntroSettings) => void }) {
  const off = value.mode === "off";
  return (
    <FormSection title={M.sectionShow} labelWidth="96px">
      <Field label={M.fieldCodeName} wide>
        <CodeName code={code}>
          <ReadValue>{M.fameIntroName}</ReadValue>
        </CodeName>
      </Field>
      <Field label={M.fieldMode} required>
        <FormSelect
          name="fx-mode"
          label={M.fieldMode}
          hideLabel
          size="lg"
          value={value.mode}
          onChange={(v) => onChange({ ...value, mode: v as FameIntroMode })}
          options={FAME_INTRO_MODES.map((m) => ({ value: m, label: M.modeLabels[m] }))}
        />
      </Field>
      <Field label={M.fieldHold} htmlFor="fx-hold" required>
        <div className="flex min-h-10 items-center gap-3">
          <input
            id="fx-hold"
            type="range"
            min={FAME_INTRO_HOLD_MIN_MS}
            max={FAME_INTRO_HOLD_MAX_MS}
            step={FAME_INTRO_HOLD_STEP_MS}
            value={value.holdMs}
            disabled={off}
            onChange={(e) => onChange({ ...value, holdMs: Number(e.target.value) })}
            className="h-[var(--touch-target)] min-w-0 flex-1 accent-[var(--acc)] disabled:opacity-50 [@media(pointer:fine)]:h-10"
          />
          <span className="w-12 text-right text-[14px] font-bold tabular-nums text-ink" aria-live="polite">
            {M.seconds(value.holdMs / MS_PER_SECOND)}
          </span>
        </div>
      </Field>
    </FormSection>
  );
}
