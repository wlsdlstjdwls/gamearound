import { describe, expect, it } from "vitest";
import { actionErrorMessage, isDbUnavailable, isInternalDbError } from "./db-errors";

/** 2026-10-13 실제로 받은 모양: drizzle 이 감싸고 cause 에 NeonDbError 가 붙는다 */
function quotaError(): Error {
  const neon = new Error('Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota. Upgrade your plan to increase limits."}');
  neon.name = "NeonDbError";
  const wrapped = new Error('Failed query: select "id" from "users"', { cause: neon });
  wrapped.name = "DrizzleQueryError";
  return wrapped;
}

function constraintError(): Error {
  const neon = new Error('duplicate key value violates unique constraint "users_email_unique"');
  neon.name = "NeonDbError";
  const wrapped = new Error('Failed query: insert into "users"', { cause: neon });
  wrapped.name = "DrizzleQueryError";
  return wrapped;
}

describe("isDbUnavailable", () => {
  it("한도 초과 402 를 cause 사슬 안에서 찾는다", () => {
    expect(isDbUnavailable(quotaError())).toBe(true);
  });

  it("연결이 끊긴 것도 안 열림으로 본다", () => {
    expect(isDbUnavailable(new TypeError("fetch failed"))).toBe(true);
    expect(isDbUnavailable(new Error("read ECONNRESET"))).toBe(true);
  });

  it("질의 오류와 사람말 예외는 안 열림이 아니다", () => {
    expect(isDbUnavailable(constraintError())).toBe(false);
    expect(isDbUnavailable(new Error("로그인이 필요해요"))).toBe(false);
    expect(isDbUnavailable(null)).toBe(false);
  });
});

describe("isInternalDbError", () => {
  it("drizzle, Neon 예외는 원문을 내면 안 된다", () => {
    expect(isInternalDbError(constraintError())).toBe(true);
  });

  it("서비스가 던진 사람말은 걸리지 않는다", () => {
    expect(isInternalDbError(new Error("이미 찜한 게임이에요"))).toBe(false);
  });
});

describe("actionErrorMessage", () => {
  const FALLBACK = "처리하지 못했어요";
  const DOWN = "점검 중이에요";

  it("DB 가 안 열리면 점검 안내", () => {
    expect(actionErrorMessage(quotaError(), FALLBACK, DOWN)).toBe(DOWN);
  });

  it("질의 오류면 SQL 대신 fallback", () => {
    expect(actionErrorMessage(constraintError(), FALLBACK, DOWN)).toBe(FALLBACK);
  });

  it("사람말 예외는 그대로, 값이 아닌 것은 fallback", () => {
    expect(actionErrorMessage(new Error("로그인이 필요해요"), FALLBACK, DOWN)).toBe("로그인이 필요해요");
    expect(actionErrorMessage("x", FALLBACK, DOWN)).toBe(FALLBACK);
  });
});
