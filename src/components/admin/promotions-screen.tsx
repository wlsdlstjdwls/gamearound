"use client";
// 광고노출관리 화면 본문(2026-10-30). 백오피스 조회 화면 꼴: 위 조회조건(자리, 상태, 출처, 대상명), 왼쪽 그리드, 오른쪽 고른 광고의 상세.
// 앞 판은 숫자 칸 넷 + 자리마다 카드 묶음 + 접힌 "끝난 광고" + 맨 아래 걸기 폼이라, 광고가 늘면 한 화면에 훑을 수 없었다.
// 자리가 몇 칸 찼는지는 머리 옆 한 줄로 줄였다(숫자 칸, 막대는 걷었다) — 성과 합계는 그리드 합계 줄이 조회 범위대로 보인다.
// 그리드 칸은 상세와 나란히 서도록 줄였다: 출처는 조회조건과 상세로, 클릭률은 상세로 뺐다.
// 회수는 승인 화면과 같은 체크 칸 + 처리 띠(screen/approval) — 여러 장을 한 번에 거둘 수 있고, 누르면 그 줄이 먼저 "회수" 로 바뀐다.
// 직접 걸기는 툴바 "입력" 으로 상세 자리에 폼을 연다. 저장(F9, Ctrl+S)이 곧 걸기다. 산 광고는 저절로 걸리니 시범, 보상 때만 쓴다.
// 서버가 열린 광고 전부와 최근 끝난 몇 줄을 한 번에 주므로(services/promotions listBoostsForAdmin) 조회조건은 화면 안에서 거른다.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantBoostAction, revokeBoostAction } from "@/app/(admin)/admin/promotions/actions";
import { reportDirty } from "@/components/admin/program-shell/store";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { BoostStateTag } from "@/components/promo/boost-state-tag";
import { askChoice } from "@/components/ui/confirm-dialog";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, APPROVAL_MESSAGES as AM, PROMO_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { formatDotDate, formatShortDateTime } from "@/lib/format";
import { BOOST_DAY_OPTIONS, PROMO_SLOTS, SLOT_CAPACITY, type BoostState } from "@/lib/promo/boost";
import { BOOST_STATE_LABEL, PROMO_MESSAGES as PM, PROMO_SLOT_LABEL, PROMO_SOURCE_LABEL } from "@/lib/promo/messages";
import { BOOST_NOTE_MAX } from "@/lib/promo/schemas";
import type { PromoSlot, PromoSource } from "@/server/db/schema";
import type { BoostCandidate, BoostRowDto } from "@/server/services/promotions";

type Draft = { slot: PromoSlot; targetId: string; days: string; note: string };

const ALL = "all";
const OPEN = "open";
const STATES = Object.keys(BOOST_STATE_LABEL) as BoostState[];
const SOURCES = Object.keys(PROMO_SOURCE_LABEL) as PromoSource[];

const isOpen = (r: BoostRowDto) => r.state === "active" || r.state === "queued";
const ctrOf = (views: number, clicks: number) => (views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : "-");
const newDraft = (): Draft => ({ slot: PROMO_SLOTS[0], targetId: "", days: String(BOOST_DAY_OPTIONS[0]), note: "" });

const DECISIONS: ApprovalDecision<BoostRowDto>[] = [{ value: "revoke", label: M.revoke, danger: true, can: isOpen }];

const COLUMNS: GridCol<BoostRowDto>[] = [
  { key: "state", label: M.colState, width: "76px", align: "center", value: (r) => BOOST_STATE_LABEL[r.state], render: (r) => <BoostStateTag state={r.state} /> },
  { key: "slot", label: M.colSlot, width: "104px", value: (r) => PROMO_SLOT_LABEL[r.slot] },
  { key: "target", label: M.colTarget, width: "minmax(140px,1fr)", value: (r) => r.targetTitle },
  { key: "period", label: M.colPeriod, width: "172px", align: "center", value: (r) => r.startsAt.getTime(), text: (r) => PM.period(formatDotDate(r.startsAt), formatDotDate(r.endsAt)) },
  { key: "views", label: M.colViews, width: "72px", align: "right", value: (r) => r.views, sum: true },
  { key: "clicks", label: M.colClicks, width: "64px", align: "right", value: (r) => r.clicks, sum: true },
];

export function PromotionsScreen({ rows, candidates }: { rows: BoostRowDto[]; candidates: Record<PromoSlot, BoostCandidate[]> }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [slot, setSlot] = useState(ALL);
  const [state, setState] = useState(OPEN);
  const [source, setSource] = useState(ALL);
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.id,
    run: (r) => revokeBoostAction(r.id),
  });

  const dirty = Boolean(draft && (draft.targetId || draft.note.trim()));
  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const q = target.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (slot === ALL || r.slot === slot) &&
      (state === ALL || (state === OPEN ? isOpen(r) : r.state === state)) &&
      (source === ALL || r.source === source) &&
      (!q || r.targetTitle.toLowerCase().includes(q)),
  );
  const current = draft ? null : (rows.find((r) => r.id === selected) ?? null);
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.id)) : current ? [current] : [];

  const grant = (then?: () => void) => {
    if (!draft) return;
    if (!draft.targetId) return setError(M.targetRequired);
    startSaving(async () => {
      setError(null);
      const r = await grantBoostAction({ slot: draft.slot, targetId: draft.targetId, days: Number(draft.days), note: draft.note }).catch(() => ({ ok: false as const, error: PM.failed }));
      if (!r.ok) {
        setError(r.error);
        return say(r.error, "error");
      }
      setDraft(null);
      say(M.granted, "ok");
      router.refresh();
      then?.();
    });
  };

  // 직접 걸기에 고른 값이 있으면 다른 줄로 옮기기 전에 묻는다(편집 화면 공통, 2026-10-30): 걸고 옮김, 버리고 옮김, 머묾
  const select = async (key: string) => {
    if (!draft) return setSelected(key);
    if (dirty) {
      const c = await askChoice(M.leaveConfirm, { title: M.leaveTitle, confirmLabel: M.leaveSave, altLabel: M.leaveDiscard });
      if (c === "cancel") return;
      if (c === "confirm") return grant(() => setSelected(key));
    }
    setDraft(null);
    setError(null);
    setSelected(key);
  };

  const note = PROMO_SLOTS.map((s) => M.capacity(PROMO_SLOT_LABEL[s], rows.filter((r) => r.slot === s && r.state === "active" && r.targetLive).length, SLOT_CAPACITY[s])).join(" | ");

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.promotions}
        count={shown.length}
        note={note}
        tools={{
          retrieve: () => {
            setDraft(null);
            setError(null);
            router.refresh();
          },
          insert: () => {
            setDraft(newDraft());
            setError(null);
          },
          delete: draft ? () => (setDraft(null), setError(null)) : undefined,
          save: draft ? () => grant() : undefined,
          saveDisabled: !draft || !draft.targetId,
          saving,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchSlot}>
            <FormSelect name="p-slot" label={M.searchSlot} hideLabel size="md" value={slot} onChange={setSlot} options={[{ value: ALL, label: M.all }, ...PROMO_SLOTS.map((s) => ({ value: s, label: PROMO_SLOT_LABEL[s] }))]} />
          </SearchItem>
          <SearchItem label={M.searchState}>
            <FormSelect
              name="p-state"
              label={M.searchState}
              hideLabel
              size="md"
              value={state}
              onChange={setState}
              options={[{ value: OPEN, label: M.stateOpen }, { value: ALL, label: M.all }, ...STATES.map((s) => ({ value: s, label: BOOST_STATE_LABEL[s] }))]}
            />
          </SearchItem>
          <SearchItem label={M.searchSource}>
            <FormSelect name="p-source" label={M.searchSource} hideLabel size="md" value={source} onChange={setSource} options={[{ value: ALL, label: M.all }, ...SOURCES.map((s) => ({ value: s, label: PROMO_SOURCE_LABEL[s] }))]} />
          </SearchItem>
          <SearchItem label={M.searchTarget} htmlFor="p-target">
            <TextField id="p-target" label={M.searchTarget} hideLabel value={target} onChange={(e) => setTarget(e.target.value)} compact />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="720px"
          list={
            <div className="flex flex-col gap-2">
              <DataGrid
                label={M.listLabel}
                columns={COLUMNS}
                rows={shown}
                rowKey={(r) => r.id}
                selected={draft ? null : selected}
                onSelect={select}
                autoSelectFirst={!draft}
                checked={checked}
                onChecked={setChecked}
                rowTone={(r) => (doneOf(r) || !isOpen(r) ? "muted" : undefined)}
                pageSize={50}
                empty={M.empty}
                fit
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
            </div>
          }
          detailTitle={draft ? M.newTitle : (current?.targetTitle ?? M.detailTitle)}
          detailActions={
            current?.targetHref ? (
              <a href={current.targetHref} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acc hover:underline">
                {M.openTarget}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : undefined
          }
          detail={
            draft ? (
              <DraftForm draft={draft} candidates={candidates} error={error} onChange={(d) => (setDraft(d), setError(null))} />
            ) : current ? (
              <BoostDetail key={current.id} r={current} done={doneOf(current)} />
            ) : (
              <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>
            )
          }
        />
      </div>
    </>
  );
}

function DraftForm({ draft, candidates, error, onChange }: { draft: Draft; candidates: Record<PromoSlot, BoostCandidate[]>; error: string | null; onChange: (d: Draft) => void }) {
  const list = candidates[draft.slot];
  return (
    <FormSection title={M.sectionBoost}>
      <Field label={M.fieldSlot} required>
        <FormSelect
          name="g-slot"
          label={M.fieldSlot}
          hideLabel
          size="lg"
          value={draft.slot}
          onChange={(v) => onChange({ ...draft, slot: v as PromoSlot, targetId: "" })}
          options={PROMO_SLOTS.map((s) => ({ value: s, label: PROMO_SLOT_LABEL[s] }))}
        />
      </Field>
      <Field label={M.fieldDays} required>
        <FormSelect name="g-days" label={M.fieldDays} hideLabel size="lg" value={draft.days} onChange={(v) => onChange({ ...draft, days: v })} options={BOOST_DAY_OPTIONS.map((d) => ({ value: String(d), label: M.daysOption(d) }))} />
      </Field>
      <Field label={M.fieldTarget} required wide error={error ?? undefined}>
        <FormSelect
          name="g-target"
          label={M.fieldTarget}
          hideLabel
          size="lg"
          value={draft.targetId}
          onChange={(v) => onChange({ ...draft, targetId: v })}
          disabled={list.length === 0}
          options={[{ value: "", label: list.length ? M.targetPlaceholder : M.noCandidates }, ...list.map((c) => ({ value: c.id, label: c.title }))]}
        />
      </Field>
      <Field label={M.fieldNote} htmlFor="g-note" wide>
        <TextField id="g-note" label={M.fieldNote} hideLabel placeholder={M.notePlaceholder} value={draft.note} maxLength={BOOST_NOTE_MAX} onChange={(e) => onChange({ ...draft, note: e.target.value })} compact />
      </Field>
    </FormSection>
  );
}

function BoostDetail({ r, done }: { r: BoostRowDto; done?: string }) {
  const left = !isOpen(r) ? M.closed : r.state === "queued" ? M.startsLater : M.daysLeft(r.daysLeft);
  return (
    <>
      <FormSection title={M.sectionBoost}>
        <Field label={M.fieldState} error={r.state === "active" && !r.targetLive ? M.notLive : undefined}>
          <ReadValue>{done ? <Tag tone="neutral">{done}</Tag> : <BoostStateTag state={r.state} />}</ReadValue>
        </Field>
        <Field label={M.fieldSource}>
          <ReadValue>{PROMO_SOURCE_LABEL[r.source]}</ReadValue>
        </Field>
        <Field label={M.fieldTarget} wide>
          <ReadValue>
            <span className="truncate">{r.targetTitle}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldSlot}>
          <ReadValue>{PROMO_SLOT_LABEL[r.slot]}</ReadValue>
        </Field>
        <Field label={M.fieldLeft}>
          <ReadValue>{left}</ReadValue>
        </Field>
        <Field label={M.fieldPeriod} wide>
          <ReadValue>{PM.period(formatShortDateTime(r.startsAt), formatShortDateTime(r.endsAt))}</ReadValue>
        </Field>
        <Field label={M.fieldNote} wide>
          <ReadValue>
            <span className="break-words">{r.note || M.noNote}</span>
          </ReadValue>
        </Field>
      </FormSection>
      <FormSection title={M.sectionPerformance}>
        {r.state === "queued" ? (
          <Field label={M.fieldViews} wide>
            <ReadValue>{M.queuedPerformance}</ReadValue>
          </Field>
        ) : (
          <>
            <Field label={M.fieldViews}>
              <ReadValue align="right">{r.views.toLocaleString("ko-KR")}</ReadValue>
            </Field>
            <Field label={M.fieldClicks}>
              <ReadValue align="right">{r.clicks.toLocaleString("ko-KR")}</ReadValue>
            </Field>
            <Field label={M.fieldCtr}>
              <ReadValue align="right">{ctrOf(r.views, r.clicks)}</ReadValue>
            </Field>
          </>
        )}
      </FormSection>
    </>
  );
}
