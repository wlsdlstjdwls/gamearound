"use client";
// 회사정보관리 화면 본문(2026-10-31). 백오피스 조회 화면 꼴:
// 위 조회조건(구분, 회사명), 왼쪽 그리드, 오른쪽 고른 줄의 상세. 앞 판은 옛 data-rows 목록 두 개(확정 대기 이름 + 아는 회사 60곳)를 위아래로 쌓았다.
//
// 구분 "확정 대기" 는 수집이 위키데이터로 못 붙인 이름 문자열이다. 체크 칸 + 처리 띠의 "다시 조회" 로 여러 이름을 몰아 다시 묻는다 —
// 위키데이터는 계속 자라서 어제 없던 회사가 오늘 생겨 있다. 붙으면 서버가 다시 준 목록에서 빠진다.
// 조회 결과(못 붙인 사유)가 이 구분의 알맹이라 줄마다 붙들어 두고 그리드와 상세에 같이 보인다 — 상태줄 한 번으로 흘려보내지 않는다.
// 구분 "등록된 회사" 는 붙은 회사를 보는 자리다. 고칠 칸이 없어(값은 위키데이터가 준다) 체크 칸, 처리 띠를 세우지 않는다.
// 두 묶음을 서버가 한 번에 주므로 구분은 주소로 보내지 않고 화면 안에서 가른다(data-issues-screen 과 같다).
import { useState } from "react";
import { resolveCompanyAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { CodeName, Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM, COMPANY_MESSAGES as M } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { companyPath } from "@/lib/routes";
import type { AdminCompanyRow, PendingCompany } from "@/server/services/admin-companies";

type View = "pending" | "known";
type Outcome = keyof typeof M.outcomeShort;

/** 위키데이터 항목 주소. Q 번호만 저장한다 */
const WIKIDATA_ENTITY = "https://www.wikidata.org/wiki/";
const EXTERNAL = "text-[12.5px] font-semibold text-acc hover:underline";

// 판정 배지는 옅게 — 경고가 아니라 "아직 못 붙였다" 는 상태다(누런색 금지, 10-27)
const OUTCOME_TONE: Record<Outcome, TagTone> = { not_found: "neutral", ambiguous: "plum", none: "outline" };

const DECISIONS: ApprovalDecision<PendingCompany>[] = [{ value: "resolve", label: M.resolve, skipConfirm: true }];

const outcomeOf = (r: PendingCompany): Outcome => r.outcome ?? "none";

export function CompaniesScreen({ pending, known }: { pending: PendingCompany[]; known: AdminCompanyRow[] }) {
  const [view, setView] = useState<View>("pending");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // 방금 다시 조회한 결과(성공이면 붙은 회사, 실패면 사유). 이름이 열쇠다
  const [results, setResults] = useState<Map<string, { ok: boolean; text: string }>>(new Map());
  const q = name.trim().toLowerCase();
  const pendingShown = pending.filter((r) => !q || r.name.toLowerCase().includes(q));
  const knownShown = known.filter((r) => !q || r.name.toLowerCase().includes(q) || r.nameEn.toLowerCase().includes(q));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows: pending,
    rowKey: (r) => r.name,
    run: async (r) => {
      const res = await resolveCompanyAction(r.name);
      const ok = Boolean(res?.ok);
      const text = res ? (res.ok ? (res.message ?? "") : res.error) : "";
      setResults((m) => new Map(m).set(r.name, { ok, text }));
      return res && !res.ok ? res : { ok: true };
    },
  });

  const currentPending = view === "pending" ? (pending.find((r) => r.name === selected) ?? null) : null;
  const currentKnown = view === "known" ? (known.find((r) => r.slug === selected) ?? null) : null;
  const targets = checked.size > 0 ? pendingShown.filter((r) => checked.has(r.name)) : currentPending ? [currentPending] : [];

  const pendingColumns: GridCol<PendingCompany>[] = [
    {
      key: "outcome",
      label: M.colOutcome,
      width: "88px",
      align: "center",
      value: (r) => M.outcomeShort[outcomeOf(r)],
      render: (r) => {
        const done = doneOf(r);
        if (done) return <Tag tone="acc">{done}</Tag>;
        const last = results.get(r.name);
        if (last && !last.ok) return <Tag tone="neutral">{M.retriedFail}</Tag>;
        return <Tag tone={OUTCOME_TONE[outcomeOf(r)]}>{M.outcomeShort[outcomeOf(r)]}</Tag>;
      },
    },
    { key: "name", label: M.colName, width: "minmax(160px,1fr)", value: (r) => r.name },
    { key: "games", label: M.colGameCount, width: "72px", align: "right", value: (r) => r.gameCount },
  ];

  const knownColumns: GridCol<AdminCompanyRow>[] = [
    { key: "name", label: M.colName, width: "minmax(160px,1fr)", value: (r) => r.name },
    { key: "country", label: M.colCountry, width: "96px", align: "center", value: (r) => r.countryNameKo ?? "", text: (r) => r.countryNameKo ?? M.unknownCountry },
    { key: "games", label: M.colGameCount, width: "72px", align: "right", value: (r) => r.gameCount },
  ];

  const changeView = (v: string) => {
    setView(v as View);
    setSelected(null);
    setChecked(new Set());
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchView}>
          <FormSelect
            name="c-view"
            label={M.searchView}
            hideLabel
            size="md"
            value={view}
            onChange={changeView}
            options={[
              { value: "pending", label: `${M.viewPending} ${pending.length}` },
              { value: "known", label: `${M.viewKnown} ${known.length}` },
            ]}
          />
        </SearchItem>
        <SearchItem label={M.searchName} htmlFor="c-name">
          <TextField id="c-name" label={M.searchName} hideLabel value={name} onChange={(e) => setName(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <MasterDetail
        listWidth="520px"
        list={
          view === "pending" ? (
            <div className="flex flex-col gap-2">
              <DataGrid
                key="pending"
                label={M.pendingListLabel}
                columns={pendingColumns}
                rows={pendingShown}
                rowKey={(r) => r.name}
                selected={selected}
                onSelect={setSelected}
                autoSelectFirst
                checked={checked}
                onChecked={setChecked}
                rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
                pageSize={50}
                empty={M.empty}
                fit
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
            </div>
          ) : (
            <DataGrid
              key="known"
              label={M.knownListLabel}
              columns={knownColumns}
              rows={knownShown}
              rowKey={(r) => r.slug}
              selected={selected}
              onSelect={setSelected}
              autoSelectFirst
              pageSize={50}
              empty={M.knownEmpty}
              fit
            />
          )
        }
        detailTitle={currentPending?.name ?? currentKnown?.name ?? M.detailTitle}
        detailActions={
          currentKnown ? (
            <a href={companyPath(currentKnown.slug)} target="_blank" rel="noreferrer" className={EXTERNAL}>
              {M.openPublic}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          ) : undefined
        }
        detail={
          currentPending ? (
            <PendingDetail key={currentPending.name} r={currentPending} last={results.get(currentPending.name)} />
          ) : currentKnown ? (
            <KnownDetail key={currentKnown.slug} r={currentKnown} />
          ) : (
            <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>
          )
        }
      />
    </div>
  );
}

function PendingDetail({ r, last }: { r: PendingCompany; last?: { ok: boolean; text: string } }) {
  return (
    <FormSection title={M.sectionName} labelWidth="88px">
      <Field label={M.fieldRawName} wide>
        <ReadValue>
          <span className="break-words">{r.name}</span>
        </ReadValue>
      </Field>
      <Field label={M.fieldGameCount}>
        <ReadValue align="right">{M.gameCount(r.gameCount)}</ReadValue>
      </Field>
      <Field label={M.fieldOutcome} wide>
        <ReadValue>{r.outcome ? M.outcome[r.outcome] : M.notTriedYet}</ReadValue>
      </Field>
      {last && (
        <Field label={M.fieldLastResult} wide>
          <ReadValue>
            <span className={last.ok ? "text-acc" : "text-ink-2"}>{last.text}</span>
          </ReadValue>
        </Field>
      )}
    </FormSection>
  );
}

function KnownDetail({ r }: { r: AdminCompanyRow }) {
  const v = (x: string | null) => x ?? M.none;
  return (
    <>
      <FormSection title={M.sectionCompany} labelWidth="96px">
        <Field label={M.fieldCodeName} wide>
          <CodeName code={r.slug}>
            <ReadValue>
              <span className="truncate">{r.name}</span>
            </ReadValue>
          </CodeName>
        </Field>
        <Field label={M.fieldNameEn}>
          <ReadValue>{r.nameEn}</ReadValue>
        </Field>
        <Field label={M.fieldNameKo}>
          <ReadValue>{v(r.nameKo)}</ReadValue>
        </Field>
        <Field label={M.fieldCountry}>
          <ReadValue>{r.countryNameKo ?? M.unknownCountry}</ReadValue>
        </Field>
        <Field label={M.fieldGameCount}>
          <ReadValue align="right">{M.gameCount(r.gameCount)}</ReadValue>
        </Field>
        <Field label={M.fieldFounded}>
          <ReadValue>{r.foundedYear ? M.foundedYear(r.foundedYear) : M.none}</ReadValue>
        </Field>
        <Field label={M.fieldHq}>
          <ReadValue>{v(r.hqNameKo)}</ReadValue>
        </Field>
        <Field label={M.fieldWebsite} wide>
          <ReadValue>
            {r.websiteUrl ? (
              <a href={r.websiteUrl} target="_blank" rel="noreferrer" className="break-all text-acc hover:underline">
                {r.websiteUrl}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              M.none
            )}
          </ReadValue>
        </Field>
      </FormSection>
      <FormSection title={M.sectionSource} labelWidth="96px">
        <Field label={M.fieldWikidata}>
          <ReadValue>
            {r.wikidataId ? (
              <a href={`${WIKIDATA_ENTITY}${r.wikidataId}`} target="_blank" rel="noreferrer" className="font-mono text-[12.5px] text-acc hover:underline">
                {r.wikidataId}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              M.none
            )}
          </ReadValue>
        </Field>
        <Field label={M.fieldSyncedAt}>
          <ReadValue>{r.lastSyncedAt ? formatDateTime(r.lastSyncedAt) : M.none}</ReadValue>
        </Field>
      </FormSection>
    </>
  );
}
