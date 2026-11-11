// 본편이 알려준 공식 DLC 를, 같은 본편 아래 이미 있는 **공식 ID 없는 자식**에 잇는다 — 새 게임을 만들기 전에.
//
// 왜(2026-11-11 실측): 2026-09-15 psprices 병합이 자식 게임을 만들며 공식 상품 ID 를 주지 못했다(store_external_id 가 "psprices:숫자").
// dlc-writer 는 "이 소스에 등록된 외부 ID 인가" 만 보고 모르면 새 게임을 만든다. 그래서 같은 DLC 가 본편 아래 둘이 됐다 —
// 같은 제목의 자식 쌍이 2,653건이고, 한쪽은 링크도 최신 값도 없는 이름표다. 이 단계가 그 짝을 미리 찾아 새로 만들지 않고 잇는다.
// 이어 붙이면 ref 가 생겨 다음 회차부터 일반 갱신 경로(listStoreTargets)를 탄다.
//
// 판정은 일부러 좁다:
// - 같은 맨 위 본편 아래, 이 소스 기기에 psprices 행을 가진 자식만 본다. 다른 본편의 동명 DLC 는 후보가 아니다.
// - 제목은 글자와 숫자만 남겨 **똑같을 때만** 잇는다(유사도 아님). DLC 이름은 "Season Pass" 와 "Season Pass 2" 처럼 한 글자로 갈린다.
// - 한 스냅샷에 후보가 둘 이상이거나, 한 자식을 두 스냅샷이 원하면 잇지 않는다 — 그때는 예전처럼 새로 만든다.
//   잘못 이으면 다른 DLC 의 값이 그 자식에 붙는다. 새로 만드는 쪽의 잘못은 중복 한 줄이라 더 작다.
// - 관리자 검수 중(pending)이거나 이미 매칭된(auto, manual) 자식은 건드리지 않는다.
import { and, inArray, sql } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, games } from "@/server/db/schema";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { normalizeForSearch } from "@/lib/slug";
import { SOURCE_PLATFORMS } from "./constants";
import type { Ctx } from "./context";

/** 공식 ID 를 기다리는 자식 하나 */
export interface OrphanChild {
  id: string;
  slug: string;
  parentId: string;
  titles: string[];
}

/** 잇기를 판정할 새 DLC 하나. parentId 는 맨 위 본편(parent-root) */
export interface AdoptCandidate {
  externalId: string;
  parentId: string;
  titles: string[];
}

/** 이 길이보다 짧은 열쇠는 쓰지 않는다 — 한두 글자는 우연히 같기 쉽다 */
const MIN_KEY_CHARS = 2;

function keysOf(titles: readonly string[]): string[] {
  return [...new Set(titles.map(normalizeForSearch).filter((k) => k.length >= MIN_KEY_CHARS))];
}

/** 새 DLC 외부 ID → 이을 자식. 양쪽 모두 하나뿐일 때만 짝을 짓는다. 순수 함수라 테스트로 지킨다 */
export function pickAdoptions(candidates: readonly AdoptCandidate[], orphans: readonly OrphanChild[]): Map<string, OrphanChild> {
  const orphansByKey = new Map<string, Set<OrphanChild>>();
  for (const o of orphans) {
    for (const k of keysOf(o.titles)) {
      const key = `${o.parentId}\u0000${k}`;
      const set = orphansByKey.get(key) ?? new Set<OrphanChild>();
      set.add(o);
      orphansByKey.set(key, set);
    }
  }
  const wanted = new Map<string, OrphanChild>();
  const claims = new Map<string, number>();
  for (const c of candidates) {
    const hits = new Set<OrphanChild>();
    for (const k of keysOf(c.titles)) for (const o of orphansByKey.get(`${c.parentId}\u0000${k}`) ?? []) hits.add(o);
    if (hits.size !== 1) continue;
    const [orphan] = hits;
    wanted.set(c.externalId, orphan);
    claims.set(orphan.id, (claims.get(orphan.id) ?? 0) + 1);
  }
  for (const [externalId, orphan] of wanted) if ((claims.get(orphan.id) ?? 0) > 1) wanted.delete(externalId);
  return wanted;
}

/** 스냅샷이 말하는 제목들(한국어, 영문). 둘 다 없으면 잇기 판정에서 빠진다 */
export function snapshotTitles(snapshot: StoreSnapshot): string[] {
  return [snapshot.meta?.titleKo, snapshot.meta?.titleEn].filter((t): t is string => !!t);
}

/** 이 본편들 아래, 이 소스 기기에 psprices 행만 있고 이 소스 매칭이 없는 자식 */
export async function loadOrphanChildren(ctx: Ctx, source: StoreSource, parentIds: readonly string[]): Promise<OrphanChild[]> {
  if (parentIds.length === 0) return [];
  const platforms = SOURCE_PLATFORMS[source];
  const rows = await ctx.db
    .select({ id: games.id, slug: games.slug, parentId: games.parentGameId, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(games)
    .where(
      and(
        inArray(games.parentGameId, [...parentIds]),
        sql`exists (select 1 from ${gamePlatforms} gp where gp.game_id = ${games.id} and gp.store_external_id like 'psprices:%'
          and gp.platform::text in (${sql.join(platforms.map((p) => sql`${p}`), sql`, `)}))`,
        sql`not exists (select 1 from ${gameSourceRefs} r where r.game_id = ${games.id} and r.source = ${source}
          and r.matched_by in ('auto', 'manual', 'pending'))`,
      ),
    );
  return rows.map((r) => ({ id: r.id, slug: r.slug, parentId: r.parentId!, titles: [r.titleKo, r.titleEn].filter((t): t is string => !!t) }));
}

/** 자식에 이 소스 ref 를 단다. 예전에 "못 찾음(none)" 으로 남긴 ref 가 있으면 그 자리를 쓴다(PK 가 게임, 소스) */
export async function attachRef(ctx: Ctx, source: StoreSource, gameId: string, snapshot: StoreSnapshot, matchedTitle: string | null): Promise<void> {
  const values = {
    externalId: snapshot.storeExternalId,
    url: snapshot.storeUrl,
    matchedBy: "auto",
    confidence: "1.00",
    matchedTitle,
    checkedAt: ctx.now,
    missingStreak: 0,
    missingAt: null,
  };
  await ctx.db
    .insert(gameSourceRefs)
    .values({ gameId, source, ...values })
    .onConflictDoUpdate({ target: [gameSourceRefs.gameId, gameSourceRefs.source], set: values });
}
