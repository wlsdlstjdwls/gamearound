// DLC 를 매달 부모를 맨 위 본편으로 올린다.
//
// 스토어는 "이 DLC 의 본편은 X" 라고만 말한다. 그런데 우리 카탈로그에서 X 가 이미 다른 본편의 에디션이나 DLC 로
// 매달려 있으면, 그 밑에 붙인 DLC 는 2단 사슬이 되고 본편 화면의 추가 콘텐츠 목록에서 사라진다.
// 2026-09-26 실측: Xbox 가 기어스 5 에디션 상품을, 트레인 심 월드 6 은 무료 스타터 팩을 본편으로 내놓아
// 한나절 만에 DLC 50개가 그 밑에 붙었다. 스토어 말을 버리지 않고, 붙일 자리만 한 칸씩 위로 올린다.
import { inArray } from "drizzle-orm";
import { games } from "@/server/db/schema";
import type { Ctx } from "./context";

/** 사슬이 깊어도 여기서 멈춘다. 고리(서로를 부모로 가리키는 행)가 있어도 끝나야 한다 */
const MAX_HOPS = 4;

/** 부모 id 하나를 맨 위로 올린다. parentOf 에 없으면(=부모 없음) 그 자리가 맨 위다 */
export function liftToRoot(id: string, parentOf: ReadonlyMap<string, string | null>): string {
  let cur = id;
  for (let i = 0; i < MAX_HOPS; i++) {
    const up = parentOf.get(cur);
    if (!up || up === id) return cur;
    cur = up;
  }
  return cur;
}

/** 부모 후보들의 맨 위 본편. 반환 맵에 없는 id 는 이미 맨 위다 */
export async function loadRootParents(ctx: Ctx, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const parentOf = new Map<string, string | null>();
  let frontier = Array.from(new Set(ids));
  for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop++) {
    const rows = await ctx.db.select({ id: games.id, parent: games.parentGameId }).from(games).where(inArray(games.id, frontier));
    for (const r of rows) parentOf.set(r.id, r.parent);
    frontier = rows.map((r) => r.parent).filter((p): p is string => Boolean(p) && !parentOf.has(p as string));
  }
  for (const id of ids) {
    const root = liftToRoot(id, parentOf);
    if (root !== id) out.set(id, root);
  }
  return out;
}
