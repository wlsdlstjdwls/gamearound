"use client";
// 스토어매칭승인관리 화면 본문(2026-10-30). 백오피스 상품그룹핑승인관리 꼴:
// 위 조회조건(스토어, 게임명), 왼쪽 매칭 대기 그리드(체크 칸) + 아래 일괄 처리 띠, 오른쪽 고른 줄의 상세(우리 게임, 스토어 후보).
// 앞 판은 줄마다 승인/반려 단추였다 — 닮은 정도가 높은 줄을 몰아 승인하려면 한 건씩 눌러야 했다.
// 반려는 사유를 받지 않는다 — 서버가 남기는 것은 "이 스토어엔 없다"(none) 하나라 적어도 쓸 곳이 없다.
import Link from "next/link";
import { useState } from "react";
import { approveMatchAction, rejectMatchAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM, MATCH_MESSAGES as M } from "@/lib/admin/messages";
import { adminGamePath } from "@/lib/routes";

/** 서버 화면이 넘기는 줄. 열쇠는 (게임, 스토어) — 한 게임이 여러 스토어 후보를 가질 수 있다 */
export type MatchRow = {
  key: string;
  gameId: string;
  title: string;
  titleEn: string;
  storeTitle: string | null;
  source: string;
  sourceLabel: string;
  externalId: string;
  url: string | null;
  confidence: number | null;
};

const DECISIONS: ApprovalDecision<MatchRow>[] = [
  { value: "approve", label: M.approve },
  { value: "reject", label: M.reject, danger: true },
];

function withDone(done: string | undefined, node: React.ReactNode) {
  return done ? <Tag tone="ok">{done}</Tag> : node;
}

export function MatchesScreen({ rows }: { rows: MatchRow[] }) {
  const [source, setSource] = useState("all");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = title.trim().toLowerCase();
  const shown = rows.filter((r) => (source === "all" || r.source === source) && (!q || r.title.toLowerCase().includes(q) || r.titleEn.toLowerCase().includes(q)));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.key,
    run: async (r, decision) => {
      const res = await (decision === "approve" ? approveMatchAction(r.gameId, r.source) : rejectMatchAction(r.gameId, r.source));
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = rows.find((r) => r.key === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.key)) : current ? [current] : [];
  const sources = [...new Map(rows.map((r) => [r.source, r.sourceLabel])).entries()];

  const columns: GridCol<MatchRow>[] = [
    { key: "conf", label: M.colConfidence, width: "72px", align: "right", value: (r) => r.confidence, text: (r) => (r.confidence === null ? "-" : r.confidence.toFixed(2)), render: (r) => withDone(doneOf(r), r.confidence === null ? "-" : r.confidence.toFixed(2)) },
    { key: "title", label: M.colOurTitle, width: "minmax(140px,1fr)", value: (r) => r.title },
    { key: "store", label: M.colStoreTitle, width: "minmax(140px,1fr)", value: (r) => r.storeTitle ?? "", render: (r) => r.storeTitle ?? <span className="text-dim-2">{M.noStoreTitle}</span> },
    { key: "source", label: M.colSource, width: "96px", align: "center", value: (r) => r.sourceLabel },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchSource}>
          <FormSelect name="m-source" label={M.searchSource} hideLabel size="md" value={source} onChange={setSource} options={[{ value: "all", label: M.searchAll }, ...sources.map(([value, label]) => ({ value, label }))]} />
        </SearchItem>
        <SearchItem label={M.searchTitle} htmlFor="m-title">
          <TextField id="m-title" label={M.searchTitle} hideLabel value={title} onChange={(e) => setTitle(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <MasterDetail
        listWidth="560px"
        list={
          <div className="flex flex-col gap-2">
            <DataGrid
              label={M.listLabel}
              columns={columns}
              rows={shown}
              rowKey={(r) => r.key}
              selected={selected}
              onSelect={setSelected}
              autoSelectFirst
              checked={checked}
              onChecked={setChecked}
              rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
              pageSize={50}
              empty={M.empty}
              maxHeight="calc(100svh - var(--header-h) - 330px)"
            />
            <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
          </div>
        }
        detailTitle={current ? current.title : M.detailTitle}
        detail={current ? <Detail key={current.key} r={current} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
      />
    </div>
  );
}

function Detail({ r }: { r: MatchRow }) {
  return (
    <>
      <FormSection
        title={M.sectionGame}
        action={
          <Link href={adminGamePath(r.gameId)} className="text-[12.5px] font-semibold text-acc hover:underline">
            {M.openGame}
          </Link>
        }
      >
        <Field label={M.fieldGame}>
          <ReadValue>{r.title}</ReadValue>
        </Field>
        <Field label={M.fieldGameEn}>
          <ReadValue>{r.titleEn}</ReadValue>
        </Field>
      </FormSection>
      {/* 매칭한 순간의 제목이다. 여기가 다른 게임 이름이면 그대로 반려하면 된다 */}
      <FormSection
        title={M.sectionStore}
        action={
          r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acc hover:underline">
              {M.open}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          ) : undefined
        }
      >
        <Field label={M.colStoreTitle} wide>
          <ReadValue>{r.storeTitle ?? M.noStoreTitle}</ReadValue>
        </Field>
        <Field label={M.colSource}>
          <ReadValue>{r.sourceLabel}</ReadValue>
        </Field>
        <Field label={M.colConfidence}>
          <ReadValue align="right">{r.confidence === null ? "-" : r.confidence.toFixed(2)}</ReadValue>
        </Field>
        <Field label={M.colExternal} wide>
          <ReadValue>
            <span className="break-all font-mono text-[12.5px]">{r.externalId}</span>
          </ReadValue>
        </Field>
      </FormSection>
    </>
  );
}
