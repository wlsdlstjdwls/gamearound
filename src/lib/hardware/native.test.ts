import { describe, expect, it } from "vitest";
import { nativeSupport } from "./native";

const pc = (mac: boolean | null, win: boolean | null = true) => ({
  nativeWindows: win,
  nativeMac: mac,
  nativeLinux: null,
});

describe("nativeSupport", () => {
  it("한 스토어라도 있다고 하면 있는 것이다", () => {
    expect(nativeSupport([pc(false), pc(true)], "mac")).toBe("yes");
  });

  it("모두 없다고 하면 없는 것이다", () => {
    expect(nativeSupport([pc(false), pc(false)], "mac")).toBe("no");
  });

  it("아무도 말하지 않으면 모른다 — 없다고 말하지 않는다", () => {
    expect(nativeSupport([pc(null)], "mac")).toBe("unknown");
    expect(nativeSupport([], "mac")).toBe("unknown");
  });

  it("콘솔만 있는 게임은 PC 를 말하지 않는다", () => {
    const console = { nativeWindows: null, nativeMac: null, nativeLinux: null };
    expect(nativeSupport([console], "windows")).toBe("unknown");
  });

  it("OS 마다 따로 본다", () => {
    expect(nativeSupport([pc(true)], "windows")).toBe("yes");
    expect(nativeSupport([pc(true)], "linux")).toBe("unknown");
  });
});
