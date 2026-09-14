// GitHub Actions 진입점 — 설계서 §2/§4.3.
//   tsx scripts/crawl.ts --source=steam [--limit=N] [--seed-top=N] [--match=N|--no-match]
//   --seed-top=N : 카탈로그를 훑어 아직 없는 게임 N개까지 발견해 등록 (SEEDABLE_SOURCES)
//   --match=N : 수집 전에 해당 소스 ref 가 없는 게임 N개를 매칭(§4.2). steam/rss 외 소스는 기본 50
// 종료 코드: 0 = ok/skipped, 2 = partial(일부 실패), 1 = failed/인자 오류
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { ALL_SOURCES, getDisabledReason, isSearchableSource, isSource, isSourceEnabled } from "@/server/adapters";
import { runSource } from "@/server/sync/run-source";
import { SEEDABLE_SOURCES } from "@/server/sync/constants";
import { matchUnmatchedGames } from "@/server/sync/match";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true }); // .env 폴백 (있으면)

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? "true";
  }
  return out;
}

function parsePositiveInt(v: string | undefined, name: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`--${name} 은 양의 정수여야 합니다: ${v}`);
  return n;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const source = args.source;
  if (!source || !isSource(source)) {
    console.error(`사용법: tsx scripts/crawl.ts --source=<${ALL_SOURCES.join("|")}> [--limit=N] [--seed-top=N]`);
    return 1;
  }
  if (!isSourceEnabled(source)) {
    // 비활성 소스는 sync_logs 도 남기지 않고 즉시 종료 (워크플로 단계는 유지해 활성화 시 바로 돌게)
    console.log(`[crawl] ${source} 비활성 — 건너뜀: ${getDisabledReason(source)}`);
    return 0;
  }
  const limit = parsePositiveInt(args.limit, "limit");
  const seedTop = parsePositiveInt(args["seed-top"], "seed-top");
  if (seedTop && !SEEDABLE_SOURCES.includes(source)) {
    console.error(`--seed-top 은 ${SEEDABLE_SOURCES.join("/")} 에서만 사용할 수 있습니다 (카탈로그 탐색을 지원하는 소스)`);
    return 1;
  }

  const started = Date.now();

  // §4.2 매칭: 기준 소스(steam)와 rss 를 제외한 소스는 수집 전에 미매칭 게임을 먼저 매칭.
  // 회사, 구독 소스는 게임 제목으로 검색하는 개념이 없어 매칭 단계 자체를 건너뛴다.
  const matchLimit = args["no-match"] ? 0 : (parsePositiveInt(args.match, "match") ?? (source === "steam" || source === "rss" ? 0 : 50));
  if (matchLimit > 0 && isSearchableSource(source)) {
    const m = await matchUnmatchedGames(source, matchLimit);
    console.log(`[match] ${source}: ${JSON.stringify(m)}`);
  }

  const result = await runSource(source, { limit, seedTop });
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[crawl] ${source} 완료 (${sec}s): ${JSON.stringify(result)}`);

  if (result.status === "ok" || result.status === "skipped") return 0;
  if (result.status === "partial") {
    console.log(`::warning::${source} 일부 실패 (${result.failed}건): ${result.errorSample ?? ""}`);
    return 2;
  }
  console.log(`::error::${source} 실패: ${result.errorSample ?? ""}`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[crawl] 예외: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    process.exit(1);
  });
