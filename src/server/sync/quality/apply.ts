// 데이터 점검기의 쓰기 — 판정 하나의 고침을 DB 에 넣는다. 크론(auto)과 관리자 버튼(candidate 적용)이 같은 함수를 쓴다.
//
// 고치기 전에 "판정한 뒤 값이 그대로인가" 를 다시 본다(낡은 판정 가드). 크론이 판정하고 관리자가 며칠 뒤 누르는 사이에
// 수집이나 다른 사람이 값을 바꿨을 수 있다 — 그때 옛 판정을 밀어 넣으면 새 값을 덮는다.
//
// 부모를 바꾸면 그 칸을 잠근다. Xbox addOnParent 같은 스토어 말이 다음 수집에서 다시 런처로 돌려놓지 않게 하려는 것이다
// (sync 의 부모 잇기는 잠금을 지킨다, 9762acf). 출시일은 잠그지 않는다 — 수집은 null 로 덮지 않으니 채운 값은 남고,
// 스토어가 날짜를 주기 시작하면 그 값이 맞다.
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dataCorrections, gamePlatforms, games } from "@/server/db/schema";
import { updatedBy, type AuditSource } from "@/server/db/audit";
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
    case "set_release_date": {
      const filled = await db
        .update(gamePlatforms)
        .set({ releaseDate: fix.date, ...audit })
        .where(and(eq(gamePlatforms.id, fix.platformRowId), isNull(gamePlatforms.releaseDate)))
        .returning({ gameId: gamePlatforms.gameId });
      if (filled.length === 0) throw new StaleFixError("출시일");
      return filled.map((r) => r.gameId);
    }
  }
}
