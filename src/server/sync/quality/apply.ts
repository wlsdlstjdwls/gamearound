// 데이터 점검기의 쓰기 — 판정 하나의 고침을 DB 에 넣는다. 크론(auto)과 관리자 버튼(candidate 적용)이 같은 함수를 쓴다.
//
// 고치기 전에 "판정한 뒤 값이 그대로인가" 를 다시 본다(낡은 판정 가드). 크론이 판정하고 관리자가 며칠 뒤 누르는 사이에
// 수집이나 다른 사람이 값을 바꿨을 수 있다 — 그때 옛 판정을 밀어 넣으면 새 값을 덮는다.
//
// 부모를 바꾸면 그 칸을 잠근다. Xbox addOnParent 같은 스토어 말이 다음 수집에서 다시 런처로 돌려놓지 않게 하려는 것이다
// (sync 의 부모 잇기는 잠금을 지킨다, 9762acf). 출시일은 잠그지 않는다 — 수집은 null 로 덮지 않으니 채운 값은 남고,
// 스토어가 날짜를 주기 시작하면 그 값이 맞다.
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dataCorrections, gameAliases, gamePlatforms, games, gameSourceRefs, playtimes, type SourceName } from "@/server/db/schema";
import { updatedBy, type AuditSource } from "@/server/db/audit";
import { uniqueSlug } from "../game-writer";
import { SOURCE_PLATFORMS, SOURCE_REGION } from "../constants";
import type { StoreSource } from "@/server/adapters";
import type { QualityFix } from "./rules";

export interface QualityActor {
  source: AuditSource;
  /** 관리자가 누른 것이면 그 사람. 크론이면 null(data_corrections.admin_user_id 가 비면 기계가 고친 것이다) */
  adminUserId: string | null;
}

/** 판정 뒤 값이 바뀌어 고침을 버렸다. 실패가 아니라 "이미 다른 손이 탔다" 다 */
export class StaleFixError extends Error {
  constructor(what: string) {
    super(`판정 뒤에 값이 바뀌었어요(${what})`);
  }
}

/** 고침 하나를 넣고, 화면 캐시를 깰 게임 id 들을 돌려준다 */
export async function applyQualityFix(db: Db, fix: QualityFix, actor: QualityActor): Promise<string[]> {
  const audit = updatedBy(actor.source, actor.adminUserId ?? undefined);
  const lock = (rowId: string, field: string, before: unknown, after: unknown) =>
    db.insert(dataCorrections).values({
      adminUserId: actor.adminUserId,
      table: "games",
      rowId,
      field,
      before,
      after,
      lockField: true,
      createdSource: actor.source,
      createdBy: actor.adminUserId,
      updatedSource: actor.source,
      updatedBy: actor.adminUserId,
    });

  switch (fix.kind) {
    case "set_parent": {
      const moved = await db
        .update(games)
        .set({ parentGameId: fix.to, ...audit })
        .where(and(eq(games.id, fix.gameId), fix.from ? eq(games.parentGameId, fix.from) : isNull(games.parentGameId)))
        .returning({ id: games.id });
      if (moved.length === 0) throw new StaleFixError("부모");
      await lock(fix.gameId, "parentGameId", fix.from, fix.to);
      return [fix.gameId, fix.to, ...(fix.from ? [fix.from] : [])];
    }
    case "promote_game": {
      const [before] = await db.select({ contentType: games.contentType }).from(games).where(eq(games.id, fix.gameId));
      const moved = await db
        .update(games)
        .set({ parentGameId: null, contentType: "game", ...audit })
        .where(and(eq(games.id, fix.gameId), eq(games.parentGameId, fix.from)))
        .returning({ id: games.id });
      if (moved.length === 0 || !before) throw new StaleFixError("부모");
      await lock(fix.gameId, "parentGameId", fix.from, null);
      await lock(fix.gameId, "contentType", before.contentType, "game");
      return [fix.gameId];
    }
    case "set_content_type": {
      const moved = await db
        .update(games)
        .set({ contentType: fix.to, ...audit })
        .where(and(eq(games.id, fix.gameId), eq(games.contentType, fix.from)))
        .returning({ id: games.id });
      if (moved.length === 0) throw new StaleFixError("갈래");
      await lock(fix.gameId, "contentType", fix.from, fix.to);
      return [fix.gameId];
    }
    case "set_release_date": {
      const filled = await db
        .update(gamePlatforms)
        .set({ releaseDate: fix.date, ...audit })
        .where(and(eq(gamePlatforms.id, fix.platformRowId), isNull(gamePlatforms.releaseDate)))
        .returning({ gameId: gamePlatforms.gameId });
      if (filled.length === 0) throw new StaleFixError("출시일");
      return filled.map((r) => r.gameId);
    }
    case "unlink_meta_ref":
      return unlinkMetaRef(db, fix, audit);
    case "split_store_ref":
      return splitStoreRef(db, fix, actor, audit);
  }
}

/**
 * 섞인 스토어 판을 제 행으로 떼어 낸다(rules-identity). 그 소스의 플랫폼 행(가격 이력, 패치, 구독이 매달린 채)과 연결을 함께 옮긴다.
 * 받는 행이 이미 그 소스의 확정 연결이나 같은 기기, 나라 행을 쥐고 있으면 멈춘다 — 둘을 합치는 일은 dedup:stores 몫이다.
 */
async function splitStoreRef(
  db: Db,
  fix: Extract<QualityFix, { kind: "split_store_ref" }>,
  actor: QualityActor,
  audit: ReturnType<typeof updatedBy>,
): Promise<string[]> {
  const source = fix.source as StoreSource;
  const [ref] = await db
    .select({ id: gameSourceRefs.gameId })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.gameId, fix.gameId), eq(gameSourceRefs.source, source), eq(gameSourceRefs.externalId, fix.externalId), inArray(gameSourceRefs.matchedBy, ["auto", "manual"])));
  if (!ref) throw new StaleFixError("연결");
  const rows = await db
    .select({ id: gamePlatforms.id, platform: gamePlatforms.platform })
    .from(gamePlatforms)
    .where(and(eq(gamePlatforms.gameId, fix.gameId), inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]), eq(gamePlatforms.region, SOURCE_REGION[source]), eq(gamePlatforms.storeExternalId, fix.externalId)));
  let to = fix.toGameId;
  if (to) {
    const [taken] = await db
      .select({ source: gameSourceRefs.source })
      .from(gameSourceRefs)
      .where(and(eq(gameSourceRefs.gameId, to), eq(gameSourceRefs.source, source), inArray(gameSourceRefs.matchedBy, ["auto", "manual"])));
    const clash = rows.length
      ? await db
          .select({ id: gamePlatforms.id })
          .from(gamePlatforms)
          .where(and(eq(gamePlatforms.gameId, to), inArray(gamePlatforms.platform, rows.map((r) => r.platform)), eq(gamePlatforms.region, SOURCE_REGION[source])))
      : [];
    if (taken || clash.length > 0) throw new Error("받을 행이 같은 스토어 판을 이미 갖고 있어요. 두 행을 합쳐야 해요");
    await db.delete(gameSourceRefs).where(and(eq(gameSourceRefs.gameId, to), eq(gameSourceRefs.source, source)));
  } else {
    const slug = await uniqueSlug(db, fix.title, fix.externalId);
    const [created] = await db
      .insert(games)
      .values({ slug, titleEn: fix.title, contentType: "game", createdSource: actor.source, createdBy: actor.adminUserId, ...audit })
      .returning({ id: games.id });
    to = created.id;
  }
  if (rows.length > 0) await db.update(gamePlatforms).set({ gameId: to, ...audit }).where(inArray(gamePlatforms.id, rows.map((r) => r.id)));
  await db
    .update(gameSourceRefs)
    .set({ gameId: to, ...audit })
    .where(and(eq(gameSourceRefs.gameId, fix.gameId), eq(gameSourceRefs.source, source), eq(gameSourceRefs.externalId, fix.externalId)));
  return [fix.gameId, to];
}

/**
 * 섞인 평점 연결을 끊고, 그 소스가 넣은 값을 지운다(rules-identity). 연결만 끊으면 남의 플레이타임, 점수가 그대로 남는다 —
 * 수집은 null 로 덮지 않는다(§7). 관리자가 잠근 칸은 지우지 않는다. 끊은 연결은 none 으로 두어 다시 묻는 주기(NONE_RETRY_DAYS)에 맡긴다.
 * 위키데이터의 회사 연결은 출처 칸이 없어 가려 지울 수 없다 — 남긴다.
 */
async function unlinkMetaRef(db: Db, fix: Extract<QualityFix, { kind: "unlink_meta_ref" }>, audit: ReturnType<typeof updatedBy>): Promise<string[]> {
  const source = fix.source as SourceName;
  const cut = await db
    .update(gameSourceRefs)
    .set({ matchedBy: "none", confidence: null, ...audit })
    .where(and(eq(gameSourceRefs.gameId, fix.gameId), eq(gameSourceRefs.source, source), eq(gameSourceRefs.externalId, fix.externalId), eq(gameSourceRefs.matchedBy, "auto")))
    .returning({ gameId: gameSourceRefs.gameId });
  if (cut.length === 0) throw new StaleFixError("연결");
  const rows = await db.select({ id: gamePlatforms.id }).from(gamePlatforms).where(eq(gamePlatforms.gameId, fix.gameId));
  const locks = await db
    .select({ table: dataCorrections.table, rowId: dataCorrections.rowId, field: dataCorrections.field })
    .from(dataCorrections)
    .where(and(eq(dataCorrections.lockField, true), inArray(dataCorrections.rowId, [fix.gameId, ...rows.map((r) => r.id)])));
  const locked = new Set(locks.map((l) => `${l.table}:${l.rowId}:${l.field}`));
  if (source === "hltb") {
    if (!["mainStoryHours", "mainExtraHours", "completionistHours"].some((f) => locked.has(`playtimes:${fix.gameId}:${f}`))) {
      await db.delete(playtimes).where(eq(playtimes.gameId, fix.gameId));
    }
    if (!locked.has(`games:${fix.gameId}:hltbLoggedCount`)) await db.update(games).set({ hltbLoggedCount: null, ...audit }).where(eq(games.id, fix.gameId));
  } else if (source === "wikidata_game") {
    await db.delete(gameAliases).where(and(eq(gameAliases.gameId, fix.gameId), eq(gameAliases.source, source)));
  } else {
    const fields = source === "opencritic" ? (["opencriticScore", "ignScore"] as const) : (["metacriticScore"] as const);
    for (const field of fields) {
      const ids = rows.map((r) => r.id).filter((id) => !locked.has(`game_platforms:${id}:${field}`));
      if (ids.length > 0) await db.update(gamePlatforms).set({ [field]: null, ...audit }).where(inArray(gamePlatforms.id, ids));
    }
  }
  return [fix.gameId];
}
