// Xbox 예약 특전 반영 — 한국 Xbox 예약 상품의 소개글을 다시 읽어 특전 목록을 preorder 표에 담는다.
//
// 닌텐도 뉴스(sync/preorder-bonuses)와 다른 점:
// - 상품 번호로 game_platforms 행에 이미 묶여 있어 게임을 이름으로 어림할 일이 없다. 그래서 검토 대기 없이 바로 공개한다.
//   출처는 source 값(lib/preorder/sources 의 xboxKr)으로 가른다 — 관리자 화면, 상세 마디가 그걸 보고 문구를 고른다.
// - 글이 한 번 나오고 끝이 아니라 상품 소개가 바뀐다. 그래서 회차마다 다시 읽고 **달라졌을 때만** 고쳐 쓴다(AGENTS §7).
// - 특전이 소개에서 빠지면 글을 지운다. 숨김(hidden)으로 두지 않는 이유: hidden 은 관리자가 내린 표시라
//   같은 상품의 특전이 다시 붙어도 되살리지 않는다 — 기계가 hidden 을 쓰면 그 약속이 섞인다. 관리자가 숨긴 글은 건드리지 않는다.
// - 출시하면(예약 판정에서 빠지면) 소개를 더 읽지 않고, 마감일이 남은 특전(조기 구매 특전)만 남긴다. 마감일 없는 예약 특전은 출시로 끝난다.
//
// 대상은 화면과 같은 기준이다(server/db/visibility: 숨긴 플랫폼, 숨긴 지역, 스토어 링크 없는 행 제외). 예약 판정은 lib/games/preorder 와 같다.
import { and, asc, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { gamePlatforms, HOME_REGION, preorderBonuses, preorderBonusPosts, type PreorderPostStatus } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { fetchXboxDescriptions, xboxAdapter } from "@/server/adapters/xbox";
import { parseXboxPreorderBonus, xboxBonusRows, XBOX_PREORDER_PARSE_VERSION, type XboxBonusRow, type XboxDescription } from "@/server/adapters/xbox-preorder";
import { isPreorder } from "@/lib/games/preorder";
import { PREORDER_SOURCE } from "@/lib/preorder/sources";
import { kstDateKey } from "@/lib/format";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import { ERROR_SAMPLE_MAX, XBOX_PREORDER_BATCH, XBOX_PREORDER_MAX_ROWS } from "./constants";

const SOURCE = PREORDER_SOURCE.xboxKr;
const ACTOR = `cron:${SOURCE}` as const;
/** Xbox 특전은 모두 디지털 상품에 붙는다 — 패키지판 매장 특전이 아니다 */
const EDITION = "download" as const;

/** 지금 예약 중인 한국 Xbox 상품 하나. productId 는 대문자로 맞춘다(응답 열쇠와 같게) */
export type XboxPreorderTarget = { productId: string; gameId: string; storeUrl: string };

/** 이미 담은 Xbox 글 하나 */
export type ExistingXboxPost = {
  id: string;
  productId: string;
  status: PreorderPostStatus;
  gameId: string | null;
  url: string;
  title: string;
  bonuses: XboxBonusRow[];
};

export type XboxPreorderAction =
  | { kind: "insert"; target: XboxPreorderTarget; title: string; rows: XboxBonusRow[] }
  | { kind: "replace"; postId: string; target: XboxPreorderTarget; title: string; rows: XboxBonusRow[] }
  /** 출시 뒤 마감일이 남은 특전만 남긴다 */
  | { kind: "trim"; postId: string; productId: string; rows: XboxBonusRow[] }
  | { kind: "delete"; postId: string; productId: string; why: "gone" | "released" };

const sameRows = (a: XboxBonusRow[], b: XboxBonusRow[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * 무엇을 쓸지 정한다(순수 함수). 소개를 못 읽은 상품(묶음 실패, 응답에 없음)은 "모름" 이라 아무것도 하지 않는다 —
 * 모름을 "특전 없음" 으로 읽으면 네트워크가 한 번 흔들릴 때마다 특전이 지워졌다 다시 붙는다.
 *
 * targets 는 소개를 읽으려 한 상품, preorderIds 는 지금 예약 중인 **모든** 상품(상한으로 못 읽은 것까지)이다.
 * 둘을 가르는 이유: 상한에 걸려 이번에 못 읽은 예약 상품을 "출시함" 으로 오해해 지우지 않게.
 */
export function planXboxPreorder(input: {
  targets: XboxPreorderTarget[];
  preorderIds: ReadonlySet<string>;
  descriptions: ReadonlyMap<string, XboxDescription>;
  existing: ExistingXboxPost[];
  today: string;
}): XboxPreorderAction[] {
  const byProduct = new Map(input.existing.map((p) => [p.productId, p]));
  const actions: XboxPreorderAction[] = [];

  for (const target of input.targets) {
    const desc = input.descriptions.get(target.productId);
    if (!desc) continue;
    const post = byProduct.get(target.productId);
    if (post?.status === "hidden") continue;
    const parsed = parseXboxPreorderBonus(desc.description);
    const rows = parsed ? xboxBonusRows(parsed) : [];
    const title = desc.title ?? target.productId;
    if (rows.length === 0) {
      if (post) actions.push({ kind: "delete", postId: post.id, productId: target.productId, why: "gone" });
      continue;
    }
    if (!post) {
      actions.push({ kind: "insert", target, title, rows });
      continue;
    }
    const same = post.gameId === target.gameId && post.url === target.storeUrl && post.title === title && sameRows(post.bonuses, rows);
    if (!same) actions.push({ kind: "replace", postId: post.id, target, title, rows });
  }

  for (const post of input.existing) {
    if (post.status === "hidden" || input.preorderIds.has(post.productId)) continue;
    // 날짜 열쇠(YYYY-MM-DD)라 글자 비교가 곧 날짜 비교다(lib/games/preorder 와 같은 규칙)
    const alive = post.bonuses.filter((b) => b.endsOn !== null && b.endsOn >= input.today);
    if (alive.length === 0) actions.push({ kind: "delete", postId: post.id, productId: post.productId, why: "released" });
    else if (!sameRows(alive, post.bonuses)) actions.push({ kind: "trim", postId: post.id, productId: post.productId, rows: alive });
  }
  return actions;
}

export type XboxPreorderRunResult = {
  /** 지금 예약 중인 한국 Xbox 상품 수 */
  preorder: number;
  /** 그중 이번에 소개를 읽은 수 */
  fetched: number;
  inserted: number;
  updated: number;
  removed: number;
  failed: number;
  errors: string[];
  /** dryRun 일 때만 채운다 — 쓰지 않고 무엇을 쓸지만 돌려준다 */
  actions?: XboxPreorderAction[];
};

/** 지금 예약 중인 대상. 출시일이 오늘 뒤인 행만 DB 에서 고르고, 값 조건까지 같은 판정 함수로 한 번 더 본다 */
async function loadTargets(today: string, only?: readonly string[]): Promise<XboxPreorderTarget[]> {
  const rows = await getDb()
    .select({
      productId: gamePlatforms.storeExternalId,
      gameId: gamePlatforms.gameId,
      storeUrl: gamePlatforms.storeUrl,
      releaseDate: gamePlatforms.releaseDate,
      currentPrice: gamePlatforms.currentPrice,
    })
    .from(gamePlatforms)
    .where(
      and(
        eq(gamePlatforms.platform, "xbox"),
        eq(gamePlatforms.region, HOME_REGION),
        isNotNull(gamePlatforms.storeExternalId),
        gt(gamePlatforms.releaseDate, today),
        visiblePlatformsOnly(),
        only ? inArray(gamePlatforms.storeExternalId, [...only]) : undefined,
      ),
    )
    .orderBy(asc(gamePlatforms.releaseDate));
  const seen = new Set<string>();
  const out: XboxPreorderTarget[] = [];
  for (const r of rows) {
    if (!r.productId || !r.storeUrl || !isPreorder({ releaseDate: r.releaseDate, currentPrice: r.currentPrice }, today)) continue;
    const productId = r.productId.toUpperCase();
    // 같은 상품 번호가 두 행에 걸린 경우(외부 ID 공유) 앞의 것 하나만 — 글은 상품당 하나다
    if (seen.has(productId)) continue;
    seen.add(productId);
    out.push({ productId, gameId: r.gameId, storeUrl: r.storeUrl });
  }
  return out;
}

async function loadExisting(): Promise<ExistingXboxPost[]> {
  const db = getDb();
  const posts = await db
    .select({ id: preorderBonusPosts.id, slug: preorderBonusPosts.sourceSlug, status: preorderBonusPosts.status, gameId: preorderBonusPosts.gameId, url: preorderBonusPosts.url, title: preorderBonusPosts.title })
    .from(preorderBonusPosts)
    .where(eq(preorderBonusPosts.source, SOURCE));
  if (posts.length === 0) return [];
  const bonuses = await db
    .select({ postId: preorderBonuses.postId, name: preorderBonuses.name, notes: preorderBonuses.notes, endsOn: preorderBonuses.endsOn })
    .from(preorderBonuses)
    .where(inArray(preorderBonuses.postId, posts.map((p) => p.id)))
    .orderBy(asc(preorderBonuses.postId), asc(preorderBonuses.sortOrder));
  return posts.map((p) => ({
    id: p.id,
    productId: p.slug,
    status: p.status,
    gameId: p.gameId,
    url: p.url,
    title: p.title,
    bonuses: bonuses.filter((b) => b.postId === p.id).map((b) => ({ name: b.name, notes: b.notes, endsOn: b.endsOn })),
  }));
}

/** 소개를 묶음으로 읽는다. 묶음 하나가 실패해도 나머지는 계속 간다(AGENTS §7) */
async function loadDescriptions(targets: XboxPreorderTarget[], fail: (label: string, e: unknown) => void): Promise<Map<string, XboxDescription>> {
  const out = new Map<string, XboxDescription>();
  for (let i = 0; i < targets.length; i += XBOX_PREORDER_BATCH) {
    const ids = targets.slice(i, i + XBOX_PREORDER_BATCH).map((t) => t.productId);
    try {
      for (const [id, d] of await fetchXboxDescriptions(ids)) out.set(id, d);
    } catch (e) {
      fail(`fetch ${ids[0]}+${ids.length - 1}`, e);
    }
    if (i + XBOX_PREORDER_BATCH < targets.length) await sleep(xboxAdapter.minIntervalMs);
  }
  return out;
}

async function insertBonuses(postId: string, rows: XboxBonusRow[]): Promise<void> {
  await getDb()
    .insert(preorderBonuses)
    .values(rows.map((r, i) => ({ postId, edition: EDITION, name: r.name, notes: r.notes, endsOn: r.endsOn, retailers: null, imageUrl: null, sortOrder: i, ...createdBy(ACTOR) })));
}

async function apply(action: XboxPreorderAction): Promise<void> {
  const db = getDb();
  switch (action.kind) {
    case "insert": {
      const [post] = await db
        .insert(preorderBonusPosts)
        .values({
          source: SOURCE,
          sourceSlug: action.target.productId,
          url: action.target.storeUrl,
          title: action.title,
          publishedAt: new Date(),
          // 관리자 화면 "게임 번호" 칸이 이걸 보인다. 닌텐도는 eShop 번호, Xbox 는 상품 번호
          nsuids: [action.target.productId],
          gameId: action.target.gameId,
          status: "published",
          statusReason: null,
          parseVersion: XBOX_PREORDER_PARSE_VERSION,
          ...createdBy(ACTOR),
        })
        .returning({ id: preorderBonusPosts.id });
      try {
        await insertBonuses(post.id, action.rows);
      } catch (e) {
        // 특전 없는 글이 남으면 다음 회차가 "있는 글" 로 보고 replace 로 고친다. 그래도 빈 글을 남기지 않게 지운다
        await db.delete(preorderBonusPosts).where(eq(preorderBonusPosts.id, post.id));
        throw e;
      }
      return;
    }
    case "replace":
      await db
        .update(preorderBonusPosts)
        .set({ gameId: action.target.gameId, url: action.target.storeUrl, title: action.title, parseVersion: XBOX_PREORDER_PARSE_VERSION, ...updatedBy(ACTOR) })
        .where(eq(preorderBonusPosts.id, action.postId));
      await db.delete(preorderBonuses).where(eq(preorderBonuses.postId, action.postId));
      await insertBonuses(action.postId, action.rows);
      return;
    case "trim":
      await db.delete(preorderBonuses).where(eq(preorderBonuses.postId, action.postId));
      await insertBonuses(action.postId, action.rows);
      await db.update(preorderBonusPosts).set(updatedBy(ACTOR)).where(eq(preorderBonusPosts.id, action.postId));
      return;
    case "delete":
      // 특전 줄은 외래키 cascade 로 같이 지워진다
      await db.delete(preorderBonusPosts).where(eq(preorderBonusPosts.id, action.postId));
      return;
  }
}

/**
 * 한 회차. dryRun 이면 DB 를 읽기만 하고 할 일을 돌려준다(운영 DB 에서 미리 보기용).
 * only 는 상품 번호로 대상을 좁힌다(미리 보기, 손 점검용). 좁혔을 때는 출시 정리를 하지 않는다 — 좁힌 밖의 글을 "출시함" 으로 읽게 된다.
 */
export async function runXboxPreorderBonuses(opts: { dryRun?: boolean; only?: readonly string[] } = {}): Promise<XboxPreorderRunResult> {
  const result: XboxPreorderRunResult = { preorder: 0, fetched: 0, inserted: 0, updated: 0, removed: 0, failed: 0, errors: [] };
  const fail = (label: string, e: unknown) => {
    result.failed++;
    if (result.errors.length < ERROR_SAMPLE_MAX) result.errors.push(`[${label}] ${errorMessage(e)}`);
  };
  const today = kstDateKey(new Date());
  const only = opts.only?.map((id) => id.toUpperCase());

  let all: XboxPreorderTarget[];
  let existing: ExistingXboxPost[];
  try {
    [all, existing] = await Promise.all([loadTargets(today, only), loadExisting()]);
  } catch (e) {
    fail("load", e);
    return result;
  }
  result.preorder = all.length;
  const targets = all.slice(0, XBOX_PREORDER_MAX_ROWS);
  const descriptions = await loadDescriptions(targets, fail);
  result.fetched = descriptions.size;

  const preorderIds = new Set(all.map((t) => t.productId));
  const actions = planXboxPreorder({
    targets,
    preorderIds,
    descriptions,
    existing: only ? existing.filter((p) => only.includes(p.productId)) : existing,
    today,
  }).filter((a) => !only || a.kind === "insert" || a.kind === "replace" || (a.kind === "delete" && a.why === "gone"));

  if (opts.dryRun) return { ...result, actions };
  for (const action of actions) {
    try {
      await apply(action);
      if (action.kind === "insert") result.inserted++;
      else if (action.kind === "delete") result.removed++;
      else result.updated++;
    } catch (e) {
      fail(`${action.kind} ${action.kind === "insert" || action.kind === "replace" ? action.target.productId : action.productId}`, e);
    }
  }
  return result;
}
