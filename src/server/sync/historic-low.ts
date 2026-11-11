// 역대 최저가 표시(game_platforms.historic_low)를 다시 판정한다. 규칙은 lib/games/historic-low 와 같고, 여기는 그 SQL 꼴이다.
//
// 값이 바뀐 행만 다시 본다 — 가격 기록 최저값은 새 값이 들어올 때만 바뀌기 때문이다. 한 문장으로 DB 안에서 계산해
// 기록을 앱으로 내려받지 않는다(Neon 전송량). 판정이 그대로면 쓰지 않는다(§7 값이 달라질 때만 UPDATE).
// 기간 조건(HISTORIC_LOW_MIN_HISTORY_DAYS)은 시간이 지나면 저절로 참이 되는데, 그 행은 다음에 값이 바뀔 때 켜진다 —
// 그 사이 그 게임은 이미 그 값에 오래 머문 것이라 "지금 막 최저가" 소식이 아니다. 처음 붙일 때 한 번은 scripts 로 전부 판정했다.
import { sql } from "drizzle-orm";
import { HISTORIC_LOW_MIN_HISTORY_DAYS } from "@/lib/games/historic-low";
import type { Ctx } from "./context";

/** 주어진 가격 행들의 역대 최저가 여부를 다시 쓴다. 바뀐 행 수를 돌려준다 */
export async function markHistoricLows(ctx: Pick<Ctx, "db">, gamePlatformIds: string[]): Promise<number> {
  if (gamePlatformIds.length === 0) return 0;
  const ids = JSON.stringify([...new Set(gamePlatformIds)]);
  const res = await ctx.db.execute(sql`
    with h as (
      select s.game_platform_id as id, min(s.price) filter (where s.price > 0) as low, min(s.captured_at) as first_at
      from price_snapshots s
      where s.game_platform_id in (select (jsonb_array_elements_text(${ids}::jsonb))::uuid)
      group by 1
    ), judged as (
      select p.id,
        (coalesce(p.discount_pct, 0) > 0 and p.current_price > 0 and h.low is not null and p.current_price <= h.low
          and h.first_at <= now() - make_interval(days => ${HISTORIC_LOW_MIN_HISTORY_DAYS}::int)) as v
      from game_platforms p join h on h.id = p.id
    )
    update game_platforms p set historic_low = j.v, updated_at = now(), updated_source = 'system'
    from judged j
    where p.id = j.id and p.historic_low is distinct from j.v
  `);
  return (res as { rowCount?: number }).rowCount ?? 0;
}
