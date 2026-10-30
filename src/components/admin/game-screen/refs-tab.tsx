"use client";
// 게임 고치기의 "스토어 연결" 탭(2026-10-30). 위 그리드(체크 칸 + 처리 띠의 승인/반려), 아래 수동 연결 묶음.
// 앞 판은 줄마다 승인/반려 단추였다 — 스토어매칭승인관리와 같은 처리 띠(screen/approval)로 맞춘다. 판정은 판정 대기 줄에만 서고,
// 대기 줄이 하나도 없으면 체크 칸과 띠를 걷는다.
// 수동 연결은 같은 스토어 줄이 있으면 덮어쓴다(services/admin setManualRef). 저장하면 서버가 목록을 다시 준다.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveMatchAction, rejectMatchAction, setManualRefAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_ACTION_MESSAGES as A, GAME_ADMIN_MESSAGES as M, MATCHED_BY_LABEL } from "@/lib/admin/messages";
import { sourceLabel } from "@/lib/source-label";
import type { RefRow } from "./types";

const MATCH_TONE: Record<string, TagTone> = { pending: "info", manual: "ok", auto: "neutral", none: "outline" };
const isPending = (r: RefRow) => r.matchedBy === "pending";

const DECISIONS: ApprovalDecision<RefRow>[] = [
  { value: "approve", label: M.approve, can: isPending },
  { value: "reject", label: M.reject, danger: true, can: isPending },
];

const COLUMNS: GridCol<RefRow>[] = [
  { key: "source", label: M.colSource, width: "104px", value: (r) => r.sourceLabel },
  { key: "externalId", label: M.colExternalId, width: "minmax(120px,1fr)", value: (r) => r.externalId },
  {
    key: "url",
    label: M.colUrl,
    width: "minmax(160px,1.4fr)",
    value: (r) => r.url ?? "",
    render: (r) =>
      r.url ? (
        <a href={r.url} target="_blank" rel="noreferrer" className="truncate text-acc hover:underline" onClick={(e) => e.stopPropagation()}>
          {r.url}
          <span className="sr-only"> (새 창에서 열림)</span>
        </a>
      ) : (
        "-"
      ),
  },
  {
    key: "matchedBy",
    label: M.colMatchedBy,
    width: "100px",
    align: "center",
    value: (r) => MATCHED_BY_LABEL[r.matchedBy] ?? r.matchedBy,
    render: (r) => <Tag tone={MATCH_TONE[r.matchedBy] ?? "neutral"}>{MATCHED_BY_LABEL[r.matchedBy] ?? r.matchedBy}</Tag>,
  },
  { key: "confidence", label: M.colConfidence, width: "80px", align: "right", value: (r) => (r.confidence === null ? -1 : Number(r.confidence)), text: (r) => r.confidence ?? "-" },
];

export function RefsTab({ gameId, refs, sources }: { gameId: string; refs: RefRow[]; sources: readonly string[] }) {
  // 처음엔 판정 대기 줄을 고른다 — 첫 줄이 이미 이어진 스토어면 처리 띠에 고를 판정이 없다
  const [selected, setSelected] = useState<string | null>(refs.find(isPending)?.source ?? null);
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows: refs,
    rowKey: (r) => r.source,
    run: async (r, decision) => {
      const res = decision === "approve" ? await approveMatchAction(gameId, r.source) : await rejectMatchAction(gameId, r.source);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = refs.find((r) => r.source === selected) ?? null;
  // 판정 대기 줄이 없으면 체크 칸과 처리 띠를 세우지 않는다 — 고를 처리가 없는 빈 띠만 남는다
  const reviewable = refs.some(isPending);
  const targets = checked.size > 0 ? refs.filter((r) => checked.has(r.source)) : current ? [current] : [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <DataGrid
          label={M.refsListLabel}
          columns={COLUMNS}
          rows={refs}
          rowKey={(r) => r.source}
          selected={selected}
          onSelect={setSelected}
          autoSelectFirst
          checked={reviewable ? checked : undefined}
          onChecked={reviewable ? setChecked : undefined}
          rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
          empty={M.refsEmpty}
        />
        {reviewable && <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />}
      </div>
      <ManualRefForm gameId={gameId} sources={sources} />
    </>
  );
}

function ManualRefForm({ gameId, sources }: { gameId: string; sources: readonly string[] }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [source, setSource] = useState(sources[0] ?? "");
  const [externalId, setExternalId] = useState("");
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("gameId", gameId);
      fd.set("source", source);
      fd.set("externalId", externalId.trim());
      fd.set("url", url.trim());
      const r = await setManualRefAction(null, fd).catch(() => null);
      if (!r || !r.ok) return say(r && !r.ok ? r.error : A.failed, "error");
      say(r.message ?? "", "ok");
      setExternalId("");
      setUrl("");
      router.refresh();
    });

  return (
    <FormSection
      title={M.sectionManualRef}
      labelWidth="96px"
      action={
        <Button size="sm" onClick={submit} loading={pending} disabled={!externalId.trim()}>
          {M.saveRef}
        </Button>
      }
    >
      <Field label={M.fieldSource} required>
        <FormSelect name="gr-source" label={M.fieldSource} hideLabel size="lg" value={source} onChange={setSource} options={sources.map((s) => ({ value: s, label: sourceLabel(s) }))} />
      </Field>
      <Field label={M.fieldExternalId} htmlFor="gr-external" required>
        <TextField id="gr-external" label={M.fieldExternalId} hideLabel value={externalId} onChange={(e) => setExternalId(e.target.value)} compact />
      </Field>
      <Field label={M.fieldUrl} htmlFor="gr-url" wide>
        <TextField id="gr-url" label={M.fieldUrl} hideLabel type="url" value={url} onChange={(e) => setUrl(e.target.value)} compact />
      </Field>
    </FormSection>
  );
}
