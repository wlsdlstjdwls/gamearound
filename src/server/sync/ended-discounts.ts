// 종료 시각이 지난 할인을 정가로 되돌린다 — 스토어에 다시 묻지 않고 우리가 아는 값만으로.
//
// 왜(2026-11-09 실측): 가격 행은 오래된 순으로 다시 묻는데 한 바퀴가 2.6~4.3일이라, 할인이 끝난 뒤에도
// 다음 차례가 올 때까지 할인 중으로 남아 있었다(그날 2,359행). 목록, 홈, 상세가 그 값을 그대로 할인으로 보였다.
// 읽기 질의마다 "종료 시각이 지났으면 할인 아님" 을 붙이는 길도 있었지만, 할인율 말고도 현재가, 정렬, 집계표
// (list-stats), 찜 알림이 모두 같은 칸을 읽어서 한 자리라도 빠지면 다시 샌다. 값 자체를 고친다.
//
// 스토어가 할인을 연장했다면? 다음 갱신이 다시 할인으로 덮는다. 그 사이 몇 시간 정가로 보이는 쪽이
// 끝난 할인을 며칠씩 보이는 쪽보다 덜 틀린다 — 종료 시각은 스토어가 준 값이고 연장은 드물다.
//
// 종료 시각이 없는 할인은 "스토어가 마지막으로 할인이라고 말해 준 때" 로 센다(STALE_DISCOUNT_DAYS). 그보다 오래 아무도
// 다시 확인하지 못한 할인은 끝난 것으로 본다 — 2026-11-11 실측 3,570행이 09-15 값 그대로 할인으로 떠 있었다(PS 병합분,
// 상세가 PS5 만 줘서 멈춘 PS4 행). 스토어가 시작 시각을 안 주는 PS 는 기간을 셀 수 없어 확인 시각이 유일한 근거다.
//
// AGENTS §7 "할인 메타는 null 로 덮어써야 한다" 의 연장이다. 관리자가 잠근 칸이 하나라도 있으면 그 행은 건드리지 않는다.
import { and, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { gamePlatforms, games, priceSnapshots, type Platform, type Region } from "@/server/db/schema";
import { updatedBy, createdBy } from "@/server/db/audit";
import { isLocked, type Ctx } from "./context";
import { STALE_DISCOUNT_DAYS } from "./constants";

const DAY_MS = 86_400_000;

/** 되돌릴 때 함께 바뀌는 칸. 하나라도 잠겨 있으면 그 행은 사람이 정한 값이라 손대지 않는다 */
const RESET_FIELDS = ["currentPrice", "discountPct", "discountStartsAt", "discountEndsAt", "discountName"] as const;

export type EndedDiscountRow = { id: string; slug: string; listPrice: number | null };

/** 되돌릴 행만 고른다. 정가를 모르면 되돌릴 값이 없으니 다음 갱신을 기다린다 */
export function pickResettable(rows: EndedDiscountRow[], locked: (rowId: string, field: string) => boolean): EndedDiscountRow[] {
  return rows.filter((r) => r.listPrice !== null && r.listPrice > 0 && !RESET_FIELDS.some((f) => locked(r.id, f)));
}

/**
 * 이 소스가 맡는 기기, 지역에서 끝난 할인을 정가로 되돌리고 되돌린 행 수를 돌려준다.
 * 가격 이력에도 정가 한 줄을 남긴다 — 안 남기면 그래프가 다음 갱신까지 할인가로 이어 그린다.
 */
export async function resetEndedDiscounts(ctx: Ctx, platforms: Platform[], region: Region): Promise<number> {
  const { db } = ctx;
  const rows = await db
    .select({ id: gamePlatforms.id, slug: games.slug, listPrice: gamePlatforms.listPrice })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(
      and(
        inArray(gamePlatforms.platform, platforms),
        eq(gamePlatforms.region, region),
        gt(gamePlatforms.discountPct, 0),
        or(
          and(isNotNull(gamePlatforms.discountEndsAt), lt(gamePlatforms.discountEndsAt, ctx.now)),
          and(
            isNull(gamePlatforms.discountEndsAt),
            sql`coalesce(${gamePlatforms.lastSyncedAt}, ${gamePlatforms.updatedAt}) < ${new Date(ctx.now.getTime() - STALE_DISCOUNT_DAYS * DAY_MS).toISOString()}::timestamptz`,
          ),
        ),
      ),
    );
  const targets = pickResettable(rows, (rowId, field) => isLocked(ctx, "game_platforms", rowId, field));
  if (targets.length === 0) return 0;

  const ids = targets.map((t) => t.id);
  const source = `crawler:${ctx.source}` as const;
  // 행마다 정가가 달라 한 문장으로 쓴다(현재가 = 그 행의 정가). 왕복 둘로 끝난다
  await db
    .update(gamePlatforms)
    .set({
      currentPrice: sql`${gamePlatforms.listPrice}`,
      discountPct: 0,
      discountStartsAt: null,
      discountEndsAt: null,
      discountName: null,
      ...updatedBy(source),
    })
    .where(inArray(gamePlatforms.id, ids));
  await db.insert(priceSnapshots).values(
    targets.map((t) => ({ gamePlatformId: t.id, price: t.listPrice!, discountPct: 0, capturedAt: ctx.now, ...createdBy(source) })),
  );
  for (const t of targets) ctx.changedSlugs.add(t.slug);
  return targets.length;
}
