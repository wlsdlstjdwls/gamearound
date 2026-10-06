// Epic 사양 파서 테스트 — fixture 기반(store-content.ak.epicgames.com, locale=en-US), 네트워크 없음
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { epicProductSlug, parseEpicRequirements } from "./epic/parse-requirements";
import { epicAdapter } from "./epic";

const fixture = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseEpicRequirements", () => {
  const snaps = parseEpicRequirements(fixture("epic-product-requirements.json"));
  const find = (os: string, tier: string) => snaps.find((s) => s.osFamily === os && s.tier === tier);

  it("OS 와 등급마다 한 행씩 낸다", () => {
    expect(find("windows", "minimum")).toBeTruthy();
    expect(find("windows", "recommended")).toBeTruthy();
    expect(find("mac", "minimum")).toBeTruthy();
  });

  it("값을 칸에 맞게 접는다", () => {
    const w = find("windows", "minimum")!;
    expect(w.cpuText).toBe("Dual Core 2.4 GHz");
    expect(w.ramMb).toBe(4096);
    expect(w.storageMb).toBe(15360);
  });

  it("탭과 잇단 공백을 걷어낸다 — 응답에 그대로 들어 있다", () => {
    expect(find("windows", "minimum")!.cpuText).not.toMatch(/\s{2,}|\t/);
  });

  it("라벨 앞의 OS 이름을 뗀다 — 안 떼면 다섯 칸이 전부 비고로 밀린다", () => {
    // 앨런 웨이크 2 는 "Windows OS", "Windows Processor" 로 적는다. 먼저 온 페이지(하데스)가
    // 이미 windows 를 채웠으므로 중복은 버려지고, 그 규칙 자체는 아래 단위 확인으로 본다
    const only = parseEpicRequirements({
      pages: [{ data: { requirements: { systems: [{ systemType: "Windows", details: [
        { title: "Windows Processor", minimum: "Intel i5-7600K" },
        { title: "Windows Memory", minimum: "16 GB RAM" },
      ] }] } } }],
    });
    expect(only[0].cpuText).toBe("Intel i5-7600K");
    expect(only[0].ramMb).toBe(16384);
  });

  it("모르는 라벨은 버리지 않고 비고로 남긴다", () => {
    expect(find("mac", "recommended")!.noteText).toBeTruthy();
  });

  it("같은 (OS, 등급)이 두 페이지에 오면 먼저 온 것만 남긴다 — DB 키가 그것이다", () => {
    const keys = snaps.map((s) => `${s.osFamily}:${s.tier}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("모르는 systemType 은 통째로 건너뛴다 — 윈도우로 때려 넣지 않는다", () => {
    const out = parseEpicRequirements({
      pages: [{ data: { requirements: { systems: [{ systemType: "Nintendo Switch", details: [{ title: "Memory", minimum: "4 GB" }] }] } } }],
    });
    expect(out).toEqual([]);
  });

  it("사양이 없는 응답은 빈 배열", () => {
    expect(parseEpicRequirements({ pages: [{ data: {} }] })).toEqual([]);
    expect(parseEpicRequirements({})).toEqual([]);
  });
});

describe("epicProductSlug", () => {
  it("저장해 둔 스토어 주소에서 slug 를 뽑는다 — 외부 ID 는 이 API 가 모른다", () => {
    expect(epicProductSlug("https://store.epicgames.com/ko/p/hades")).toBe("hades");
    expect(epicProductSlug("https://store.epicgames.com/en-US/p/alan-wake-2?lang=ko")).toBe("alan-wake-2");
  });

  it("주소가 없거나 모양이 다르면 null — 그 게임은 사양을 안 묻는다", () => {
    expect(epicProductSlug(null)).toBeNull();
    expect(epicProductSlug("https://store.epicgames.com/ko/browse")).toBeNull();
  });
});

// 새 형식 주소(이름-6자리해시)는 콘텐츠 API 에 없다. 404 를 실패로 던지면 물어봤다는 기록이 안 남아 대기열 앞을 영영 막는다
describe("epicAdapter.fetchRequirements", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("콘텐츠 페이지가 없으면(404) 사양 없음으로 답한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(epicAdapter.fetchRequirements!("https://store.epicgames.com/ko/p/sunblockers-83e34a")).resolves.toEqual({ requirements: [] });
  });

  it("그 밖의 실패는 그대로 던진다(다음 회차가 다시 묻는다)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("forbidden", { status: 403 })));
    await expect(epicAdapter.fetchRequirements!("https://store.epicgames.com/ko/p/it-takes-two")).rejects.toThrow("403");
  });
});
