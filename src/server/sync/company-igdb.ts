// 위키데이터에 없는 회사(이름만으로 세운 회사)를 IGDB 로 채운다 — 나라, 설립일, 웹사이트, 소개, 로고(2026-11-03 사용자 지시).
//
// 왜 위키데이터 회사는 안 건드리나: 위키데이터가 이미 나라, 설립일을 준 회사다. 두 출처가 다르게 말하면 어느 쪽이 맞는지
// 판정할 근거가 없다 — 빈 회사만 채운다.
// 고르는 규칙은 adapters/igdb/parse 의 pickCompany(이름 같고 게임 하나 이상 겹치는 후보가 하나).
// 못 찾아도 igdb_checked_at 을 찍는다 — 안 찍으면 같은 이름을 매 회차 맨 앞에서 다시 묻는다.
// 쓰기 규칙은 다른 writer 와 같다(§7): null 로 덮지 않고, 잠긴 칸은 건드리지 않는다.
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { companies, gameCompanies, games } from "@/server/db/schema";
import { IGDB_REQUEST_GAP_MS, igdbConfigured, openIgdbSession, pickCompany, toCompanyInfo } from "@/server/adapters/igdb";
import { sleep } from "@/lib/async";
import { COMPANY_REFRESH_DAYS } from "./constants";
import { isLocked, recordError, type Ctx } from "./context";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 우리 쪽 게임 제목을 몇 개까지 대 볼지. 겹침 하나면 되니 많을 필요가 없다 */
const OUR_TITLES_MAX = 60;

export interface IgdbEnrichResult {
  checked: number;
  filled: number;
}

/** 위키데이터 없는 회사 중 IGDB 에 아직 안 물었거나 오래된 것. 게임이 많은 회사부터 */
async function listTargets(ctx: Ctx, limit: number) {
  const cutoff = new Date(ctx.now.getTime() - COMPANY_REFRESH_DAYS * DAY_MS);
  return ctx.db
    .select({ id: companies.id, slug: companies.slug, nameEn: companies.nameEn, igdbId: companies.igdbId })
    .from(companies)
    .leftJoin(gameCompanies, eq(gameCompanies.companyId, companies.id))
    .where(and(isNull(companies.wikidataId), or(isNull(companies.igdbCheckedAt), lt(companies.igdbCheckedAt, cutoff))))
    .groupBy(companies.id)
    .orderBy(sql`${companies.igdbCheckedAt} asc nulls first`, sql`count(${gameCompanies.gameId}) desc`)
    .limit(limit);
}

async function ourTitles(ctx: Ctx, companyId: string): Promise<string[]> {
  const rows = await ctx.db
    .selectDistinct({ title: games.titleEn })
    .from(gameCompanies)
    .innerJoin(games, eq(games.id, gameCompanies.gameId))
    .where(eq(gameCompanies.companyId, companyId))
    .limit(OUR_TITLES_MAX);
  return rows.map((r) => r.title);
}

export async function enrichCompaniesFromIgdb(ctx: Ctx, limit: number, deadline: number): Promise<IgdbEnrichResult> {
  const result: IgdbEnrichResult = { checked: 0, filled: 0 };
  if (!igdbConfigured() || limit <= 0) return result;
  const session = await openIgdbSession();
  for (const target of await listTargets(ctx, limit)) {
    if (Date.now() > deadline) break;
    try {
      const [candidates, titles] = await Promise.all([session.searchCompanies(target.nameEn), ourTitles(ctx, target.id)]);
      const picked = pickCompany(target.nameEn, titles, candidates);
      const set: Partial<typeof companies.$inferInsert> = { igdbCheckedAt: ctx.now };
      if (picked) {
        const info = toCompanyInfo(picked);
        // 다른 회사가 이미 같은 IGDB 번호를 쥐었으면(표기만 다른 같은 회사) 번호는 넘기고 정보만 채우지 않는다 — 합치기는 사람 몫
        const [owner] = await ctx.db.select({ id: companies.id }).from(companies).where(eq(companies.igdbId, info.igdbId)).limit(1);
        if (!owner || owner.id === target.id) {
          set.igdbId = info.igdbId;
          for (const field of ["countryCode", "countryNameKo", "foundedAt", "websiteUrl", "description", "logoUrl"] as const) {
            const value = info[field];
            if (value !== null && !isLocked(ctx, "companies", target.id, field)) set[field] = value;
          }
          result.filled++;
          ctx.changedCompanySlugs.add(target.slug);
        }
      }
      await ctx.db.update(companies).set(set).where(eq(companies.id, target.id));
      result.checked++;
    } catch (e) {
      recordError(ctx, `igdb:${target.nameEn}`, e);
    }
    await sleep(IGDB_REQUEST_GAP_MS);
  }
  return result;
}
