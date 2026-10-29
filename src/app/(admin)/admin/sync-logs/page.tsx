// /admin/sync-logs — 수집이력조회. 최근 실행 기록, 조회조건 ?source=, ?status=.
//
// 수집현황이 스토어마다 "마지막 한 번" 만 보여 주는 값의 전문이 여기 있다.
// 원값(ok, steam)을 그대로 띄우던 자리를 한글 이름표로 바꿨다 — partial 이 성공인지 실패인지
// 영문으로는 판단이 안 선다. 다만 소스는 로그와 워크플로 이름을 맞대야 해서 원값을 상세의 코드 칸에 남긴다.
//
// 2026-10-29 — 화면 구성을 백오피스 조회 화면 꼴로 옮겼다(components/admin/sync-logs-screen). 여기는 조회조건을 읽어
// 그 조건으로 서버에서 다시 읽고, 직렬화되는 줄로 펴서 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { SyncLogsScreen, type SyncLogGridRow } from "@/components/admin/sync-logs-screen";
import { ADMIN_NAV, LOG_MESSAGES, sourceLabel } from "@/lib/admin/messages";
import { firstParam } from "@/lib/games-query";
import { isSourceName, isSyncStatus, listSyncLogs, SOURCES, type SyncLogRow } from "@/server/services/admin";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const metadata: Metadata = { title: ADMIN_NAV.logs };

/** 한 번에 싣는 실행 수. 옛 화면과 같은 값이다 — 더 옛 기록은 스토어, 결과로 좁혀 본다 */
const LOG_LIMIT = 100;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function toRow(l: SyncLogRow): SyncLogGridRow {
  const d = l.discovery;
  return {
    id: l.id,
    source: l.source,
    name: sourceLabel(l.source),
    status: l.status,
    startedAt: l.startedAt,
    finishedAt: l.finishedAt,
    processed: l.processed ?? 0,
    failed: l.failed ?? 0,
    errorSample: l.errorSample,
    discovery: d ? { pages: d.pages, scanned: d.scanned, fresh: d.fresh, startPage: d.startPage, stoppedBy: d.stoppedBy } : null,
  };
}

export default async function SyncLogsPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const rawSource = firstParam(sp.source);
  const source = isSourceName(rawSource) ? rawSource : undefined;
  const rawStatus = firstParam(sp.status);
  const status = isSyncStatus(rawStatus) ? rawStatus : undefined;
  const rows = (await listSyncLogs({ source, status, limit: LOG_LIMIT })).map(toRow);

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.logs} count={rows.length} note={rows.length >= LOG_LIMIT ? LOG_MESSAGES.limitNote(LOG_LIMIT) : undefined} />
      <SyncLogsScreen rows={rows} sources={SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }))} source={source ?? "all"} status={status ?? "all"} />
    </>
  );
}
