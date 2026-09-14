// 초기 시드 — genres 기본값 삽입 + Steam 인기/할인 상위 N개 시드 (§11-1: 전체가 아닌 상위 N개).
//   tsx scripts/seed.ts [--top=N]   (기본 100)
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { getDb } from "@/server/db/client";
import { genres, subscriptions } from "@/server/db/schema";
import { GAMEPASS_COLLECTIONS } from "@/server/adapters/gamepass";
import { runSource } from "@/server/sync/run-source";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** Steam(koreana) 장르 표기와 맞춘 기본 장르 */
export const DEFAULT_GENRES = [
  "액션", "어드벤처", "캐주얼", "인디", "대규모 멀티플레이어", "레이싱", "RPG",
  "시뮬레이션", "스포츠", "전략", "무료 플레이", "앞서 해보기",
];

const DEFAULT_TOP = 100;

/**
 * 구독 서비스 마스터. key 는 코드가 참조하는 안정적 식별자라 바꾸지 않는다.
 *
 * 포함 목록을 채우는 길이 둘이다.
 *   catalog_id 가 있는 것 — 카탈로그 전체를 받아 맞춘다(run-subscriptions). Game Pass.
 *   catalog_id 가 없는 것 — 게임 단건 응답이 포함 여부를 말해 준다(subscription-writer).
 *     PlayStation 은 카탈로그 API 가 없어 이쪽이다. 키는 어댑터의 PSSTORE_INCLUSION_CTA 와 맞춰야 한다.
 * platform 은 카탈로그 경로가 대상 행을 찾을 때만 쓴다 — PS Plus 는 ps4, ps5 양쪽이라 null 이다.
 *
 * 라벨은 한국 스토어 표기를 따른다(2026-09-14 실측) — 다른 나라의 Extra, Premium 이 여기서는 스페셜, 디럭스다.
 */
export const DEFAULT_SUBSCRIPTIONS = [
  { key: "gamepass_console", labelKo: "Game Pass 콘솔", platform: "xbox" as const, catalogId: GAMEPASS_COLLECTIONS.console },
  { key: "gamepass_pc", labelKo: "PC Game Pass", platform: "xbox" as const, catalogId: GAMEPASS_COLLECTIONS.pc },
  { key: "psplus_special", labelKo: "PlayStation Plus 스페셜", platform: null, catalogId: null },
  { key: "psplus_deluxe", labelKo: "PlayStation Plus 디럭스", platform: null, catalogId: null },
  { key: "ea_play_ps", labelKo: "EA Play", platform: null, catalogId: null },
  { key: "ubisoft_plus_ps", labelKo: "Ubisoft+ Classics", platform: null, catalogId: null },
];

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

  await db.insert(subscriptions).values(DEFAULT_SUBSCRIPTIONS).onConflictDoNothing();
  console.log(`[seed] subscriptions 기본값 ${DEFAULT_SUBSCRIPTIONS.length}개 확인`);

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
