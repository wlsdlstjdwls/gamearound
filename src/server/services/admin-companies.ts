// 관리자 회사 검수 서비스 — 기획서 F1, F2 의 사람 손이 필요한 자리.
//
// 자동 확정은 이름이 정확히 일치하는 회사가 위키데이터에 딱 하나일 때만 한다(company-writer).
// 그래서 "후보가 없다", "후보가 둘 이상이다" 두 경우가 남고, 그 이름들이 이 큐에 쌓인다.
// 화면은 쌓인 이름과 그 이름을 쓰는 게임 수를 보여 주고, 다시 조회할 기회를 준다 —
// 위키데이터는 계속 자라므로 어제 없던 회사가 오늘 생겨 있을 수 있다.
import { getDb } from "@/server/db/client";
import { getCompanyAdapter } from "@/server/adapters";
import { errorMessage } from "@/lib/errors";
import { attachCompany } from "@/server/sync/company-writer";
import { listCompanyTargets, listPendingCompanyNames } from "@/server/sync/run-companies";
import { loadLockedFields, type Ctx } from "@/server/sync/context";

/** 한 화면에 띄울 검수 큐 길이. 더 길면 사람이 훑지 못한다 */
export const PENDING_COMPANIES_LIMIT = 60;

export type PendingCompany = { name: string; gameCount: number };

export async function listPendingCompanies(limit: number = PENDING_COMPANIES_LIMIT): Promise<PendingCompany[]> {
  return listPendingCompanyNames(getDb(), limit);
}

/** 관리자 조회용 최소 컨텍스트 — 수집 배치가 아니므로 집계(processed 등)는 쓰고 버린다 */
async function adminCtx(): Promise<Ctx> {
  const db = getDb();
  return {
    db,
    source: "wikidata",
    now: new Date(),
    locks: await loadLockedFields(db),
    processed: 0,
    failed: 0,
    errors: [],
    changedSlugs: new Set(),
    changedCompanySlugs: new Set(),
    priceChanges: [],
    droppedPrices: 0,
  };
}

export type ResolveResult =
  | { ok: true; message: string; companySlugs: string[] }
  | { ok: false; message: string };

/**
 * 이름 하나를 위키데이터에서 다시 조회해 확정되면 붙인다.
 * 확정 규칙은 배치와 같다 — 여기서 사람이 누른다고 모호한 후보를 골라 주지는 않는다.
 * 잘못 붙인 회사는 화면에 그대로 박히고 크롤러가 고쳐 주지 않기 때문이다.
 */
export async function resolveCompanyName(rawName: string): Promise<ResolveResult> {
  const name = rawName.trim();
  if (!name) return { ok: false, message: "이름이 비어 있어요" };

  const ctx = await adminCtx();
  const adapter = getCompanyAdapter("wikidata");
  try {
    const info = await adapter.lookup(name);
    if (!info) return { ok: false, message: "위키데이터에서 이 이름으로 회사 하나를 확정하지 못했어요" };

    // 이 이름을 쓰는 게임을 모아 한 번에 연결한다 — 큐에 뜬 이름은 여러 게임에 걸려 있다
    const targets = await listCompanyTargets(ctx.db, PENDING_COMPANIES_LIMIT);
    const links = targets.find((t) => t.rawName === name)?.links ?? [];
    await attachCompany(ctx, info, name, links);
    return {
      ok: true,
      message: `${info.nameKo ?? info.nameEn} 로 붙였어요 (게임 ${links.length}개)`,
      companySlugs: Array.from(ctx.changedCompanySlugs),
    };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
