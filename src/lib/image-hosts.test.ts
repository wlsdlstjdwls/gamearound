import { describe, expect, it } from "vitest";
import { isOptimizableImage } from "@/lib/image-hosts";

describe("isOptimizableImage", () => {
  it("등록된 스팀 호스트와 블롭 저장소는 최적화한다", () => {
    expect(isOptimizableImage("https://cdn.akamai.steamstatic.com/a.jpg")).toBe(true);
    expect(isOptimizableImage("https://abc.public.blob.vercel-storage.com/x.png")).toBe(true);
  });
  it("등록 안 된 호스트, http, 망가진 주소는 원본으로 띄운다", () => {
    expect(isOptimizableImage("https://store.nintendo.co.kr/media/a.jpg")).toBe(false);
    expect(isOptimizableImage("http://cdn.akamai.steamstatic.com/a.jpg")).toBe(false);
    expect(isOptimizableImage("not a url")).toBe(false);
  });
});
