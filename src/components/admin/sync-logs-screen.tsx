"use client";
// 수집이력조회 화면 본문(2026-10-29). 백오피스 조회 화면 꼴:
// 위 조회조건(스토어, 결과), 왼쪽 실행 그리드, 오른쪽 고른 실행의 상세(실행, 신규 찾기, 에러 맛보기).
// 앞 판은 소스 칩 열여섯 줄 + 옛 data-rows 표였고 에러 맛보기가 줄 밑에 두 줄로 펴져 정상 실행을 밀어냈다.
// 에러는 이제 상세에서 전문으로 본다. 그리드에는 실행을 가르는 값(결과, 시각, 건수, 신규 찾기가 멈춘 까닭)만 둔다.
//
// 조회조건은 둘 다 서버가 다시 읽는 칸이라 주소로 간다(useUrlFilter) — 서버는 최근 몇 건만 싣기 때문에 "실패만" 은
// 받은 줄을 거르는 게 아니라 서버에서 실패 줄만 다시 읽어야 더 옛 실패까지 닿는다.
// 결과 이름표와 배지 색은 수집현황과 한 벌이다(messages/sync 의 SYNC_STATUS_LABEL, sync-tone 의 SYNC_STATUS_TONE).
import { memo, useState } from "react";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { CodeName, Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { useUrlFilter } from "@/components/admin/screen/url-filter";
import { SyncErrorSample } from "@/components/admin/sync-error-sample";
import { SYNC_HEALTH_TONE } from "@/components/admin/sync-tone";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { ADMIN_NAV, APPROVAL_MESSAGES as AM, LOG_MESSAGES as M, SYNC_MESSAGES, SYNC_RUN_HEALTH_LABEL } from "@/lib/admin/messages";
import { SYNC_RUN_HEALTHS, type SyncRunHealth } from "@/lib/admin/sync-health";
import { joinSyncFilter, splitSyncFilter, syncFilterHref } from "@/lib/admin/sync-filter";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

/** 서버 화면이 넘기는 실행 한 줄 */
export type SyncLogGridRow = {
  id: number;
  source: string;
  name: string;
  /** 끝나지 않은 실행은 결과 값 대신 도는 중, 끊김으로 읽는다 */
  health: SyncRunHealth;
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  failed: number;
  errorSample: string | null;
  discovery: { pages: number; scanned: number; fresh: number; startPage?: number; stoppedBy: string } | null;
};

/**
 * 발견 중단 사유. "예산 다 씀" 이 이어지면 포화 신호다 — 아는 것만 나오는 구간이 페이지 예산보다 길다는 뜻이라
 * 예산을 올리거나 발견 시작점을 옮겨야 한다. 그래서 이 값만 주황으로 띄운다.
 */
const DISCOVERY_STOP: Record<string, { label: string; tone: TagTone }> = {
  want: { label: M.stopWant, tone: "ok" },
  budget: { label: M.stopBudget, tone: "warn" },
  "catalog-end": { label: M.stopCatalogEnd, tone: "neutral" },
};

const stopOf = (r: SyncLogGridRow) => (r.discovery ? (DISCOVERY_STOP[r.discovery.stoppedBy] ?? { label: r.discovery.stoppedBy, tone: "neutral" as const }) : null);
const durationOf = (r: SyncLogGridRow) => (r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null);

function StatusTag({ health }: { health: SyncRunHealth }) {
  return <Tag tone={SYNC_HEALTH_TONE[health]}>{SYNC_RUN_HEALTH_LABEL[health]}</Tag>;
}

const STATUS_OPTIONS = [
  { value: "all", label: M.all },
  ...SYNC_RUN_HEALTHS.map((s) => ({ value: s, label: SYNC_RUN_HEALTH_LABEL[s] })),
];

/** 칸은 화면 상태에 기대지 않아 모듈에 둔다 — 렌더마다 새 배열이면 아래 Results 의 memo 가 소용없다 */
const COLUMNS: GridCol<SyncLogGridRow>[] = [
  { key: "id", label: M.colId, width: "60px", align: "right", value: (r) => r.id },
  { key: "status", label: M.colStatus, width: "84px", align: "center", value: (r) => SYNC_RUN_HEALTH_LABEL[r.health], render: (r) => <StatusTag health={r.health} /> },
  { key: "source", label: M.colSource, width: "minmax(130px,1fr)", value: (r) => r.name },
  { key: "started", label: M.colStarted, width: "128px", align: "center", value: (r) => r.startedAt, text: (r) => formatDateTime(r.startedAt) },
  { key: "duration", label: M.colDuration, width: "80px", align: "right", value: durationOf, text: (r) => (r.finishedAt ? formatDuration(durationOf(r) ?? 0) : "-") },
  { key: "processed", label: M.colProcessed, width: "60px", align: "right", value: (r) => r.processed, text: (r) => r.processed.toLocaleString("ko-KR") },
  {
    key: "failed",
    label: M.colFailed,
    width: "52px",
    align: "right",
    value: (r) => r.failed,
    render: (r) => <span className={r.failed > 0 ? "font-semibold text-danger" : "text-dim"}>{r.failed.toLocaleString("ko-KR")}</span>,
  },
  {
    key: "discovery",
    label: M.colDiscovery,
    width: "88px",
    align: "center",
    value: (r) => stopOf(r)?.label ?? "",
    text: (r) => stopOf(r)?.label ?? "-",
    render: (r) => {
      const stop = stopOf(r);
      return stop ? <Tag tone={stop.tone}>{stop.label}</Tag> : <span className="text-dim-2">-</span>;
    },
  },
];

const rowKey = (r: SyncLogGridRow) => String(r.id);
const fileKey = (r: SyncLogGridRow) => ({ code: String(r.id), name: r.name });

export function SyncLogsScreen({
  rows,
  sources,
  source,
  status,
}: {
  rows: SyncLogGridRow[];
  sources: Array<{ value: string; label: string }>;
  source: string;
  status: string;
}) {
  // 두 칸을 한 값으로 쥔다(lib/admin/sync-filter 머리 주석)
  const filter = useUrlFilter(joinSyncFilter(source, status), (v) => syncFilterHref(ROUTES.adminSyncLogs, v));
  const [srcValue, stValue] = splitSyncFilter(filter.value);

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchSource}>
          <FormSelect name="logs-source" label={M.searchSource} hideLabel size="md" value={srcValue} onChange={(v) => filter.set(joinSyncFilter(v, stValue))} options={[{ value: "all", label: M.all }, ...sources]} />
        </SearchItem>
        <SearchItem label={M.searchStatus}>
          <FormSelect name="logs-status" label={M.searchStatus} hideLabel size="md" value={stValue} onChange={(v) => filter.set(joinSyncFilter(srcValue, v))} options={STATUS_OPTIONS} />
        </SearchItem>
      </SearchBand>
      <div className={cn("transition-opacity duration-fast", filter.pending && "pointer-events-none opacity-50")} aria-busy={filter.pending || undefined}>
        <Results rows={rows} />
      </div>
    </div>
  );
}

/**
 * 그리드와 상세. 조회조건을 고른 순간의 낙관 렌더에서 이 아래는 다시 그리지 않는다(rows 가 그대로라 memo 가 건너뛴다) —
 * 실행 50줄을 같이 그리느라 고른 값이 칸에 서기까지 230ms 남짓 걸렸다(2026-10-29 CDP 실측, dev). 서버가 새 줄을 주면 그때 그린다
 */
const Results = memo(function Results({ rows }: { rows: SyncLogGridRow[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = rows.find((r) => String(r.id) === selected) ?? null;
  return (
    <MasterDetail
      listWidth="728px"
      list={
        <DataGrid
          label={M.listLabel}
          columns={COLUMNS}
          rows={rows}
          rowKey={rowKey}
          selected={selected}
          onSelect={setSelected}
          autoSelectFirst
          pageSize={50}
          empty={M.empty}
          maxHeight="calc(100svh - var(--header-h) - 300px)"
          fileKey={fileKey}
        />
      }
      detailTitle={current ? M.detailTitleOf(current.name, current.id) : M.detailTitle}
      detailActions={current ? <ProgramLink href={`${ROUTES.adminSync}?source=${current.source}`}>{ADMIN_NAV.overview}</ProgramLink> : undefined}
      detail={current ? <Detail key={current.id} r={current} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
    />
  );
});

function Detail({ r }: { r: SyncLogGridRow }) {
  const stop = stopOf(r);
  const d = r.discovery;
  return (
    <>
      <FormSection title={M.sectionRun} labelWidth="96px">
        <Field label={M.fieldCodeName} wide>
          <CodeName code={r.source}>
            <ReadValue>
              <span className="truncate">{r.name}</span>
            </ReadValue>
          </CodeName>
        </Field>
        <Field label={M.fieldId}>
          <ReadValue align="right">{r.id}</ReadValue>
        </Field>
        <Field label={M.fieldStatus}>
          <ReadValue>
            <StatusTag health={r.health} />
          </ReadValue>
        </Field>
        <Field label={M.fieldStarted}>
          <ReadValue>
            <span className="tabular-nums">{formatDateTime(r.startedAt)}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldFinished}>
          <ReadValue>
            <span className="tabular-nums">{r.finishedAt ? formatDateTime(r.finishedAt) : M.notFinished}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldDuration}>
          <ReadValue align="right">{r.finishedAt ? formatDuration(durationOf(r) ?? 0) : "-"}</ReadValue>
        </Field>
        <Field label={M.fieldProcessed}>
          <ReadValue align="right">{r.processed.toLocaleString("ko-KR")}</ReadValue>
        </Field>
        <Field label={M.fieldFailed}>
          <ReadValue align="right">
            <span className={r.failed > 0 ? "font-semibold text-danger" : undefined}>{r.failed.toLocaleString("ko-KR")}</span>
          </ReadValue>
        </Field>
      </FormSection>
      {d && stop && (
        <FormSection title={M.sectionDiscovery} labelWidth="96px">
          <Field label={M.fieldStop}>
            <ReadValue>
              <Tag tone={stop.tone}>{stop.label}</Tag>
            </ReadValue>
          </Field>
          <Field label={M.fieldScan} wide>
            <ReadValue>
              <span className="break-words py-2">{SYNC_MESSAGES.discoverySummary(d.pages, d.scanned, d.fresh, d.startPage)}</span>
            </ReadValue>
          </Field>
        </FormSection>
      )}
      {r.errorSample && (
        <FormSection title={M.sectionError}>
          <SyncErrorSample text={r.errorSample} />
        </FormSection>
      )}
    </>
  );
}
