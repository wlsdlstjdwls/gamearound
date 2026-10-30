"use client";
// 데이터오류관리 화면 본문(2026-10-30). 백오피스 승인 화면 꼴:
// 위 조회조건(구분, 규칙, 게임명), 왼쪽 오류 그리드(체크 칸) + 아래 일괄 처리 띠, 오른쪽 고른 줄의 상세(찾은 문제, 게임).
// 앞 판은 줄마다 단추 둘을 단 글 목록이었고, 자동 고침 기록은 그 밑에 따로 흘렀다.
//
// 자동 고침 기록은 구분 "자동 고침" 으로 같은 그리드에 싣는다 — 기계가 틀리게 고쳤을 때 알아챌 자리가 여기뿐이다.
// 그 줄은 이미 끝난 일이라 체크 칸과 처리 띠를 세우지 않는다. 틀린 고침은 게임 관리 화면에서 되돌린다.
// 두 묶음을 서버가 한 번에 주므로(admin-data-issues) 구분은 주소로 보내지 않고 화면 안에서 가른다.
import { useState } from "react";
import { decideDataIssueAction } from "@/app/(admin)/admin/data-issues/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM, QUALITY_MESSAGES as M, QUALITY_RULE_LABEL , GAME_ADMIN_MESSAGES } from "@/lib/admin/messages";
import { formatDate, formatDotDate } from "@/lib/format";
import { adminGamePath, gamePath } from "@/lib/routes";
import type { DataIssueRow } from "@/server/services/admin-data-issues";

type View = "open" | "auto";

// 고칠 안이 없는 줄(스토어 확인)은 "확인" 하나뿐이다. 서버에는 반려와 같은 넘기기로 간다
const DECISIONS: ApprovalDecision<DataIssueRow>[] = [
  { value: "apply", label: M.apply, can: (r) => r.fixable },
  { value: "dismiss", label: M.dismiss, danger: true, can: (r) => r.fixable },
  { value: "seen", label: M.seen, can: (r) => !r.fixable },
];

const ruleLabel = (r: DataIssueRow) => QUALITY_RULE_LABEL[r.rule] ?? r.rule;

function verdictText(r: DataIssueRow, view: View) {
  if (view === "auto") return M.verdictAuto;
  return r.fixable ? M.verdictCandidate : M.verdictNotify;
}

export function DataIssuesScreen({ open, recentAuto }: { open: DataIssueRow[]; recentAuto: DataIssueRow[] }) {
  const [view, setView] = useState<View>("open");
  const [rule, setRule] = useState("all");
  const [game, setGame] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = view === "open" ? open : recentAuto;
  const q = game.trim().toLowerCase();
  const shown = rows.filter((r) => (rule === "all" || r.rule === rule) && (!q || (r.game?.title.toLowerCase().includes(q) ?? false)));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows: open,
    rowKey: (r) => r.id,
    run: (r, decision) => decideDataIssueAction(r.id, decision === "apply" ? "apply" : "dismiss"),
  });
  const current = rows.find((r) => r.id === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.id)) : current && view === "open" ? [current] : [];
  const rules = [...new Set(rows.map((r) => r.rule))];

  const columns: GridCol<DataIssueRow>[] = [
    {
      key: "verdict",
      label: M.colVerdict,
      width: "96px",
      align: "center",
      value: (r) => verdictText(r, view),
      render: (r) => {
        const done = view === "open" ? doneOf(r) : undefined;
        if (done) return <Tag tone="ok">{done}</Tag>;
        return <Tag tone={view === "auto" ? "outline" : r.fixable ? "info" : "warn"}>{verdictText(r, view)}</Tag>;
      },
    },
    { key: "rule", label: M.colRule, width: "minmax(180px,1.3fr)", value: ruleLabel },
    { key: "game", label: M.colGame, width: "minmax(120px,1fr)", value: (r) => r.game?.title ?? "", render: (r) => r.game?.title ?? <span className="text-dim-2">{M.noGame}</span> },
    { key: "at", label: M.colCreatedAt, width: "104px", align: "center", value: (r) => r.createdAt, text: (r) => formatDotDate(r.createdAt) },
  ];

  const changeView = (v: string) => {
    setView(v as View);
    setRule("all");
    setSelected(null);
    setChecked(new Set());
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchView}>
          <FormSelect
            name="q-view"
            label={M.searchView}
            hideLabel
            size="md"
            value={view}
            onChange={changeView}
            options={[
              { value: "open", label: `${M.viewOpen} ${open.length}` },
              { value: "auto", label: M.recentAuto },
            ]}
          />
        </SearchItem>
        <SearchItem label={M.searchRule}>
          <FormSelect name="q-rule" label={M.searchRule} hideLabel size="md" value={rule} onChange={setRule} options={[{ value: "all", label: M.searchAll }, ...rules.map((k) => ({ value: k, label: QUALITY_RULE_LABEL[k] ?? k }))]} />
        </SearchItem>
        <SearchItem label={M.searchGame} htmlFor="q-game">
          <TextField id="q-game" label={M.searchGame} hideLabel value={game} onChange={(e) => setGame(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <MasterDetail
        listWidth="560px"
        list={
          <div className="flex flex-col gap-2">
            <DataGrid
              key={view}
              label={M.listLabel}
              columns={columns}
              rows={shown}
              rowKey={(r) => r.id}
              selected={selected}
              onSelect={setSelected}
              autoSelectFirst
              {...(view === "open" ? { checked, onChecked: setChecked, rowTone: (r: DataIssueRow) => (doneOf(r) ? ("muted" as const) : undefined) } : {})}
              pageSize={50}
              empty={view === "open" ? M.empty : M.recentAutoEmpty}
              fit
            />
            {view === "open" && <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />}
          </div>
        }
        detailTitle={current ? ruleLabel(current) : M.detailTitle}
        detail={current ? <Detail key={current.id} r={current} view={view} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
      />
    </div>
  );
}

function Detail({ r, view }: { r: DataIssueRow; view: View }) {
  return (
    <>
      <FormSection title={M.sectionIssue}>
        <Field label={M.colRule} wide>
          <ReadValue>{ruleLabel(r)}</ReadValue>
        </Field>
        <Field label={M.colVerdict} hint={view === "open" && !r.fixable ? M.noFixHint : undefined}>
          <ReadValue>{verdictText(r, view)}</ReadValue>
        </Field>
        <Field label={M.colCreatedAt}>
          <ReadValue>{formatDate(r.createdAt)}</ReadValue>
        </Field>
        <Field label={M.fieldReason} wide>
          <ReadValue>
            <span className="whitespace-pre-line break-words">{r.reason}</span>
          </ReadValue>
        </Field>
      </FormSection>
      {r.game && (
        <FormSection
          title={M.sectionGame}
          action={
            <span className="flex items-center gap-3">
              <a href={gamePath(r.game.slug)} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acc hover:underline">
                {M.openGame}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
              <ProgramLink href={adminGamePath(r.game.id)}>{GAME_ADMIN_MESSAGES.title}</ProgramLink>
            </span>
          }
        >
          <Field label={M.colGame} wide>
            <ReadValue>{r.game.title}</ReadValue>
          </Field>
        </FormSection>
      )}
    </>
  );
}
