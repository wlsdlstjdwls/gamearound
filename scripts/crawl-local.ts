// 로컬 수집 진입점 — 두 모드가 있다.
//   pnpm crawl:local [--limit=N]   러너 IP 로 막힌 소스(LOCAL_ONLY_SOURCES)
//   pnpm crawl:seed                발견을 로컬이 맡는 스토어(LOCAL_SEED_SOURCES)
// 두 모드를 한 파일에 둔 이유: 하는 일이 "소스 목록을 받아 crawl.ts 를 순서대로 띄운다" 로 같고,
// 다른 것은 어느 상수에서 목록과 몫을 읽느냐뿐이다. 왜 발견이 로컬인지는 LOCAL_SEED_SOURCES 주석에 있다.
// 왜 따로 있나: nintendo(한국 eShop)와 epic(Cloudflare)은 데이터센터, 해외 IP 를 막아
// GitHub Actions 러너에서 아무것도 못 가져온다(sync/constants 의 LOCAL_ONLY_SOURCES 주석).
// 어느 소스를 여기서 돌릴지는 그 상수 한 곳에서만 정한다 — 이 파일은 순서대로 실행만 한다.
//
// 종료 코드는 crawl.ts 와 같게 맞춘다: 0 = 전부 ok, 2 = 일부 partial, 1 = 하나라도 failed.
// 한 소스가 실패해도 다음 소스는 계속 간다(워크플로의 continue-on-error 와 같은 뜻).
import path from "node:path";
import { spawn } from "node:child_process";
import { EPIC_ENABLE_ENV } from "@/server/adapters/epic";
import { LOCAL_ONLY_SOURCES, LOCAL_SEED_PLAN, LOCAL_SEED_SOURCES, LOCAL_SEED_TOP } from "@/server/sync/constants";

const CRAWL_SCRIPT = path.resolve(process.cwd(), "scripts/crawl.ts");

/** tsx 로 crawl.ts 를 띄운다. 같은 프로세스에서 부르지 않는 이유: 소스 하나가 죽어도 나머지가 계속 가야 한다 */
function runSourceProcess(source: string, extra: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", CRAWL_SCRIPT, `--source=${source}`, ...extra], {
      stdio: "inherit",
      shell: process.platform === "win32", // npx 는 윈도우에서 .cmd 라 shell 이 필요하다
      // Epic 은 기본 비활성이다 — 여기가 바로 "켜도 되는 자리"라서 자식 프로세스에만 켜 준다
      env: { ...process.env, [EPIC_ENABLE_ENV]: process.env[EPIC_ENABLE_ENV] ?? "1" },
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/** 이번 실행이 돌 소스와 소스별 인자. 모드가 다른 것은 읽는 상수뿐이다 */
function planOf(seedMode: boolean): Array<{ source: string; args: string[] }> {
  if (seedMode) {
    return LOCAL_SEED_SOURCES.map((source) => {
      const plan = LOCAL_SEED_PLAN[source];
      return {
        source,
        args: [
          ...(plan ? [`--seed-top=${plan.seedTop}`] : []),
          ...(plan?.limit ? [`--limit=${plan.limit}`] : []),
        ],
      };
    });
  }
  return LOCAL_ONLY_SOURCES.map((source) => {
    const seedTop = LOCAL_SEED_TOP[source];
    return { source, args: seedTop ? [`--seed-top=${seedTop}`] : [] };
  });
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const seedMode = argv.includes("--seed");
  // 손으로 부를 때의 덮어쓰기. 시드 모드는 소스별 limit 이 상수에 있어 이 값이 뒤에 붙어 이긴다
  const passthrough = argv.filter((a) => a.startsWith("--limit="));
  let failed = false;
  let partial = false;
  for (const { source, args: planArgs } of planOf(seedMode)) {
    const args = [...planArgs, ...passthrough];
    console.log(`[crawl:${seedMode ? "seed" : "local"}] ${source} 시작 ${args.join(" ")}`);
    const code = await runSourceProcess(source, args);
    if (code === 1) failed = true;
    if (code === 2) partial = true;
  }
  if (failed) return 1;
  return partial ? 2 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[crawl:local] 예외: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    process.exit(1);
  });
