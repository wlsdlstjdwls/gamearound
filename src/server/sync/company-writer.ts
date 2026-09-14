// companies, company_aliases, game_companies 쓰기.
// games.developer / publisher 자유 텍스트를 회사 엔티티로 승격하는 지점이다.
//
// 자동 확정 규칙이 이 파일의 핵심이다. 이름이 정확히 일치하는 회사가 위키데이터에 **딱 하나** 있을 때만 붙인다.
// 동명이인을 자동으로 붙이면 국가가 틀린 채로 회사 화면에 박히고, 크롤러는 그걸 고쳐주지 않는다.
// 판정이 안 서면 회사를 만들지 않고 별칭만 미해결로 남겨 관리자 검수 큐에 올린다.
import { and, eq, inArray } from "drizzle-orm";
import { companies, companyAliases, gameCompanies, type CompanyRole } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { CompanyInfo } from "@/server/adapters/types";
import { normalizeCompanyName, splitCompanyNames } from "@/lib/company-name";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { isLocked, type Ctx } from "./context";

/** 회사 slug 충돌 처리 — 게임 slug 와 같은 방식(base, base-Q번호) */
async function uniqueCompanySlug(db: Db, nameEn: string, externalId: string | null): Promise<string> {
  const base = slugify(nameEn);
  const candidates = [base, slugWithSuffix(base, (externalId ?? Date.now().toString()).toLowerCase())];
  for (const c of candidates) {
    const hit = await db.query.companies.findFirst({ where: eq(companies.slug, c), columns: { id: true } });
    if (!hit) return c;
  }
  return slugWithSuffix(base, Date.now());
}

/** 이미 아는 별칭이면 회사 id 를 돌려준다. 두 번째부터는 외부 질의를 하지 않는 지름길 */
export async function findCompanyByAlias(db: Db, rawName: string): Promise<string | null> {
  const norm = normalizeCompanyName(rawName);
  if (!norm) return null;
  const hit = await db.query.companyAliases.findFirst({
    where: eq(companyAliases.aliasNorm, norm),
    columns: { companyId: true },
  });
  return hit?.companyId ?? null;
}

/** 별칭을 회사에 매어 둔다. 이미 있으면 그대로 둔다 — 먼저 등록한 소스를 존중한다 */
async function rememberAlias(db: Db, companyId: string, rawName: string, source: Ctx["source"]): Promise<void> {
  const norm = normalizeCompanyName(rawName);
  if (!norm) return;
  await db
    .insert(companyAliases)
    .values({ companyId, aliasNorm: norm, aliasRaw: rawName, source })
    .onConflictDoNothing();
}

/**
 * 위키데이터가 준 회사를 저장하거나 갱신한다.
 * wikidataId 가 같으면 같은 회사다 — 이름이 바뀌어도 새 회사를 만들지 않는다.
 * 갱신은 다른 writer 와 같은 규칙이다: null 로 덮지 않고, 잠긴 필드는 건드리지 않고, 달라질 때만 UPDATE.
 */
export async function upsertCompany(ctx: Ctx, info: CompanyInfo): Promise<string> {
  const { db } = ctx;
  const existing = await db.query.companies.findFirst({ where: eq(companies.wikidataId, info.externalId) });

  if (!existing) {
    const slug = await uniqueCompanySlug(db, info.nameEn, info.externalId);
    ctx.changedCompanySlugs.add(slug);
    const [row] = await db
      .insert(companies)
      .values({
        slug,
        nameEn: info.nameEn,
        nameKo: info.nameKo,
        countryCode: info.countryCode,
        countryNameKo: info.countryNameKo,
        foundedAt: info.foundedAt,
        hqNameKo: info.hqNameKo,
        websiteUrl: info.websiteUrl,
        description: info.description,
        wikidataId: info.externalId,
        lastSyncedAt: ctx.now,
      })
      .returning({ id: companies.id });
    return row.id;
  }

  const set: Partial<typeof companies.$inferInsert> = {};
  const consider = <K extends keyof typeof companies.$inferInsert>(field: K, value: (typeof companies.$inferInsert)[K] | null | undefined) => {
    if (value === null || value === undefined) return;
    if (isLocked(ctx, "companies", existing.id, field)) return;
    if (existing[field as keyof typeof existing] !== value) set[field] = value;
  };
  consider("nameEn", info.nameEn);
  consider("nameKo", info.nameKo);
  consider("countryCode", info.countryCode);
  consider("countryNameKo", info.countryNameKo);
  consider("foundedAt", info.foundedAt);
  consider("hqNameKo", info.hqNameKo);
  consider("websiteUrl", info.websiteUrl);
  consider("description", info.description);

  // lastSyncedAt 은 값이 안 바뀌어도 갱신한다 — "언제 확인했는지"는 값과 별개의 정보이고,
  // 이걸 안 찍으면 같은 회사를 매 배치마다 다시 조회하게 된다.
  if (Object.keys(set).length > 0) ctx.changedCompanySlugs.add(existing.slug);
  await db.update(companies).set({ ...set, lastSyncedAt: ctx.now }).where(eq(companies.id, existing.id));
  return existing.id;
}

/** 게임과 회사를 역할로 잇는다. 같은 회사가 개발과 배급을 겸하면 행 2개가 된다 */
export async function linkGameCompany(db: Db, gameId: string, companyId: string, role: CompanyRole): Promise<void> {
  await db.insert(gameCompanies).values({ gameId, companyId, role }).onConflictDoNothing();
}

/**
 * 한 게임의 개발사, 배급사 문자열에서 나온 회사 이름들.
 * 스토어가 한 칸에 "A / B" 로 몰아넣는 경우가 있어 쪼갠 뒤 중복을 지운다.
 */
export function companyNamesOf(developer: string | null, publisher: string | null): Array<{ name: string; role: CompanyRole }> {
  const out: Array<{ name: string; role: CompanyRole }> = [];
  const seen = new Set<string>();
  const push = (raw: string | null, role: CompanyRole) => {
    if (!raw) return;
    for (const name of splitCompanyNames(raw)) {
      const key = `${role}:${normalizeCompanyName(name)}`;
      if (!key.endsWith(":") && !seen.has(key)) {
        seen.add(key);
        out.push({ name, role });
      }
    }
  };
  push(developer, "developer");
  push(publisher, "publisher");
  return out;
}

/**
 * 이미 해결된 회사만 게임에 이어 붙인다(외부 질의 없음).
 * 스토어 수집 중에 위키데이터를 때리면 가격 배치가 백과사전 응답 속도에 묶인다 —
 * 회사 조회는 주기가 다른 별도 배치(run-companies)에서만 한다.
 */
export async function linkKnownCompanies(ctx: Ctx, gameId: string, developer: string | null, publisher: string | null): Promise<void> {
  for (const { name, role } of companyNamesOf(developer, publisher)) {
    const companyId = await findCompanyByAlias(ctx.db, name);
    if (!companyId) continue;
    await linkGameCompany(ctx.db, gameId, companyId, role);
    // 회사 화면의 게임 목록이 달라지므로 그 회사 캐시도 깬다
    const c = await ctx.db.query.companies.findFirst({ where: eq(companies.id, companyId), columns: { slug: true } });
    if (c) ctx.changedCompanySlugs.add(c.slug);
  }
}

/** 회사를 확정했을 때 별칭 등록과 게임 연결을 한 번에 */
export async function attachCompany(
  ctx: Ctx,
  info: CompanyInfo,
  rawName: string,
  links: Array<{ gameId: string; role: CompanyRole }>,
): Promise<string> {
  const companyId = await upsertCompany(ctx, info);
  await rememberAlias(ctx.db, companyId, rawName, ctx.source);
  for (const { gameId, role } of links) await linkGameCompany(ctx.db, gameId, companyId, role);
  return companyId;
}

/** 관리자 병합 — A 의 별칭과 게임 연결을 B 로 옮기고 A 를 지운다 */
export async function mergeCompanies(db: Db, fromId: string, intoId: string): Promise<void> {
  if (fromId === intoId) return;
  await db.update(companyAliases).set({ companyId: intoId }).where(eq(companyAliases.companyId, fromId));
  const links = await db
    .select({ gameId: gameCompanies.gameId, role: gameCompanies.role })
    .from(gameCompanies)
    .where(eq(gameCompanies.companyId, fromId));
  for (const l of links) {
    await db.insert(gameCompanies).values({ gameId: l.gameId, companyId: intoId, role: l.role }).onConflictDoNothing();
  }
  await db.delete(gameCompanies).where(eq(gameCompanies.companyId, fromId));
  await db.delete(companies).where(eq(companies.id, fromId));
}

/** 어떤 회사에도 매이지 않은 별칭 후보 — 관리자 검수 큐의 재료 */
export async function unresolvedNames(db: Db, names: string[]): Promise<string[]> {
  const norms = Array.from(new Set(names.map(normalizeCompanyName).filter(Boolean)));
  if (norms.length === 0) return [];
  const known = await db
    .select({ aliasNorm: companyAliases.aliasNorm })
    .from(companyAliases)
    .where(inArray(companyAliases.aliasNorm, norms));
  const knownSet = new Set(known.map((k) => k.aliasNorm));
  return norms.filter((n) => !knownSet.has(n));
}

/** 이 게임에 이미 붙은 회사 역할 쌍 — 중복 연결 방지용 */
export async function existingLinks(db: Db, gameId: string): Promise<Set<string>> {
  const rows = await db
    .select({ companyId: gameCompanies.companyId, role: gameCompanies.role })
    .from(gameCompanies)
    .where(eq(gameCompanies.gameId, gameId));
  return new Set(rows.map((r) => `${r.companyId}:${r.role}`));
}

/** 특정 역할의 연결만 지운다(관리자 수정용) */
export async function unlinkGameCompany(db: Db, gameId: string, companyId: string, role: CompanyRole): Promise<void> {
  await db
    .delete(gameCompanies)
    .where(and(eq(gameCompanies.gameId, gameId), eq(gameCompanies.companyId, companyId), eq(gameCompanies.role, role)));
}
