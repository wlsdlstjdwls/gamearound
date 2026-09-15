// 카탈로그 전체의 "시간당 가격" 분포 — 상세 화면의 눈금이 이 값 위에 이 게임을 세운다.
//
// 게임 하나가 아니라 카탈로그를 읽는 유일한 조회라 게임 태그로 무효화하지 않는다.
// 크롤 한 번에 경계가 눈에 띄게 움직이지 않으므로 수명만 길게 준다(lib/cache).
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { HOME_REGION } from "@/server/db/schema";
import { DTO_CACHE_VERSION, PRICE_SCALE_REVALIDATE_SECONDS } from "@/lib/cache";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import type { PricePerHourScale } from "@/lib/price-per-hour";

/** 축의 오른쪽 끝으로 쓸 백분위. 최댓값으로 끊으면 축의 대부분이 빈칸이 된다 */
const AXIS_MAX_PERCENTILE = 0.9;

type Row = { n: number; q1: number | null; median: number | null; q3: number | null; axis_max: number | null };

/**
 * 게임당 한 값만 넣는다 — 가장 싼 스토어의 현재가를 메인 스토리 시간으로 나눈 값.
 * 스토어마다 한 줄씩 넣으면 멀티플랫폼 게임이 분포를 여러 번 밀어 올린다.
 * 상세 화면이 "최저가"를 기준으로 시간당 가격을 말하므로 분포도 같은 기준이어야 같은 축에 선다.
 */
async function getPricePerHourScaleRaw(): Promise<PricePerHourScale | null> {
  const res = await getDb().execute(sql`
    with per_game as (
      select min(gp.current_price)::numeric / p.main_story_hours as per_hour
      from games g
      join playtimes p on p.game_id = g.id
      join game_platforms gp on gp.game_id = g.id
      where g.content_type = 'game'
        and gp.region = ${HOME_REGION}
        and gp.currency = ${DISPLAY_CURRENCY}
        and gp.current_price > 0
        and p.main_story_hours > 0
      group by g.id, p.main_story_hours
    )
    select
      count(*)::int as n,
      percentile_cont(0.25) within group (order by per_hour) as q1,
      percentile_cont(0.5)  within group (order by per_hour) as median,
      percentile_cont(0.75) within group (order by per_hour) as q3,
      percentile_cont(${AXIS_MAX_PERCENTILE}) within group (order by per_hour) as axis_max
    from per_game
  `);

  const row = (res.rows as Row[])[0];
  if (!row || row.n === 0) return null;
  // percentile_cont 는 numeric 이라 드라이버가 문자열로 줄 수 있다 — 여기서 한 번만 숫자로 만든다
  const num = (v: number | string | null) => (v === null ? 0 : Math.round(Number(v)));
  return {
    currency: DISPLAY_CURRENCY,
    sampleSize: row.n,
    q1: num(row.q1),
    median: num(row.median),
    q3: num(row.q3),
    axisMax: num(row.axis_max),
  };
}

/**
 * 분포는 게임 하나가 아니라 카탈로그의 성질이라 태그가 없다 — 수명이 지나면 다시 뜬다.
 * 조회에 실패해도 상세 화면은 떠야 한다. 축이 없으면 숫자만 말한다.
 */
export async function getPricePerHourScale(): Promise<PricePerHourScale | null> {
  const cached = unstable_cache(getPricePerHourScaleRaw, [DTO_CACHE_VERSION, "price-per-hour-scale"], {
    revalidate: PRICE_SCALE_REVALIDATE_SECONDS,
  });
  try {
    return await cached();
  } catch {
    return null;
  }
}
