// 위키데이터에 없는 회사를 스토어가 준 이름만으로 세운다(2026-11-03 사용자 확정).
//
// 왜: 회사 엔티티를 위키데이터 항목이 있을 때만 만들었더니, 작은 인디 퍼블리셔 9천여 이름이 "못 붙임" 으로 쌓여
// 회사 없는 게임이 1만 5천 개였다(2026-11-03 실측). 그 이름들은 위키데이터에 항목 자체가 없어 30일마다 다시 물어도 그대로다.
// 이름만 있는 회사라도 세우면 "이 회사의 다른 게임" 으로 이어지고, 회사 화면이 생긴다.
//
// 무엇을 하지 않나: 같은 이름 회사가 여럿이라 못 좁힌(ambiguous) 이름은 세우지 않는다 — 위키데이터에 그 회사가 있을 수 있어
// 이름만으로 세우면 나중에 같은 회사가 둘이 된다. 그 이름은 관리자 검수 큐에 남는다.
//
// 나중에 위키데이터에 생기면: 이름만 있는 회사도 COMPANY_REFRESH_DAYS 마다 재조회에 오르고, 찾으면
// company-writer 의 attachCompany 가 새 회사를 만들지 않고 이 행에 Q번호와 정보를 채운다(adoptNameOnlyCompany).
import { inArray } from "drizzle-orm";
import { companies, companyAliases, gameCompanies, type CompanyRole } from "@/server/db/schema";
import { createdBy } from "@/server/db/audit";
import { normalizeCompanyName } from "@/lib/company-name";
import { slugify, slugWithSuffix } from "@/lib/slug";
import type { Ctx } from "./context";

/** 한 문장에 넣을 행 수. Neon HTTP 한 요청의 파라미터가 너무 많아지지 않게 끊는다 */
const WRITE_CHUNK = 500;

export interface NameOnlyTarget {
  rawName: string;
  links: Array<{ gameId: string; role: CompanyRole; slug?: string }>;
}

/**
 * 이름마다 겹치지 않는 slug 를 정한다(순수 함수). 이미 쓰는 slug 와 이 묶음 안의 slug 를 모두 피한다.
 * 겹치면 정규화 이름의 순번을 꼬리로 붙인다 — 위키데이터 회사의 꼬리(Q번호)와 섞이지 않게 숫자만 쓴다.
 */
export function planNameOnlySlugs(names: readonly string[], taken: ReadonlySet<string>): string[] {
  const used = new Set(taken);
  return names.map((name) => {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = slugWithSuffix(base, n);
    used.add(slug);
    return slug;
  });
}

/**
 * 이름만으로 회사를 세우고 별칭, 게임 연결까지 한 번에 쓴다. 세운 회사 수를 돌려준다.
 * 이미 별칭이 있는 이름은 건너뛴다(같은 회차에 다른 경로가 먼저 세웠을 수 있다).
 */
export async function createNameOnlyCompanies(ctx: Ctx, targets: readonly NameOnlyTarget[]): Promise<number> {
  const { db } = ctx;
  const actor = createdBy(`crawler:${ctx.source}`);
  const byNorm = new Map<string, NameOnlyTarget>();
  for (const t of targets) {
    const norm = normalizeCompanyName(t.rawName);
    if (norm && !byNorm.has(norm)) byNorm.set(norm, t);
  }
  let created = 0;
  const entries = [...byNorm.entries()];
  for (let i = 0; i < entries.length; i += WRITE_CHUNK) {
    const chunk = entries.slice(i, i + WRITE_CHUNK);
    const known = await db
      .select({ aliasNorm: companyAliases.aliasNorm })
      .from(companyAliases)
      .where(inArray(companyAliases.aliasNorm, chunk.map(([n]) => n)));
    const knownSet = new Set(known.map((k) => k.aliasNorm));
    const todo = chunk.filter(([n]) => !knownSet.has(n));
    if (todo.length === 0) continue;

    const bases = todo.map(([, t]) => slugify(t.rawName));
    const takenRows = await db
      .select({ slug: companies.slug })
      .from(companies)
      .where(inArray(companies.slug, [...new Set(bases)]));
    // 꼬리 붙은 slug(base-2 …)도 이미 있을 수 있다 — 겹침이 나면 insert 가 실패하므로 꼬리 후보까지 미리 읽는다
    const suffixed = await db
      .select({ slug: companies.slug })
      .from(companies)
      .where(inArray(companies.slug, bases.flatMap((b) => [2, 3, 4, 5].map((n) => slugWithSuffix(b, n)))));
    const slugs = planNameOnlySlugs(todo.map(([, t]) => t.rawName), new Set([...takenRows, ...suffixed].map((r) => r.slug)));

    const inserted = await db
      .insert(companies)
      .values(todo.map(([, t], j) => ({ slug: slugs[j], nameEn: t.rawName, lastSyncedAt: ctx.now, ...actor })))
      .onConflictDoNothing()
      .returning({ id: companies.id, slug: companies.slug });
    const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));

    const aliases: Array<typeof companyAliases.$inferInsert> = [];
    const links: Array<typeof gameCompanies.$inferInsert> = [];
    todo.forEach(([norm, t], j) => {
      const companyId = idBySlug.get(slugs[j]);
      if (!companyId) return;
      created++;
      ctx.changedCompanySlugs.add(slugs[j]);
      aliases.push({ companyId, aliasNorm: norm, aliasRaw: t.rawName, source: ctx.source, ...actor });
      for (const l of t.links) {
        links.push({ gameId: l.gameId, companyId, role: l.role, ...actor });
        if (l.slug) ctx.changedSlugs.add(l.slug);
      }
    });
    if (aliases.length > 0) await db.insert(companyAliases).values(aliases).onConflictDoNothing();
    for (let k = 0; k < links.length; k += WRITE_CHUNK) {
      await db.insert(gameCompanies).values(links.slice(k, k + WRITE_CHUNK)).onConflictDoNothing();
    }
  }
  return created;
}
