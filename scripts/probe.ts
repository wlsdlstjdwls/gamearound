// 실행 환경 진단 진입점 — pnpm probe
//   이 환경(로컬, Actions 러너, 프록시 경유)에서 어느 스토어가 열리는지 실측해 찍는다.
//
// 라우트(/api/debug/reachability)와 같은 서비스를 쓴다. 진입점이 둘인 이유:
//   라우트  — 배포된 곳(Vercel 서울 리전 등)에서 재려면 그 위에서 돌아야 한다
//   스크립트 — 배포 없이 러너나 프록시 설정을 시험하려면 워크플로에서 바로 돌려야 한다
// 종료 코드는 늘 0 이다. 차단은 "고장" 이 아니라 알아내려던 사실이라 워크플로를 빨갛게 만들지 않는다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { probeStoreReachability } from "@/server/services/reachability";
import { crawlProxyUrl } from "@/server/adapters/http";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

async function main(): Promise<void> {
  const report = await probeStoreReachability();
  // 프록시 주소에는 자격 증명이 들어 있다 — 설정 여부만 찍는다
  console.log(`[probe] 리전: ${report.region} | 출구 IP: ${report.egressIp} | 프록시: ${crawlProxyUrl() ? "설정됨" : "없음"}`);
  for (const p of report.probes) {
    console.log(`[probe] ${p.source.padEnd(14)} ${p.verdict.padEnd(8)} status=${p.status ?? "-"} bytes=${p.bytes ?? "-"} ${p.elapsedMs}ms`);
    console.log(`          ${p.checks}`);
    console.log(`          ${p.detail}`);
  }
  console.log("[probe] 요약");
  for (const line of report.summary) console.log(`  - ${line}`);
}

main().catch((e: unknown) => {
  console.error(`[probe] 진단 자체가 실패했다: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
