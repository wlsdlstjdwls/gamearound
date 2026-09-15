// 실행 환경 진단 — "여기서는 어느 스토어가 열리나" 를 실측한다.
//
// 왜 필요한가: 막히는 방식이 소스마다 달라 로그만 보고는 구분이 안 된다.
//   닌텐도 — 한국 밖 IP 에 202 + 빈 본문. 상태 코드는 정상이라 "검색 결과 0건" 과 똑같이 보인다
//   Epic  — 데이터센터 IP 는 403, 게다가 Node 의 TLS 지문도 막혀 원인이 겹친다
// 그래서 배포 환경(Vercel 서울 리전 등)을 바꿀 때마다 여기로 한 번 찔러 보고 판단한다.
//
// 구성: classify(판정, 순수) | run(한 경로 찌르기) | stores(무엇을 찌를지)
import { VERCEL_REGION_ENV } from "@/server/adapters/http";
import { summarize, type ProbeResult } from "./classify";
import { egressIp } from "./run";
import { runStoreProbes } from "./stores";

export * from "./classify";

export interface ReachabilityReport {
  /** Vercel 이 알려주는 실행 리전(icn1 = 서울). 없으면 Vercel 이 아니다 */
  region: string;
  /** 나가는 IP. 지오 차단인지 대역 차단인지 가릴 때 쓴다 */
  egressIp: string;
  checkedAt: string;
  probes: ProbeResult[];
  /** 결과를 "그래서 무엇을 하면 되는가" 로 옮긴 문장들 */
  summary: string[];
}

export async function probeStoreReachability(): Promise<ReachabilityReport> {
  const [ip, probes] = await Promise.all([egressIp(), runStoreProbes()]);

  return {
    region: process.env[VERCEL_REGION_ENV] ?? "로컬 (Vercel 아님)",
    egressIp: ip,
    checkedAt: new Date().toISOString(),
    probes,
    summary: summarize(probes),
  };
}
