// 홈 조회가 DB 에서 실패했을 때 무엇을 할지 고른다.
//
// 운영 실행 중에는 던진다. 홈은 ISR(1시간) 이라, 재생성이 던지면 Next 가 직전에 잘 만든 화면을 그대로 내준다 —
// 빈 홈을 잡아 두면 DB 가 돌아와도 다음 재생성까지 한 시간 내내 빈 화면이 캐시에 앉는다(2026-10-13 Neon 한도 초과 때 실제로 그랬다).
// 빌드 중에는 던지지 않는다. DB 가 죽은 날 배포까지 막히면 안 되고, 빈 셸은 첫 재생성이 덮는다.
// 개발 환경에서만 설정 안내를 보인다. 회원 화면에 원인을 적지 않는다는 원칙은 lib/messages 주석에 있다.

export type HomeDbFailure = "rethrow" | "notice" | "dev-hint";

/** Next 가 빌드 중에 process.env.NEXT_PHASE 에 넣는 값(next/constants 의 PHASE_PRODUCTION_BUILD) */
const BUILD_PHASE = "phase-production-build";

export function homeDbFailure(env: { nodeEnv?: string; nextPhase?: string }): HomeDbFailure {
  if (env.nodeEnv === "development") return "dev-hint";
  if (env.nextPhase === BUILD_PHASE) return "notice";
  return "rethrow";
}
