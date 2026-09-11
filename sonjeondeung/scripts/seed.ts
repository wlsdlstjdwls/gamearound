// 초기 시드 — genres 기본값 삽입 + Steam 인기/할인 상위 N개 시드 (§11-1: 전체가 아닌 상위 N개).
//   tsx scripts/seed.ts [--top=N]   (기본 100)
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { getDb } from "@/server/db/client";
import { genres } from "@/server/db/schema";
import { runSource } from "@/server/sync/run-source";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** Steam(koreana) 장르 표기와 맞춘 기본 장르 */
export const DEFAULT_GENRES = [
  "액션", "어드벤처", "캐주얼", "인디", "대규모 멀티플레이어", "레이싱", "RPG",
  "시뮬레이션", "스포츠", "전략", "무료 플레이", "앞서 해보기",
];

const DEFAULT_TOP = 100;

async function main(): Promise<number> {
  const topArg = process.argv.slice(2).find((a) => a.startsWith("--top="))?.slice("--top=".length);
  const top = topArg ? Number(topArg) : DEFAULT_TOP;
  if (!Number.isInteger(top) || top <= 0) {
    console.error(`--top 은 양의 정수여야 합니다: ${topArg}`);
    return 1;
  }

  const db = getDb();
  await db.insert(genres).values(DEFAULT_GENRES.map((name) => ({ name }))).onConflictDoNothing();
  console.log(`[seed] genres 기본값 ${DEFAULT_GENRES.length}개 확인`);

  const result = await runSource("steam", { seedTop: top, limit: 1 });
  console.log(`[seed] steam 시드 결과: ${JSON.stringify(result)}`);
  return result.status === "failed" ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[seed] 예외: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    process.exit(1);
  });
