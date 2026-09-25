import { describe, expect, it } from "vitest";
import { osFamilyFromUserAgent, parseWebglRenderer } from "./detect";
import { normalizeModelKey } from "./normalize";

describe("parseWebglRenderer", () => {
  it("ANGLE 세 칸에서 가운데(부품)를 집는다", () => {
    const r = parseWebglRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)");
    expect(r).toBe("NVIDIA GeForce RTX 3060");
  });

  it("인텔 내장도 계열 이름을 남긴다 — 그 말이 곧 모델이다", () => {
    const r = parseWebglRenderer("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)");
    expect(normalizeModelKey(r!)).toBe(normalizeModelKey("UHD Graphics 620"));
  });

  it("ANGLE 을 안 거친 문자열의 꼬리를 뗀다", () => {
    expect(parseWebglRenderer("NVIDIA GeForce GTX 1060/PCIe/SSE2")).toBe("NVIDIA GeForce GTX 1060");
    expect(parseWebglRenderer("AMD Radeon Pro 5500M OpenGL Engine")).toBe("AMD Radeon Pro 5500M");
  });

  it("뽑은 이름이 사전 열쇠로 이어진다 — 이 파서의 쓸모가 거기에 있다", () => {
    const r = parseWebglRenderer("ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)");
    expect(normalizeModelKey(r!)).toBe(normalizeModelKey("GeForce GTX 1060 6GB"));
  });

  it("빈 값과 잡음만 남는 값은 null", () => {
    expect(parseWebglRenderer("")).toBeNull();
    expect(parseWebglRenderer("ANGLE (Google Inc., SwiftShader, Vulkan)")).toBeNull();
  });

  it("소프트웨어 렌더러는 괄호가 겹쳐도 null — 조각이 그래픽 이름 행세를 하지 않는다", () => {
    expect(parseWebglRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")).toBeNull();
    expect(parseWebglRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBeNull();
    expect(parseWebglRenderer("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBeNull();
  });
});

describe("osFamilyFromUserAgent", () => {
  it("세 갈래를 가른다", () => {
    expect(osFamilyFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(osFamilyFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("mac");
    expect(osFamilyFromUserAgent("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
  });

  it("아이폰, 아이패드를 맥으로 보지 않는다 — 이 축이 다루는 기기가 아니다", () => {
    expect(osFamilyFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBeNull();
    expect(osFamilyFromUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBeNull();
  });

  it("모르면 null — 못 알아본 OS 를 윈도우로 때려 넣지 않는다", () => {
    expect(osFamilyFromUserAgent("아무 말")).toBeNull();
  });
});
