// 초기 시드 — genres 기본값 삽입 + Steam 인기/할인 상위 N개 시드 (§11-1: 전체가 아닌 상위 N개).
//   tsx scripts/seed.ts [--top=N]   (기본 100)
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { getDb } from "@/server/db/client";
import { genres, hardwareModels, subscriptions } from "@/server/db/schema";
import { createdBy } from "@/server/db/audit";
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
 * 기종 사전의 기본값 — 설계서 §6.
 *
 * `code` 는 디지털 `platformEnum` 값과 같은 글자를 쓴다(steam, ps5, ...). 같은 글자를 쓰는 덕에
 * 상품의 기종과 게임의 플랫폼을 조인 없이 맞춰 볼 수 있다. 레트로 코드는 겹치는 값이 없어 자유롭다.
 *
 * 레트로를 이만큼만 넣은 이유: 매장이 실제로 파는 기종부터 넣는다. 사전을 미리 다 채우면
 * 고를 때 안 쓰는 값이 목록을 덮고, 어차피 관리자 화면이 붙으면 행 추가는 배포가 아니다.
 */
export const DEFAULT_HARDWARE_MODELS = [
  { code: "steam", nameKo: "PC (스팀)", nameEn: "Steam", maker: "Valve", mediaType: "digital", isRetro: false, sortOrder: 10 },
  { code: "epic", nameKo: "PC (에픽)", nameEn: "Epic Games", maker: "Epic", mediaType: "digital", isRetro: false, sortOrder: 11 },
  { code: "ps5", nameKo: "플레이스테이션 5", nameEn: "PlayStation 5", maker: "Sony", generation: 9, releaseYear: 2020, mediaType: "disc", isRetro: false, sortOrder: 20 },
  { code: "ps4", nameKo: "플레이스테이션 4", nameEn: "PlayStation 4", maker: "Sony", generation: 8, releaseYear: 2013, mediaType: "disc", isRetro: false, sortOrder: 21 },
  { code: "xbox", nameKo: "엑스박스", nameEn: "Xbox", maker: "Microsoft", generation: 9, mediaType: "disc", isRetro: false, sortOrder: 30 },
  { code: "switch2", nameKo: "닌텐도 스위치 2", nameEn: "Nintendo Switch 2", maker: "Nintendo", generation: 10, releaseYear: 2025, mediaType: "cartridge", isRetro: false, sortOrder: 40 },
  { code: "switch", nameKo: "닌텐도 스위치", nameEn: "Nintendo Switch", maker: "Nintendo", generation: 9, releaseYear: 2017, mediaType: "cartridge", isRetro: false, sortOrder: 41 },
  { code: "ps3", nameKo: "플레이스테이션 3", nameEn: "PlayStation 3", maker: "Sony", generation: 7, releaseYear: 2006, mediaType: "disc", isRetro: true, sortOrder: 50 },
  { code: "psp", nameKo: "PSP", nameEn: "PlayStation Portable", maker: "Sony", generation: 7, releaseYear: 2004, mediaType: "disc", isRetro: true, sortOrder: 51 },
  { code: "psvita", nameKo: "PS 비타", nameEn: "PlayStation Vita", maker: "Sony", generation: 8, releaseYear: 2011, mediaType: "cartridge", isRetro: true, sortOrder: 52 },
  { code: "3ds", nameKo: "닌텐도 3DS", nameEn: "Nintendo 3DS", maker: "Nintendo", generation: 8, releaseYear: 2011, mediaType: "cartridge", isRetro: true, sortOrder: 60 },
  { code: "nds", nameKo: "닌텐도 DS", nameEn: "Nintendo DS", maker: "Nintendo", generation: 7, releaseYear: 2004, mediaType: "cartridge", isRetro: true, sortOrder: 61 },
  { code: "gba", nameKo: "게임보이 어드밴스", nameEn: "Game Boy Advance", maker: "Nintendo", generation: 6, releaseYear: 2001, mediaType: "cartridge", isRetro: true, sortOrder: 62 },
  { code: "sfc", nameKo: "슈퍼패미컴", nameEn: "Super Famicom", maker: "Nintendo", generation: 4, releaseYear: 1990, mediaType: "cartridge", isRetro: true, sortOrder: 70 },
  { code: "md", nameKo: "메가드라이브", nameEn: "Mega Drive", maker: "Sega", generation: 4, releaseYear: 1988, mediaType: "cartridge", isRetro: true, sortOrder: 71 },
];

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

  // 기종은 상품(products.hardware_code)이 가리키는 사전이라 상품을 만들기 전에 서 있어야 한다
  await db.insert(hardwareModels).values(DEFAULT_HARDWARE_MODELS.map((m) => ({ ...m, ...createdBy("system") }))).onConflictDoNothing();
  console.log(`[seed] hardware_models 기본값 ${DEFAULT_HARDWARE_MODELS.length}개 확인`);

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
