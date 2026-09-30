// 스토어 수집 결과를 DB 에 반영하는 단계 — 배치 경로.
//
// 왜 배치인가: 예전에는 게임 한 건마다 조회 1~2회, 쓰기 1~3회를 순차로 왕복했다. Neon HTTP 는
// 왕복 1회가 200~350ms 라 게임당 0.87초가 나왔고(실측), 그게 하루 수집량의 상한이었다.
// 같은 문장을 db.batch 로 묶으면 왕복이 1회로 접힌다 — 20문장 기준 4.4초에서 0.25초였다(2026-09-14 실측).
//
// 규칙은 단건 경로와 똑같다(planPlatform, planGameMeta 를 그대로 쓴다). 이 파일이 더하는 것은
// "언제 읽고 언제 묶어 보낼지" 뿐이다.
//
// 실패 격리: 배치 하나가 통째로 실패하면 그 묶음만 다시 한 문장씩 보낸다(§7 — 한 건의 실패가
// 배치 전체를 멈추면 안 된다). 묶음이 깨지는 일은 드물고, 드문 만큼 느려도 된다.
import { and, eq, inArray } from "drizzle-orm";
import { gameCompanies, gamePlatforms, gameSourceRefs, games, priceSnapshots, HOME_REGION } from "@/server/db/schema";
import type { StoreSource } from "@/server/adapters";
import type { StoreSnapshot } from "@/server/adapters/types";
import { normalizeCompanyName } from "@/lib/company-name";
import { errorMessage } from "@/lib/errors";
import { MATCHED_FOR_SYNC, WRITE_BATCH_SIZE } from "./constants";
import { correctedContentType } from "./content-type-fix";
import { isLocked, recordError, type Ctx } from "./context";
import { companyNamesOf, findCompaniesByAliases } from "./company-writer";
import { createGameFromSnapshot, isTitleEnRecovery, planGameMeta, planSlugRename, type GameRow } from "./game-writer";
import { planPlatform, type PlatformPlan, type PlatformRow } from "./platform-writer";
import { gamesByTitleCode, gamesWithRef, ignoreDiscovery, loadGameTitles, type StoreTarget } from "./store-targets";
import { findGameByTitle } from "./match";
import { loadRootParents } from "./parent-root";
import { syncSnapshotSubscriptions } from "./subscription-writer";
import { noteTouched, PLATFORM_ROW_FIELD } from "./touched";

/** 수집 결과 1건 — 대상과 그 대상에서 받아온 스냅샷 */
export interface Fetched {
  target: StoreTarget;
  snapshot: StoreSnapshot;
}

/** 반영이 끝난 1건. DLC 등록 단계가 이 목록을 받는다 */
export interface Applied {
  gameId: string;
  slug: string;
  snapshot: StoreSnapshot;
}

/** drizzle 문장은 thenable 이라 같은 객체를 배치로도, 단건으로도 보낼 수 있다 */
export type Statement = PromiseLike<unknown>;

/**
 * 문장들을 WRITE_BATCH_SIZE 단위로 묶어 보낸다.
 * 묶음이 실패하면 그 묶음만 한 문장씩 다시 보내 어느 문장이 문제인지 좁힌다.
 */
export async function runStatements(ctx: Ctx, label: string, statements: Statement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += WRITE_BATCH_SIZE) {
    const chunk = statements.slice(i, i + WRITE_BATCH_SIZE);
    if (chunk.length === 0) continue;
    try {
      await ctx.db.batch(chunk as unknown as Parameters<Ctx["db"]["batch"]>[0]);
    } catch (e) {
      console.warn(`[sync:${ctx.source}] ${label} 배치 실패 — 한 문장씩 재시도: ${errorMessage(e)}`);
      for (const [j, st] of chunk.entries()) {
        try {
          await st;
        } catch (inner) {
          recordError(ctx, `${label}:${i + j}`, inner);
        }
      }
    }
  }
}

/** 대상 게임들의 기존 행을 한 번에 읽어 둔다 — 계획 단계는 여기서 읽은 것만 본다 */
async function loadExisting(
  ctx: Ctx,
  gameIds: string[],
): Promise<{ gameById: Map<string, GameRow>; platformsByGame: Map<string, PlatformRow[]> }> {
  if (gameIds.length === 0) return { gameById: new Map(), platformsByGame: new Map() };
  const [gameRows, platformRows] = await ctx.db.batch([
    ctx.db.select().from(games).where(inArray(games.id, gameIds)),
    ctx.db.select().from(gamePlatforms).where(inArray(gamePlatforms.gameId, gameIds)),
  ]);
  const platformsByGame = new Map<string, PlatformRow[]>();
  for (const row of platformRows) {
    const list = platformsByGame.get(row.gameId);
    if (list) list.push(row);
    else platformsByGame.set(row.gameId, [row]);
  }
  return { gameById: new Map(gameRows.map((g) => [g.id, g])), platformsByGame };
}

/**
 * 부모 후보를 external_id 마다 하나로 좁힌다.
 *
 * **한 external_id 가 게임 한 행을 가리킨다고 가정하지 않는다.** PlayStation 의 콘셉트 번호는
 * 제품군 단위라 별개 게임이 한 번호를 나눠 갖는다(2026-09-18 실측: psstore 73개 번호, 그 아래 자식 1,071건).
 * 전에는 조회 순서대로 맨 뒤 행이 부모가 돼서 "Call of Duty League - FaZe Vegas Team Pack" 이
 * "Black Ops 7 Cross-Gen Bundle" 밑에 붙었다.
 *
 * 후보가 여럿이면 본편(`game`) 하나만 고르고, 그래도 안 가려지면 **붙이지 않는다** —
 * 부모 없는 DLC 는 목록에 안 뜰 뿐 되살릴 수 있지만, 엉뚱한 부모는 화면에 그대로 거짓말로 나간다.
 *
 * 확정 ref(auto, manual)만 후보다. 미매칭 기록(none)과 검수 대기(pending)는 "이 번호가 이 행이 아닐 수 있다"
 * 는 표시다 — 2026-09-25 실측으로 THE FINALS 콘셉트 번호를 none 으로 쥔 DLC 껍데기 둘이 DLC 30개를 거느렸다.
 */
export function resolveParents(
  refs: Array<{ externalId: string; gameId: string; contentType: GameRow["contentType"]; matchedBy: string }>,
): Map<string, string> {
  const candidates = new Map<string, typeof refs>();
  for (const r of refs) {
    if (!(MATCHED_FOR_SYNC as readonly string[]).includes(r.matchedBy)) continue;
    const list = candidates.get(r.externalId);
    if (list) list.push(r);
    else candidates.set(r.externalId, [r]);
  }
  const out = new Map<string, string>();
  for (const [externalId, list] of candidates) {
    const pick = list.length === 1 ? list : list.filter((c) => c.contentType === "game");
    if (pick.length === 1) out.set(externalId, pick[0].gameId);
  }
  return out;
}

/**
 * DLC 가 스스로 알려준 본편을 이어 붙인다(steam 의 fullgame / related_items).
 * 배치 경로에서는 부모 ref 를 한 번에 조회한다 — 건마다 물으면 DLC 가 많은 배치에서 왕복이 배로 는다.
 */
async function planParentLinks(
  ctx: Ctx,
  source: StoreSource,
  items: Array<{ gameId: string; snapshot: StoreSnapshot }>,
  gameById: Map<string, GameRow>,
): Promise<Statement[]> {
  const pending = items.filter((it) => {
    if (it.snapshot.contentType !== "dlc" || !it.snapshot.parentExternalId) return false;
    const cur = gameById.get(it.gameId);
    // 이미 DLC 로 확정돼 부모까지 붙어 있으면 다시 쓰지 않는다
    return Boolean(cur) && !(cur!.contentType === "dlc" && cur!.parentGameId);
  });
  if (pending.length === 0) return [];

  const parentIds = Array.from(new Set(pending.map((p) => p.snapshot.parentExternalId as string)));
  const refs = await ctx.db
    .select({ externalId: gameSourceRefs.externalId, gameId: gameSourceRefs.gameId, contentType: games.contentType, matchedBy: gameSourceRefs.matchedBy })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, parentIds)));

  const parentByExternalId = resolveParents(refs);
  // 스토어가 가리킨 행이 우리 쪽에선 에디션일 수 있다 — 맨 위 본편에 붙인다(parent-root)
  const rootOf = await loadRootParents(ctx, Array.from(new Set(parentByExternalId.values())));

  const out: Statement[] = [];
  for (const { gameId, snapshot } of pending) {
    const found = parentByExternalId.get(snapshot.parentExternalId as string);
    const parentGameId = found && (rootOf.get(found) ?? found);
    if (!parentGameId || parentGameId === gameId) continue;
    out.push(
      ctx.db.update(games).set({ contentType: "dlc", parentGameId, updatedAt: ctx.now }).where(eq(games.id, gameId)),
    );
  }
  return out;
}

/**
 * 이미 아는 회사만 게임에 잇는다(외부 질의 없음).
 * 별칭 조회를 한 번으로 접고 연결 INSERT 도 한 문장으로 모은다.
 */
async function planCompanyLinks(ctx: Ctx, items: Array<{ gameId: string; snapshot: StoreSnapshot }>): Promise<Statement[]> {
  const byGame = items
    .filter((it) => it.snapshot.meta)
    .map((it) => ({ gameId: it.gameId, names: companyNamesOf(it.snapshot.meta?.developer ?? null, it.snapshot.meta?.publisher ?? null) }))
    .filter((g) => g.names.length > 0);
  if (byGame.length === 0) return [];

  const aliasMap = await findCompaniesByAliases(ctx.db, byGame.flatMap((g) => g.names.map((n) => n.name)));
  if (aliasMap.size === 0) return [];

  const rows: Array<typeof gameCompanies.$inferInsert> = [];
  const seen = new Set<string>();
  for (const { gameId, names } of byGame) {
    for (const { name, role } of names) {
      const hit = aliasMap.get(normalizeCompanyName(name));
      if (!hit) continue;
      const key = `${gameId}:${hit.companyId}:${role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ gameId, companyId: hit.companyId, role });
      // 회사 화면의 게임 목록이 달라지므로 그 회사 캐시도 깬다
      ctx.changedCompanySlugs.add(hit.slug);
    }
  }
  return rows.length === 0 ? [] : [ctx.db.insert(gameCompanies).values(rows).onConflictDoNothing()];
}

/** 한 문장이 너무 길어지지 않게 값 배열을 잘라 넣는다. 한 조각이 실패해도 나머지 조각은 계속 간다 */
async function insertChunked<V, R>(
  ctx: Ctx,
  label: string,
  values: V[],
  run: (chunk: V[]) => PromiseLike<R[]>,
): Promise<Array<R | undefined>> {
  const out: Array<R | undefined> = [];
  for (let i = 0; i < values.length; i += WRITE_BATCH_SIZE) {
    const chunk = values.slice(i, i + WRITE_BATCH_SIZE);
    try {
      const rows = await run(chunk);
      // RETURNING 은 넣은 순서대로 돌아온다 — 순서로 짝을 맞춘다
      for (let j = 0; j < chunk.length; j++) out.push(rows[j]);
    } catch (e) {
      recordError(ctx, `${label}:${i}`, e);
      for (let j = 0; j < chunk.length; j++) out.push(undefined);
    }
  }
  return out;
}

/** 새 플랫폼 행을 넣고, 돌려받은 id 로 가격 스냅샷까지 잇는다 */
async function insertNewPlatforms(
  ctx: Ctx,
  plans: Array<{ slug: string; plan: Extract<PlatformPlan, { kind: "insert" }> }>,
): Promise<Array<string | undefined>> {
  if (plans.length === 0) return [];
  const inserted = await insertChunked(ctx, "platform-insert", plans, (chunk) =>
    ctx.db.insert(gamePlatforms).values(chunk.map((p) => p.plan.values)).returning({ id: gamePlatforms.id }),
  );
  const drafts = plans
    .map((p, i) => ({ id: inserted[i]?.id, draft: p.plan.snapshot, slug: p.slug }))
    .filter((d): d is { id: string; draft: NonNullable<typeof d.draft>; slug: string } => Boolean(d.id));
  for (const d of drafts) ctx.changedSlugs.add(d.slug);

  const newIds = inserted.map((r) => r?.id);
  const withPrice = drafts.filter((d) => d.draft !== null);
  if (withPrice.length === 0) return newIds;
  const snaps = await insertChunked(ctx, "price-snapshot", withPrice, (chunk) =>
    ctx.db
      .insert(priceSnapshots)
      .values(chunk.map((d) => ({ ...d.draft, gamePlatformId: d.id })))
      .returning({ id: priceSnapshots.id, gamePlatformId: priceSnapshots.gamePlatformId }),
  );
  for (const [i, s] of snaps.entries()) {
    if (s) ctx.priceChanges.push({ gamePlatformId: s.gamePlatformId, snapshotId: s.id, previousPrice: null, newPrice: withPrice[i].draft.price });
  }
  return newIds;
}

/** 기존 플랫폼 행 갱신 + 가격이 바뀐 행만 스냅샷 */
async function updateExistingPlatforms(
  ctx: Ctx,
  plans: Array<{ slug: string; plan: Extract<PlatformPlan, { kind: "update" }> }>,
): Promise<void> {
  if (plans.length === 0) return;
  await runStatements(
    ctx,
    "platform",
    plans.map(({ plan }) => ctx.db.update(gamePlatforms).set(plan.set).where(eq(gamePlatforms.id, plan.id))),
  );
  for (const { slug, plan } of plans) if (plan.changed) ctx.changedSlugs.add(slug);

  const withSnapshot = plans.filter(({ plan }) => plan.snapshot !== null);
  if (withSnapshot.length === 0) return;
  const snaps = await insertChunked(ctx, "price-snapshot", withSnapshot, (chunk) =>
    ctx.db
      .insert(priceSnapshots)
      .values(chunk.map(({ plan }) => ({ ...plan.snapshot!, gamePlatformId: plan.id })))
      .returning({ id: priceSnapshots.id, gamePlatformId: priceSnapshots.gamePlatformId }),
  );
  for (const [i, s] of snaps.entries()) {
    const { plan } = withSnapshot[i];
    if (s && plan.priceChange) ctx.priceChanges.push({ gamePlatformId: plan.id, snapshotId: s.id, ...plan.priceChange });
  }
}

/**
 * 발견 목록에서만 오는 이미지를 스냅샷에 얹는다.
 * PlayStation 은 콘셉트 상세에 이미지가 없어(질의가 화이트리스트라 필드를 늘릴 수도 없다)
 * 이 단계에서 얹지 않으면 PS 단독 게임은 커버가 영영 빈다.
 * 상세가 준 값이 있으면 그쪽이 이긴다 — 발견 목록은 대체재일 뿐이다.
 */
export function withDiscoveredMedia(snapshot: StoreSnapshot, target: StoreTarget): StoreSnapshot {
  // 가격만 주는 배치(nintendo_jp)는 meta 가 아예 없다 — 그 소스에서는 발견 목록이 준 마스터가 유일한 근거다.
  // 상세가 준 값이 있으면 언제나 그쪽이 이긴다. 발견 목록은 대체재일 뿐이다.
  const meta = snapshot.meta ?? target.meta;
  if (!meta) return snapshot;

  const coverUrl = meta.coverUrl ?? target.coverUrl ?? null;
  const portraitUrl = meta.portraitUrl ?? target.portraitUrl ?? null;
  // 상세가 없어 발견 목록의 마스터를 쓸 때는 기기, 발매일도 그쪽 값을 따른다(가격 API 는 둘 다 모른다)
  const platform = snapshot.meta ? snapshot.platform : target.platform ?? snapshot.platform;
  const releaseDate = snapshot.releaseDate ?? target.releaseDate ?? null;
  const titleCode = snapshot.titleCode ?? target.titleCode ?? null;

  const sameMedia = coverUrl === (meta.coverUrl ?? null) && portraitUrl === (meta.portraitUrl ?? null);
  const sameRest =
    meta === snapshot.meta &&
    platform === snapshot.platform &&
    releaseDate === (snapshot.releaseDate ?? null) &&
    titleCode === (snapshot.titleCode ?? null);
  if (sameMedia && sameRest) return snapshot;

  return { ...snapshot, platform, releaseDate, titleCode, meta: { ...meta, coverUrl, portraitUrl } };
}

/**
 * 반영 단계 전체.
 * 신규 게임 생성은 slug 중복 확인이 필요해 건별로 남겨 뒀다 — 시드가 없는 날에는 0건이다.
 */
export async function applyStore(ctx: Ctx, source: StoreSource, fetched: Fetched[]): Promise<Applied[]> {
  const applied: Applied[] = [];

  // 1. 신규 게임 — 건별 생성(§ slug 유일성). 실패는 그 건만 버린다.
  //
  // 만들기 전에 흡수 판단을 한 번 더 한다. 발견 단계는 목록 제목으로만 판단하는데
  // PlayStation, 닌텐도 목록은 한국어 제목을 준다("사이버펑크 2077"). 우리 게임에 title_ko 가 없으면
  // 같은 게임인데도 유사도가 안 나와 중복이 생긴다(2026-09-14 실측: Cyberpunk 2077 이 두 벌).
  // 상세 응답은 영문명을 주므로 여기서는 붙는다.
  const newTargets = fetched.filter(({ target }) => !(target.gameId && target.slug));
  const titles = newTargets.length > 0 ? await loadGameTitles(ctx.db) : [];
  const refOwned = newTargets.length > 0 ? await gamesWithRef(ctx.db, source) : new Set<string>();
  // 작품 코드로도 한 번 더 본다(2026-09-30). 발견 단계도 코드로 맞추지만 그건 **목록이 코드를 줄 때만**이다 —
  // 한국 닌텐도 목록은 코드를 안 주고 상품 HTML 에만 있다. 제목은 나라마다 표기가 달라(한글, 일본어, 영문)
  // 유사도가 0 인 같은 게임이 있어서, 코드를 여기서 안 보면 일본에서 먼저 들어온 게임이 한 벌 더 생긴다.
  const codes = newTargets.map(({ snapshot }) => snapshot.titleCode).filter((c): c is string => !!c);
  const codeOwner = codes.length > 0 ? await gamesByTitleCode(ctx.db, codes) : new Map<string, { id: string; slug: string }>();

  for (const { target, snapshot } of newTargets) {
    try {
      const titleEn = snapshot.meta?.titleEn;
      const byCode = snapshot.titleCode ? codeOwner.get(snapshot.titleCode) : undefined;
      const byTitle = !byCode && titleEn ? findGameByTitle(titleEn, titles) : null;
      const hit = byCode ? { game: byCode, similarity: 1 } : byTitle;
      if (hit && refOwned.has(hit.game.id)) {
        // 그 게임에는 이 소스 가격이 이미 있다 — 여기서 덮으면 본편 가격이 에디션 가격으로 바뀐다
        await ignoreDiscovery(ctx.db, source, {
          externalId: target.externalId,
          gameId: hit.game.id,
          reason: byCode
            ? `${hit.game.slug} 의 다른 판매 단위 (상세의 작품 코드 ${snapshot.titleCode})`
            : `${hit.game.slug} 의 다른 SKU (상세 제목으로 확인)`,
          now: ctx.now,
        });
        continue;
      }
      if (hit) {
        await ctx.db
          .insert(gameSourceRefs)
          .values({
            gameId: hit.game.id,
            source,
            externalId: target.externalId,
            url: snapshot.storeUrl,
            matchedBy: "auto",
            confidence: hit.similarity.toFixed(2),
            checkedAt: ctx.now,
          })
          .onConflictDoNothing();
        refOwned.add(hit.game.id);
        applied.push({ gameId: hit.game.id, slug: hit.game.slug, snapshot });
        continue;
      }
      const enriched = withDiscoveredMedia(snapshot, target);
      const created = await createGameFromSnapshot(ctx, enriched, { contentType: snapshot.contentType ?? "game" });
      ctx.changedSlugs.add(created.slug);
      // 같은 실행의 뒤 후보가 방금 만든 게임을 알아보게 한다 — 목록은 실행 머리에 한 번 읽어서
      // 이게 없으면 한 실행 안에서 같은 게임(한 작품의 두 SKU)이 두 벌 생긴다
      if (enriched.meta?.titleEn) {
        titles.push({ id: created.id, slug: created.slug, titleEn: enriched.meta.titleEn, titleKo: enriched.meta.titleKo ?? null });
      }
      if (snapshot.titleCode) codeOwner.set(snapshot.titleCode, { id: created.id, slug: created.slug });
      refOwned.add(created.id);
      noteTouched(ctx.touched, created.slug, [], true);
      applied.push({ gameId: created.id, slug: created.slug, snapshot: enriched });
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}:db`, e);
    }
  }
  for (const { target, snapshot } of fetched) {
    if (target.gameId && target.slug) applied.push({ gameId: target.gameId, slug: target.slug, snapshot });
  }
  if (applied.length === 0) return applied;

  // 2. 기존 행 읽기 — 여기까지가 조회다
  const { gameById, platformsByGame } = await loadExisting(ctx, applied.map((a) => a.gameId));

  // 3. 계획
  const metaUpdates: Statement[] = [];
  const inserts: Array<{ slug: string; plan: Extract<PlatformPlan, { kind: "insert" }>; snapshot: StoreSnapshot }> = [];
  const updates: Array<{ slug: string; plan: Extract<PlatformPlan, { kind: "update" }>; snapshot: StoreSnapshot }> = [];
  for (const { gameId, slug, snapshot } of applied) {
    const cur = gameById.get(gameId);
    // 바뀐 것이 없어도 적는다 — "가져와 견줬는데 그대로였다" 도 이 실행이 한 일이다
    noteTouched(ctx.touched, slug);
    // 소스를 가리지 않는다. 권위(덮어쓸 수 있는가)는 planGameMeta 가 META_OVERWRITE_SOURCES 로 가른다 —
    // 예전에는 여기서 steam 만 통과시켜서, 스팀에 없는 게임은 등록 순간의 값에 영원히 멈춰 있었다.
    if (snapshot.meta && cur) {
      const set = planGameMeta(ctx, cur, snapshot.meta);
      // 영문 이름을 되찾았을 때만 주소도 따라 바꾼다(planSlugRename 주석: 옛 주소는 버린다).
      // 평범한 제목 정정("Game" → "Game: Definitive Edition")에는 손대지 않는다 —
      // 그것까지 따라가면 멀쩡한 주소가 스토어 표기가 흔들릴 때마다 404 가 된다.
      if (set.titleEn && isTitleEnRecovery(cur.titleEn, set.titleEn) && !isLocked(ctx, "games", gameId, "slug")) {
        const nextSlug = await planSlugRename(ctx.db, cur, set.titleEn, snapshot.storeExternalId);
        if (nextSlug) {
          set.slug = nextSlug;
          ctx.changedSlugs.add(nextSlug);
        }
      }
      if (Object.keys(set).length > 0) {
        metaUpdates.push(ctx.db.update(games).set({ ...set, updatedAt: ctx.now }).where(eq(games.id, gameId)));
        ctx.changedSlugs.add(slug);
        noteTouched(ctx.touched, slug, Object.keys(set));
      }
    }
    // 한 번 틀린 종류가 영원히 남지 않게 스토어 답으로 바로잡는다(판단은 content-type-fix)
    if (cur && correctedContentType(cur, snapshot.contentType) && !isLocked(ctx, "games", gameId, "content_type")) {
      metaUpdates.push(ctx.db.update(games).set({ contentType: "game", updatedAt: ctx.now }).where(eq(games.id, gameId)));
      ctx.changedSlugs.add(slug);
      noteTouched(ctx.touched, slug, ["contentType"]);
    }
    // 지역까지 봐야 한다 — 같은 게임, 같은 기기라도 나라가 다르면 다른 행이고, 섞으면 일본 가격이 한국 행을 덮는다
    const region = snapshot.region ?? HOME_REGION;
    const existing = platformsByGame.get(gameId)?.find((p) => p.platform === snapshot.platform && p.region === region);
    const plan = planPlatform(ctx, existing, gameId, snapshot);
    if (plan.kind === "insert") {
      inserts.push({ slug, plan, snapshot });
      noteTouched(ctx.touched, slug, plan.snapshot ? [PLATFORM_ROW_FIELD, "currentPrice"] : [PLATFORM_ROW_FIELD]);
    } else {
      updates.push({ slug, plan, snapshot });
      noteTouched(ctx.touched, slug, Object.keys(plan.set));
    }
  }

  // 4. 쓰기
  await runStatements(ctx, "game-meta", metaUpdates);
  await updateExistingPlatforms(ctx, updates);
  const newIds = await insertNewPlatforms(ctx, inserts);

  // 구독 포함은 플랫폼 행 id 를 알아야 쓸 수 있다 — 갱신은 계획이, 신규는 INSERT 가 그 id 를 준다.
  // subscriptionKeys 를 주지 않는 소스는 여기서 걸러져 구독 축을 건드리지 않는다(undefined ≠ []).
  const subscriptionTargets = [
    ...updates.map(({ slug, plan, snapshot }) => ({ gamePlatformId: plan.id, slug, keys: snapshot.subscriptionKeys })),
    ...inserts.map(({ slug, snapshot }, i) => ({ gamePlatformId: newIds[i], slug, keys: snapshot.subscriptionKeys })),
  ].filter((t): t is { gamePlatformId: string; slug: string; keys: string[] } => Boolean(t.gamePlatformId) && t.keys !== undefined);
  await syncSnapshotSubscriptions(ctx, subscriptionTargets);

  await runStatements(ctx, "dlc-parent", await planParentLinks(ctx, source, applied, gameById));
  await runStatements(ctx, "company-link", await planCompanyLinks(ctx, applied));

  ctx.processed += applied.length;
  return applied;
}
