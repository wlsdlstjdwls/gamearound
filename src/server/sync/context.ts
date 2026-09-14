// 실행 컨텍스트 — 한 번의 runSource 동안 누적되는 상태(처리 수, 오류 표본, 변경된 slug, 가격 변동).
// 단계 함수들이 이 객체 하나만 받으므로 인자 목록이 단계마다 늘어나지 않는다.
import { eq } from "drizzle-orm";
import { dataCorrections, type SyncStatus } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { Source } from "@/server/adapters/types";
import { errorMessage } from "@/lib/errors";
import { ERROR_SAMPLE_MAX } from "./constants";
import type { DispatchSummary, PriceChange } from "./dispatch-alerts";

export interface RunOptions {
  /** 배치 크기 덮어쓰기 */
  limit?: number;
  /** 카탈로그에서 신규 게임을 N개까지 발견해 시드 (SEEDABLE_SOURCES) */
  seedTop?: number;
  /**
   * 발견이 읽을 목록 페이지 수 상한. 비우면 소스별 기본값(DISCOVERY_PAGE_BUDGET).
   * 실행 시간이 짧은 자리(Vercel 함수 300초)에서만 줄여 쓴다 — 요청 간격 × 이 값이 곧 시간이다.
   */
  pageBudget?: number;
  /**
   * 신규 시드가 배치에서 가져갈 몫의 비율. 비우면 SEED_SHARE_MAX(절반).
   * 1 을 주면 배치 전부를 시드가 쓴다 — 가격 갱신을 다른 실행이 따로 맡는 자리
   * (크론 discover 모드)에서만 그렇게 한다.
   */
  seedShare?: number;
}

export interface RunResult {
  source: Source;
  status: SyncStatus | "skipped";
  processed: number;
  failed: number;
  changed: number;
  errorSample?: string;
  alerts?: DispatchSummary;
}

export interface Ctx {
  db: Db;
  source: Source;
  now: Date;
  locks: Set<string>;
  processed: number;
  failed: number;
  errors: string[];
  changedSlugs: Set<string>;
  /** 게임이 아니라 회사 화면 캐시를 깨야 할 때 — 회사 정보나 그 회사 게임이 바뀐 경우 */
  changedCompanySlugs: Set<string>;
  priceChanges: PriceChange[];
}

/** 잠금 키는 snake_case 로 정규화한다 — DB 는 snake, 코드는 camel 로 같은 필드를 부른다 */
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** data_corrections.lock_field=true 인 (table,row_id,field) 집합. 키는 snake_case 로 정규화 */
export async function loadLockedFields(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ table: dataCorrections.table, rowId: dataCorrections.rowId, field: dataCorrections.field })
    .from(dataCorrections)
    .where(eq(dataCorrections.lockField, true));
  return new Set(rows.map((r) => `${toSnake(r.table)}:${r.rowId}:${toSnake(r.field)}`));
}

export function isLocked(ctx: Ctx, table: string, rowId: string, field: string): boolean {
  return ctx.locks.has(`${toSnake(table)}:${rowId}:${toSnake(field)}`);
}

export function recordError(ctx: Ctx, label: string, e: unknown): void {
  ctx.failed++;
  const msg = `[${label}] ${errorMessage(e)}`;
  if (ctx.errors.length < ERROR_SAMPLE_MAX) ctx.errors.push(msg);
  console.warn(`[sync:${ctx.source}] ${msg}`);
}
