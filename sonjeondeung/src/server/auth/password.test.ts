import { describe, expect, it } from "vitest";
import { getDummyHash, hashPassword, verifyPassword } from "./password";

describe("password (scrypt)", () => {
  it("해시 → 검증 성공, 다른 비밀번호는 실패", async () => {
    const h = await hashPassword("abcd1234");
    expect(h.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("abcd1234", h)).toBe(true);
    expect(await verifyPassword("abcd1235", h)).toBe(false);
  });
  it("같은 비밀번호도 salt가 달라 해시가 다르다", async () => {
    expect(await hashPassword("x1y2z3w4")).not.toBe(await hashPassword("x1y2z3w4"));
  });
  it("깨진 형식/null은 throw 없이 false", async () => {
    expect(await verifyPassword("a", null)).toBe(false);
    expect(await verifyPassword("a", "bcrypt$...")).toBe(false);
    expect(await verifyPassword("a", "scrypt$x$8$1$AAAA$BBBB")).toBe(false);
  });
  it("유니코드 NFKC 정규화 — 전각/합성 문자가 같은 비밀번호로 취급", async () => {
    const h = await hashPassword("café1234");
    expect(await verifyPassword("café" + "1234", h)).toBe(true);
  });
  it("더미 해시는 한 번만 만들어 재사용", async () => {
    expect(await getDummyHash()).toBe(await getDummyHash());
  });
});
