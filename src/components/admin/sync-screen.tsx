"use client";
// 수집현황 화면 본문(2026-10-29). 백오피스 조회 화면 꼴:
// 위 조회조건(스토어, 상태), 왼쪽 스토어 그리드, 오른쪽 고른 줄의 상세(수집 상태, 에러 맛보기, 가져온 게임).
// 앞 판은 옛 data-rows 표 한 장에 에러 맛보기와 쉬는 까닭을 줄 밑에 눕혔다. 그리드 칸에는 "어디가 아픈가" 를 가르는 값만 두고
// 긴 글(에러, 쉬는 까닭, 신규 찾기)은 상세로 옮겼다 — 줄 높이가 고르게 서야 손볼 줄이 한눈에 갈린다.
//
// 조회조건은 화면 안에서 거른다(2026-10-30 사용자 결정). 스토어가 열댓 줄이라 서버가 다시 읽어도 결과가 같은데,
// 고를 때마다 Neon 을 두 질의씩 깨웠다. 주소는 history.replaceState 로만 고친다 — 새로 고침, 링크 공유, 현황판에서 ?status= 로
// 들어오는 길은 그대로 살고 서버는 다시 부르지 않는다(task-board 와 같은 방식).
// 줄은 서버가 손볼 것부터 세워 준다(page.tsx). 그리드 머리를 눌러 다른 순서로 볼 수 있다.
// "가져온 게임" 시트는 상세의 단추 하나 뒤에 있고 누르기 전에는 세우지 않는다(sync-run-sheet 머리 주석, 닫힌 시트 19.5초 사고).
import { memo, useMemo, useState } from "react";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { CodeName, Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { SyncErrorSample } from "@/components/admin/sync-error-sample";
import { runCounts, SyncRunSheet } from "@/components/admin/sync-run-sheet";
import { SYNC_HEALTH_TONE } from "@/components/admin/sync-tone";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { ADMIN_NAV, APPROVAL_MESSAGES as AM, SYNC_MESSAGES as M, SYNC_STATUS_LABEL } from "@/lib/admin/messages";
import { joinSyncFilter, splitSyncFilter, syncFilterHref } from "@/lib/admin/sync-filter";
import { matchesHealthFilter, type SyncHealth, type SyncHealthFilter } from "@/lib/admin/sync-health";
import { formatAgo, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { RunSummary } from "@/server/services/admin-activity";

/** 서버 화면이 넘기는 스토어 한 줄. 마지막 실행의 값과 그 실행이 가져온 게임의 셈 */
export type SyncSourceRow = {
  source: string;
  name: string;
  health: SyncHealth;
  /** 꺼진 소스의 사유(getDisabledReason). 켜진 소스는 null */
  disabledReason: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  processed: number;
  failed: number;
  errorSample: string | null;
  discovery: { pages: number; scanned: number; fresh: number; startPage?: number } | null;
  failedToday: number;
  run: RunSummary | null;
};

export type SyncFilterOption = { value: string; label: string };

const STATUS_FILTERS: { value: SyncHealthFilter; label: string }[] = [
  { value: "all", label: M.all },
  { value: "attention", label: M.attention },
  { value: "stalled", label: M.stalled },
  { value: "failed", label: SYNC_STATUS_LABEL.failed },
  { value: "partial", label: SYNC_STATUS_LABEL.partial },
  { value: "running", label: M.running },
  { value: "ok", label: SYNC_STATUS_LABEL.ok },
  { value: "idle", label: M.idleFilter },
];

function healthLabel(r: SyncSourceRow): string {
  if (r.health === "idle") return r.disabledReason ? M.disabled : M.noRun;
  if (r.health === "running") return M.running;
  if (r.health === "stalled") return M.stalled;
  return SYNC_STATUS_LABEL[r.health];
}

function HealthTag({ r }: { r: SyncSourceRow }) {
  return (
    <Tag tone={SYNC_HEALTH_TONE[r.health]}>
      {/* 도는 중인 칸만 점이 숨 쉰다. 멈춘 화면에서 움직이는 것은 "지금 일어나는 일" 뿐이어야 한다 */}
      {r.health === "running" && <span aria-hidden className="mr-1 size-1.5 animate-pulse rounded-full bg-acc" />}
      {healthLabel(r)}
    </Tag>
  );
}

/** 신선도가 먼저다 — "최근인가" 를 사람이 시각에서 빼서 세던 자리다(formatAgo 주석) */
const lastAt = (r: SyncSourceRow) => r.finishedAt ?? r.startedAt;

export function SyncScreen({
  rows,
  asOf,
  sources,
  source,
  status,
}: {
  rows: SyncSourceRow[];
  /** 서버가 읽은 시각. "3시간 전" 을 셀 때 쓴다(렌더 안에서 Date.now() 를 부르지 않는다) */
  asOf: number;
  sources: SyncFilterOption[];
  source: string;
  status: SyncHealthFilter;
}) {
  const [joined, setJoined] = useState(() => joinSyncFilter(source, status));
  const [srcValue, stValue] = splitSyncFilter(joined);
  const choose = (next: string) => {
    setJoined(next);
    window.history.replaceState(null, "", syncFilterHref(ROUTES.adminSync, next));
  };
  const shown = useMemo(
    () => rows.filter((r) => (srcValue === "all" || r.source === srcValue) && matchesHealthFilter(r.health, stValue as SyncHealthFilter)),
    [rows, srcValue, stValue],
  );

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchSource}>
          <FormSelect name="sync-source" label={M.searchSource} hideLabel size="md" value={srcValue} onChange={(v) => choose(joinSyncFilter(v, stValue))} options={[{ value: "all", label: M.all }, ...sources]} />
        </SearchItem>
        <SearchItem label={M.searchStatus}>
          <FormSelect name="sync-status" label={M.searchStatus} hideLabel size="md" value={stValue} onChange={(v) => choose(joinSyncFilter(srcValue, v))} options={STATUS_FILTERS} />
        </SearchItem>
      </SearchBand>
      <Results rows={shown} asOf={asOf} />
    </div>
  );
}

/**
 * 그리드와 상세. 거른 줄(shown)이 바뀔 때만 다시 그린다 — 조회조건 칸만 바뀌는 렌더까지 그리드를 같이 그리면
 * 고른 값이 칸에 서기까지 dev 에서 100ms 남짓 걸렸다(2026-10-29 CDP 실측)
 */
const Results = memo(function Results({ rows, asOf }: { rows: SyncSourceRow[]; asOf: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = rows.find((r) => r.source === selected) ?? null;

  const columns: GridCol<SyncSourceRow>[] = [
    { key: "status", label: M.colStatus, width: "92px", align: "center", value: healthLabel, render: (r) => <HealthTag r={r} /> },
    {
      key: "source",
      label: M.colSource,
      width: "minmax(180px,1.5fr)",
      value: (r) => r.name,
      text: (r) => `${r.name} ${r.source}`,
      // 스토어 이름은 한글로 띄우고, 로그를 맞대 볼 때 쓰는 원값은 곁에 작게 남긴다
      render: (r) => (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate">{r.name}</span>
          <span className="shrink-0 font-mono text-[11px] font-normal text-dim">{r.source}</span>
        </span>
      ),
    },
    { key: "when", label: M.finishedAt, width: "96px", align: "center", value: (r) => lastAt(r), text: (r) => (lastAt(r) ? formatAgo(lastAt(r), asOf) : "-") },
    { key: "processed", label: M.colProcessed, width: "72px", align: "right", value: (r) => r.processed, text: (r) => r.processed.toLocaleString("ko-KR") },
    {
      key: "failed",
      label: M.colFailed,
      width: "56px",
      align: "right",
      value: (r) => r.failed,
      render: (r) => <span className={r.failed > 0 ? "font-semibold text-danger" : "text-mut"}>{r.failed.toLocaleString("ko-KR")}</span>,
    },
    {
      key: "today",
      label: M.failedToday,
      width: "72px",
      align: "right",
      value: (r) => r.failedToday,
      text: (r) => M.failedTimes(r.failedToday),
      render: (r) => <span className={r.failedToday > 0 ? "font-semibold text-danger" : "text-mut"}>{M.failedTimes(r.failedToday)}</span>,
    },
    { key: "run", label: M.colRun, width: "84px", align: "right", value: (r) => r.run?.total ?? 0, text: (r) => (r.run && r.run.total > 0 ? M.runItemsShort(r.run.total) : "-") },
  ];

  return (
    <MasterDetail
      listWidth="700px"
      list={
        <DataGrid
          label={M.listLabel}
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          selected={selected}
          onSelect={setSelected}
          autoSelectFirst
          // 쉬는 소스는 흐리게 — 손볼 일이 없는 줄이다
          rowTone={(r) => (r.disabledReason ? "muted" : undefined)}
          empty={M.empty}
          maxHeight="calc(100svh - var(--header-h) - 270px)"
          fileKey={(r) => ({ code: r.source, name: r.name })}
        />
      }
      detailTitle={current?.name ?? M.detailTitle}
      detailActions={current ? <ProgramLink href={`${ROUTES.adminSyncLogs}?source=${current.source}`}>{ADMIN_NAV.logs}</ProgramLink> : undefined}
      detail={current ? <Detail key={current.source} r={current} asOf={asOf} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
    />
  );
});

const rowKey = (r: SyncSourceRow) => r.source;

function Detail({ r, asOf }: { r: SyncSourceRow; asOf: number }) {
  const at = lastAt(r);
  return (
    <>
      <FormSection title={M.sectionStatus} labelWidth="96px">
        <Field label={M.fieldCodeName} wide>
          <CodeName code={r.source}>
            <ReadValue>
              <span className="truncate">{r.name}</span>
            </ReadValue>
          </CodeName>
        </Field>
        <Field label={M.fieldStatus}>
          <ReadValue>
            <HealthTag r={r} />
          </ReadValue>
        </Field>
        <Field label={M.fieldFailedToday}>
          <ReadValue align="right">
            <span className={r.failedToday > 0 ? "font-semibold text-danger" : undefined}>{M.failedTimes(r.failedToday)}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldFinished} wide>
          <ReadValue>
            {at ? (
              <span className="tabular-nums">
                <span className="text-ink">{formatAgo(at, asOf)}</span>
                <span className="text-dim"> | </span>
                {formatDateTime(at)}
              </span>
            ) : (
              M.neverRan
            )}
          </ReadValue>
        </Field>
        <Field label={M.fieldProcessed}>
          <ReadValue align="right">{at ? r.processed.toLocaleString("ko-KR") : "-"}</ReadValue>
        </Field>
        <Field label={M.fieldFailed}>
          <ReadValue align="right">
            <span className={r.failed > 0 ? "font-semibold text-danger" : undefined}>{at ? r.failed.toLocaleString("ko-KR") : "-"}</span>
          </ReadValue>
        </Field>
        <Field label={M.discovery} wide>
          <ReadValue>
            <span className="break-words py-2">{r.discovery ? M.discoverySummary(r.discovery.pages, r.discovery.scanned, r.discovery.fresh, r.discovery.startPage) : "-"}</span>
          </ReadValue>
        </Field>
        {r.disabledReason && (
          // 쉬는 까닭은 접어 두지 않는다 — 왜 안 도는지 모르면 고장으로 읽는다
          <Field label={M.fieldDisabled} wide>
            <ReadValue>
              <span className="break-words py-2">{r.disabledReason}</span>
            </ReadValue>
          </Field>
        )}
      </FormSection>
      {r.errorSample && (
        <FormSection title={M.sectionError}>
          <SyncErrorSample text={r.errorSample} />
        </FormSection>
      )}
      {r.run && r.run.total > 0 && (
        <FormSection title={M.sectionRun} labelWidth="96px" action={<SyncRunSheet source={r.source} sourceName={r.name} run={r.run} now={asOf} />}>
          <Field label={M.fieldRunStarted} wide>
            <ReadValue>
              <span className="tabular-nums">
                <span className="text-ink">{formatAgo(r.run.startedAt, asOf)}</span>
                <span className="text-dim"> | </span>
                {formatDateTime(r.run.startedAt)}
              </span>
            </ReadValue>
          </Field>
          {runCounts(r.run).map((c) => (
            <Field key={c.label} label={c.label}>
              <ReadValue align="right">{M.count(c.n)}</ReadValue>
            </Field>
          ))}
          <Field label={M.fieldProcessed}>
            <ReadValue align="right">{M.count(r.run.processed)}</ReadValue>
          </Field>
        </FormSection>
      )}
    </>
  );
}
