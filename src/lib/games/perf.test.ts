import { describe, expect, it } from "vitest";
import { perfFromPcgwWikitext, perfFromXboxAttributes, perfHeadline } from "./perf";

describe("perfFromXboxAttributes", () => {
  it("사이버펑크 2077 한국 응답의 속성", () => {
    const names = ["BroadcastSupport", "Capability4k", "CapabilityHDR", "SinglePlayer", "RayTracing", "60fps", "DolbyAtmos", "ConsoleGen9Optimized", "XblAchievements"];
    expect(perfFromXboxAttributes(names)).toEqual(["4k", "60fps", "hdr", "raytracing", "series_optimized"]);
  });
  it("모르는 이름과 빈 값은 버린다", () => expect(perfFromXboxAttributes([null, "XboxLive", undefined])).toEqual([]));
});

describe("perfFromPcgwWikitext", () => {
  const text = ["|4k ultra hd                = true", "|60 fps = true", "|120 fps = true", "|hdr = limited", "|ray tracing = true", "|upscaling = true", "|framegen = false", "|ultrawidescreen = limited"].join("\n");
  it("true 는 켜고 false 는 끈다, hdr 은 limited 도 켠다", () => {
    expect(perfFromPcgwWikitext(text)).toEqual(["4k", "120fps", "60fps", "hdr", "raytracing", "upscaling"]);
  });
});

describe("perfHeadline", () => {
  it("최대 해상도와 프레임", () => expect(perfHeadline(["4k", "60fps", "120fps"])).toBe("4K | 120fps"));
  it("모르면 null", () => expect(perfHeadline(["hdr"])).toBeNull());
});
