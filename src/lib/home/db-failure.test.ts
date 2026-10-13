import { describe, expect, it } from "vitest";
import { homeDbFailure } from "./db-failure";

describe("homeDbFailure", () => {
  it("개발 환경에서만 설정 안내를 보인다", () => {
    expect(homeDbFailure({ nodeEnv: "development" })).toBe("dev-hint");
  });

  it("빌드 중에는 던지지 않고 회원용 안내로 접는다", () => {
    expect(homeDbFailure({ nodeEnv: "production", nextPhase: "phase-production-build" })).toBe("notice");
  });

  it("운영 실행 중에는 던져서 직전 캐시를 지킨다", () => {
    expect(homeDbFailure({ nodeEnv: "production" })).toBe("rethrow");
    expect(homeDbFailure({})).toBe("rethrow");
  });
});
