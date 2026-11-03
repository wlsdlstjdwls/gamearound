// 회사 한눈에 보기 — 외부 출처 없이 우리 카탈로그만으로 계산하는 회사 정보(2026-11-03 사용자 지시).
//
// 왜: 위키데이터, IGDB 에 없는 작은 회사는 이름과 게임 수 말고 빈칸이다. 그 회사가 무엇을 언제부터 어디에 내 왔는지는
// 우리가 가진 게임에서 바로 나온다 — 사용 조건 걱정이 없는 출처다.
// 질의 넷을 한 묶음(Promise.all)으로 보낸다(Neon 왕복이 속도를 정한다). 캐시 태그는 회사 상세와 같은 `company:<slug>`.
import "server-only";
import { unstable_cache } from "next/cache";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { DISPLAY_TIME_ZONE } from "@/lib/format";
import { PLATFORM_ORDER } from "@/lib/platform";
import type { Platform } from "@/server/db/schema";

/** 보여 줄 장르, 함께한 회사 수. 넷째부터는 꼬리라 읽히지 않는다 */
const TOP_GENRES = 3;
const TOP_PARTNERS = 4;

export interface CompanyPartner {
  slug: string;
  name: string;
  /** 같이 낸 본편 수 */
  count: number;
}

export interface CompanyProfile {
  firstYear: number | null;
  lastYear: number | null;
  upcomingCount: number;
  developedCount: number;
  publishedCount: number;
  genres: string[];
  platforms: Platform[];
  partners: CompanyPartner[];
}

/** 이 회사의 본편과 맡은 일. 추가 콘텐츠, 에디션은 뺀다 — 세면 "게임 120개" 로 부풀어 보인다 */
function mine(slug: string): SQL {
  return sql`
    select distinct gc.game_id, gc.role from game_companies gc
    join companies c on c.id = gc.company_id
    join games g on g.id = gc.game_id and g.content_type = 'game'
    where c.slug = ${slug}`;
}

async function getCompanyProfileRaw(slug: string): Promise<CompanyProfile> {
  const db = getDb();
  const today = sql`(now() at time zone ${DISPLAY_TIME_ZONE})::date`;
  const [summary, genres, platforms, partners] = await Promise.all([
    db.execute(sql`
      with mine as (${mine(slug)})
      select
        (select extract(year from min(p.release_date))::int from game_platforms p where p.game_id in (select game_id from mine) and p.release_date <= ${today}) as first,
        (select extract(year from max(p.release_date))::int from game_platforms p where p.game_id in (select game_id from mine) and p.release_date <= ${today}) as last,
        (select count(distinct p.game_id)::int from game_platforms p where p.game_id in (select game_id from mine) and p.release_date > ${today}) as upcoming,
        (select count(distinct game_id)::int from mine where role = 'developer') as developed,
        (select count(distinct game_id)::int from mine where role = 'publisher') as published`),
    db.execute(sql`
      with mine as (${mine(slug)})
      select gn.name from game_genres gg join genres gn on gn.id = gg.genre_id
      where gg.game_id in (select game_id from mine)
      group by gn.name order by count(distinct gg.game_id) desc, gn.name limit ${TOP_GENRES}`),
    db.execute(sql`
      with mine as (${mine(slug)})
      select distinct p.platform::text as platform from game_platforms p where p.game_id in (select game_id from mine)`),
    // 같은 게임에 붙은 다른 회사. 자회사 표기 차이로 자기 자신과 같은 이름이면 뺀다
    db.execute(sql`
      with mine as (${mine(slug)})
      select c.slug, c.name_en as name, count(distinct gc.game_id)::int as count
      from game_companies gc join companies c on c.id = gc.company_id
      where gc.game_id in (select game_id from mine) and c.slug <> ${slug}
      group by c.slug, c.name_en order by count desc, c.name_en limit ${TOP_PARTNERS}`),
  ]);
  const s = (summary.rows as Array<{ first: number | null; last: number | null; upcoming: number; developed: number; published: number }>)[0];
  const seen = new Set((platforms.rows as Array<{ platform: Platform }>).map((r) => r.platform));
  return {
    firstYear: s?.first ?? null,
    lastYear: s?.last ?? null,
    upcomingCount: s?.upcoming ?? 0,
    developedCount: s?.developed ?? 0,
    publishedCount: s?.published ?? 0,
    genres: (genres.rows as Array<{ name: string }>).map((r) => r.name),
    // 화면 플랫폼 순서로 — 숨긴 플랫폼은 PLATFORM_ORDER 에 없어 빠진다
    platforms: PLATFORM_ORDER.filter((p) => seen.has(p)),
    partners: partners.rows as unknown as CompanyPartner[],
  };
}

export async function getCompanyProfile(slug: string): Promise<CompanyProfile> {
  const cached = unstable_cache(() => getCompanyProfileRaw(slug), [DTO_CACHE_VERSION, "company-profile", slug], {
    tags: [`company:${slug}`],
    revalidate: LIST_REVALIDATE_SECONDS,
  });
  return cached();
}
