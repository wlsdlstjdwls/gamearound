// 0건 검색어 기록과 "이 게임 추가 요청"(2026-10-30). 왜 세는지는 server/db/schema-search 머리 주석에 있다.
//
// 기록은 화면을 기다리게 하지 않는다 — 검색 화면이 after() 로 응답을 보낸 뒤에 부른다. 실패해도 검색은 멀쩡해야 해서 던지지 않는다.
// 추가 요청은 데이터 점검 줄(data_issues)로도 올린다. 관리자가 이미 매일 보는 데이터오류관리 화면에 서게 하려는 것이다 —
// 화면을 하나 더 만들면 볼 곳이 하나 더 는다. 사람이 "아니에요" 로 넘긴 줄은 다시 열지 않는다(schema-quality 의 dismissed 규칙).
import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { dataIssues, searchMisses } from "@/server/db/schema";
import { errorMessage } from "@/lib/errors";
import { normalizeMissQuery, SEARCH_REQUEST_RULE } from "@/lib/search/miss";
import { SEARCH_MESSAGES as M } from "@/lib/search/messages";

/** 0건 검색 한 번. 같은 말이면 횟수만 오른다 */
export async function recordSearchMiss(q: string): Promise<void> {
  const key = normalizeMissQuery(q);
  if (!key) return;
  try {
    await getDb()
      .insert(searchMisses)
      .values({ queryKey: key, query: q.trim(), ...createdBy("system") })
      .onConflictDoUpdate({
        target: searchMisses.queryKey,
        set: { missCount: sql`${searchMisses.missCount} + 1`, query: q.trim(), lastMissedAt: sql`now()`, updatedAt: sql`now()`, updatedSource: "system" },
      });
  } catch (e) {
    console.error("[search-miss] 기록 실패:", errorMessage(e));
  }
}

/** 추가 요청 한 번. 요청 수를 올리고 관리자 데이터 점검 줄을 세우거나 고친다. 받은 말이 기록 규칙 밖이면 false */
export async function requestMissingGame(q: string, userId: string | null): Promise<boolean> {
  const key = normalizeMissQuery(q);
  if (!key) return false;
  const query = q.trim();
  const db = getDb();
  const source = userId ? "user" : "system";
  const [row] = await db
    .insert(searchMisses)
    // 결과가 있는 화면에서도 누를 수 있다(찾는 게 목록에 없을 때) — 그때는 0건 기록이 없으니 요청으로 줄을 연다
    .values({ queryKey: key, query, missCount: 0, requestCount: 1, ...createdBy(source, userId ?? undefined) })
    .onConflictDoUpdate({
      target: searchMisses.queryKey,
      set: { requestCount: sql`${searchMisses.requestCount} + 1`, query, updatedAt: sql`now()`, updatedSource: source, updatedBy: userId },
    })
    .returning({ missCount: searchMisses.missCount, requestCount: searchMisses.requestCount });
  const reason = M.requestIssueReason(query, row?.requestCount ?? 1, row?.missCount ?? 0);
  await db
    .insert(dataIssues)
    .values({ rule: SEARCH_REQUEST_RULE, subjectKey: key, verdict: "notify", reason, ...createdBy(source, userId ?? undefined) })
    .onConflictDoUpdate({
      target: [dataIssues.rule, dataIssues.subjectKey],
      // 상태는 건드리지 않는다 — 넘긴 줄이 요청 한 번에 다시 열리면 관리자가 같은 말을 매번 다시 넘겨야 한다
      set: { reason, updatedAt: sql`now()`, updatedSource: source, updatedBy: userId },
    });
  return true;
}
