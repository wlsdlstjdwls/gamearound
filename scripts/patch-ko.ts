// 패치 기록 한글화 도구 — 뽑기(export)와 되쓰기(import) 두 모드.
//
//   pnpm patch:ko --export [--limit 40] [--offset 0] [--out artifacts/patch-ko-todo.jsonl]
//   pnpm patch:ko --import artifacts/patch-ko-done.jsonl
//
// 왜 한 번에 안 돌리고 왕복으로 나누나: 한글을 쓰는 주체가 **호출자**다. 이 레포에는 LLM 키가 없고
// (2026-09-15 확인: .env.local, Vercel 프로덕션 환경변수 둘 다), 지금은 Claude Code 세션이
// 뽑은 파일을 읽고 한글을 채워 되쓴다. 나중에 키가 생기면 그 자리에 배치 호출을 끼우면 되고,
// 표와 되쓰기 경로는 그대로 쓴다 — 그래서 생성기를 이 스크립트 안에 붙박지 않았다.
//
// **본문은 저장하지 않는다.** export 는 본문을 파일로 흘려보내지만 그 파일은 artifacts/ 이고
// (.gitignore) import 는 본문을 읽지 않는다. DB 에 들어가는 것은 우리가 쓴 한글뿐이다(§10).
//
// **뽑기는 조용히 거르지 않는다.** 큐가 `title_ko is null` + 최신순이라, 뽑아 놓고 되쓰지 않은 행은
// 다음 회차 목록 맨 앞에 그대로 다시 선다. 앞 회차까지 본문이 한글인 행을 export 단계에서 걸렀는데
// 그 행들은 되쓸 방법 자체가 없어 영구히 머리를 막았다(2026-09-18 실측: 남은 2,572건).
// 그래서 지금은 걸러야 할 행에도 표시(`bodyIsKorean`, `titleIsKorean`)만 달아 내보내고,
// 되쓰기 한 번으로 큐에서 빠지게 한다. 그래도 못 쓰는 행이 남으면 `--offset` 으로 건너뛴다.
import path from "node:path";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, gameSourceRefs, patchNotes } from "@/server/db/schema";
import { fetchSteamPatchBodies } from "@/server/adapters/steam/patch-body";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

/** 요청 간격. steam 어댑터의 minIntervalMs 와 같은 값을 쓴다 */
const REQUEST_INTERVAL_MS = 1500;
/** 한 번에 뽑을 기록 수. 호출자가 한 호흡에 읽고 쓸 만한 양이다 */
const DEFAULT_LIMIT = 40;
const DEFAULT_OUT = "artifacts/patch-ko-todo.jsonl";

/** 본문에 한글이 있으면 이미 한국어 공지다 — 옮길 것이 아니라 그대로 쓰면 된다 */
function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

/** BBCode 와 잇단 공백을 걷어낸 읽을거리. 요약하는 쪽이 읽기 쉬우라고 다듬는 것뿐이다 */
function stripBbcode(raw: string): string {
  return raw
    .replace(/\[\/?[a-z][^\]]*\]/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface TodoLine {
  id: string;
  slug: string;
  gameTitle: string;
  version: string | null;
  title: string;
  publishedAt: string;
  body: string;
  /** 본문이 이미 한국어다. 옮기지 말고 그대로 요약한다 */
  bodyIsKorean?: true;
  /** 제목이 이미 한국어다. `titleKo` 에 원문을 그대로 되쓰면 된다 */
  titleIsKorean?: true;
}

async function runExport(limit: number, offset: number, outPath: string): Promise<void> {
  const db = getDb();
  // 아직 한글이 없는 steam 기록만. 게임별로 묶어 한 게임에 요청 1회로 끝낸다
  const rows = await db
    .select({
      id: patchNotes.id,
      externalId: patchNotes.externalId,
      version: patchNotes.version,
      title: patchNotes.title,
      publishedAt: patchNotes.publishedAt,
      slug: games.slug,
      gameTitle: games.titleEn,
      appid: gameSourceRefs.externalId,
    })
    .from(patchNotes)
    .innerJoin(gamePlatforms, eq(gamePlatforms.id, patchNotes.gamePlatformId))
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .innerJoin(gameSourceRefs, and(eq(gameSourceRefs.gameId, games.id), eq(gameSourceRefs.source, "steam")))
    .where(and(eq(patchNotes.source, "steam"), isNull(patchNotes.titleKo)))
    .orderBy(sql`${patchNotes.publishedAt} desc`)
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) {
    console.log("[patch:ko] 한글이 없는 steam 기록이 없다 — 할 일 없음");
    return;
  }

  const byApp = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byApp.get(r.appid) ?? [];
    list.push(r);
    byApp.set(r.appid, list);
  }

  const out: TodoLine[] = [];
  let bodyKo = 0;
  let titleKo = 0;
  let missing = 0;
  for (const [appid, list] of byApp) {
    let bodies: Map<string, { title: string; contents: string }>;
    try {
      bodies = await fetchSteamPatchBodies(appid);
    } catch (e) {
      console.warn(`[patch:ko] appid ${appid} 본문 조회 실패: ${errorMessage(e)}`);
      await sleep(REQUEST_INTERVAL_MS);
      continue;
    }
    for (const r of list) {
      const hit = bodies.get(r.externalId);
      // 목록에서 밀려난 옛 공지는 본문을 못 받는다. 제목만으로도 한글 제목은 쓸 수 있으니 내보낸다
      if (!hit) missing++;
      const body = hit ? stripBbcode(hit.contents) : "";
      const line: TodoLine = {
        id: r.id,
        slug: r.slug,
        gameTitle: r.gameTitle,
        version: r.version,
        title: r.title,
        publishedAt: r.publishedAt.toISOString().slice(0, 10),
        body: body.slice(0, 6000),
      };
      if (body && hasHangul(body)) {
        line.bodyIsKorean = true;
        bodyKo++;
      }
      if (hasHangul(r.title)) {
        line.titleIsKorean = true;
        titleKo++;
      }
      out.push(line);
    }
    await sleep(REQUEST_INTERVAL_MS);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out.map((o) => JSON.stringify(o)).join("\n") + "\n", "utf8");
  const range = offset > 0 ? ` (${offset + 1}번째부터)` : "";
  console.log(`[patch:ko] ${out.length}건을 ${outPath} 에 썼다 (게임 ${byApp.size}개)${range}`);
  if (bodyKo > 0) console.log(`[patch:ko] 본문이 이미 한글: ${bodyKo}건 — 옮기지 말고 그대로 요약한다`);
  if (titleKo > 0) console.log(`[patch:ko] 제목이 이미 한글: ${titleKo}건 — 원문을 그대로 되쓴다`);
  if (missing > 0) console.log(`[patch:ko] 본문을 못 받음(목록에서 밀려난 옛 공지): ${missing}건 — 제목만으로 쓴다`);
  console.log("[patch:ko] 뽑은 만큼 되쓴다 — 빈 채로 두면 다음 회차가 같은 행을 다시 집는다");
}

interface DoneLine {
  id: string;
  titleKo: string;
  summaryKo?: string | null;
}

async function runImport(inPath: string, model: string): Promise<void> {
  const text = fs.readFileSync(inPath, "utf8");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const db = getDb();
  const now = new Date();
  let wrote = 0;
  for (const line of lines) {
    const d = JSON.parse(line) as DoneLine;
    if (!d.id || !d.titleKo) {
      console.warn(`[patch:ko] id 나 titleKo 가 없는 줄은 건너뛴다: ${line.slice(0, 80)}`);
      continue;
    }
    await db
      .update(patchNotes)
      .set({ titleKo: d.titleKo, summaryKo: d.summaryKo ?? null, summaryModel: model, summarizedAt: now })
      .where(eq(patchNotes.id, d.id));
    wrote++;
  }
  console.log(`[patch:ko] ${wrote}건을 되썼다 (summary_model=${model})`);
  // 남은 수를 여기서 세는 이유: 회차 사이에 진행을 따로 재려면 또 한 번 붙어야 하고, 그 한 번을 자꾸 건너뛴다
  const [rest] = await db
    .select({ n: count() })
    .from(patchNotes)
    .where(and(eq(patchNotes.source, "steam"), isNull(patchNotes.titleKo)));
  console.log(`[patch:ko] 남은 기록: ${rest?.n ?? 0}건`);
  console.log("[patch:ko] 화면 반영은 다음 수집이 그 게임을 건드릴 때다 — game:<slug> 태그가 그때 깨진다");
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

async function main(): Promise<void> {
  if (process.argv.includes("--export")) {
    await runExport(
      Number(arg("--limit") ?? DEFAULT_LIMIT),
      Number(arg("--offset") ?? 0),
      arg("--out") ?? DEFAULT_OUT,
    );
    return;
  }
  const inPath = arg("--import");
  if (inPath) {
    await runImport(inPath, arg("--model") ?? "claude-opus-5");
    return;
  }
  console.log(
    "사용법: pnpm patch:ko --export [--limit N] [--offset N] [--out 경로] | pnpm patch:ko --import <경로> [--model 이름]",
  );
}

void main();
