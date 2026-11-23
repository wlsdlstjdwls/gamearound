import { describe, expect, it } from "vitest";
import { perfFromPcgwWikitext, perfFromXboxAttributes, perfLines } from "./perf";

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

describe("perfLines", () => {
  it("해상도, 프레임은 가장 높은 값 하나", () =>
    expect(perfLines(["4k", "120fps", "60fps"])).toEqual([
      { label: "최대 해상도", values: ["4K"] },
      { label: "최대 프레임", values: ["120fps"] },
    ]));
  it("같은 갈래는 한 줄에 모으되 값은 따로", () =>
    expect(perfLines(["hdr", "raytracing", "upscaling", "framegen"])).toEqual([
      { label: "화질", values: ["HDR", "레이 트레이싱"] },
      { label: "성능 기술", values: ["업스케일링", "프레임 생성"] },
    ]));
  it("없으면 빈 배열", () => expect(perfLines([])).toEqual([]));
});
