// 사양 파서 테스트 — fixture 기반, 네트워크 없음.
// 픽스처는 2026-09-18 에 실제로 받은 응답이다(할로우 나이트 367520: 윈도우, 맥, 리눅스 세 벌 전부 있다).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAppRequirements, parseRequirementBlock, parseRequirements, parseSizeMb } from "./steam";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

const li = (rows: string) => `<strong>Minimum:</strong><br><ul class="bb_ul">${rows}</ul>`;

describe("parseSizeMb", () => {
  it("단위를 MB 로 접는다", () => {
    expect(parseSizeMb("12 GB RAM")).toBe(12288);
    expect(parseSizeMb("371 MB available space")).toBe(371);
    expect(parseSizeMb("3.5 GB")).toBe(3584);
  });

  // 실측 표본에 "256 RAM"(단위 없음)이 있었다. 옛 게임이라 MB 가 맞겠지만 맞겠다는 것은 값이 아니다
  it("단위가 없으면 null 이다 — 짐작해서 채우지 않는다", () => {
    expect(parseSizeMb("256 RAM")).toBeNull();
    expect(parseSizeMb("")).toBeNull();
    expect(parseSizeMb(null)).toBeNull();
  });
});

describe("parseRequirementBlock", () => {
  it("라벨을 우리 칸으로 접고 숫자를 뽑는다", () => {
    const html = li(
      "<li><strong>OS:</strong> Windows 10<br></li>" +
        "<li><strong>Processor:</strong> INTEL CORE I5-8400 or AMD RYZEN 3 3300X<br></li>" +
        "<li><strong>Memory:</strong> 12 GB RAM<br></li>" +
        "<li><strong>Graphics:</strong> NVIDIA GEFORCE GTX 1060 3 GB<br></li>" +
        "<li><strong>DirectX:</strong> Version 12<br></li>" +
        "<li><strong>Storage:</strong> 60 GB available space</li>",
    );
    const r = parseRequirementBlock(html, "windows", "minimum")!;
    expect(r.osText).toBe("Windows 10");
    expect(r.cpuText).toBe("INTEL CORE I5-8400 or AMD RYZEN 3 3300X");
    expect(r.ramMb).toBe(12288);
    expect(r.gpuText).toBe("NVIDIA GEFORCE GTX 1060 3 GB");
    expect(r.directxText).toBe("Version 12");
    expect(r.storageMb).toBe(61440);
    expect(r.parseConfidence).toBe(1);
    // 원문을 버리지 않는다 — 파서를 고친 뒤 재수집 없이 다시 돌리는 근거다
    expect(r.rawHtml).toBe(html);
  });

  // 실측 60건에서 `OS *` 29회, `Hard Drive` 2회, `DirectX Version` 1회가 나왔다
  it("라벨 변종을 접는다 (별표, 등록상표, 다른 이름)", () => {
    const r = parseRequirementBlock(
      li(
        "<li><strong>OS *:</strong> Windows 7<br></li>" +
          "<li><strong>Hard Drive:</strong> 4.7 GB free space<br></li>" +
          "<li><strong>DirectX&reg;:</strong> Version 9.0</li>",
      ),
      "windows",
      "minimum",
    )!;
    expect(r.osText).toBe("Windows 7");
    expect(r.storageMb).toBe(4813);
    expect(r.directxText).toBe("Version 9.0");
  });

  // 실측: 노 맨즈 스카이의 권장 칸, ZeroSpace 의 리눅스 칸이 이 모양으로 온다
  it("비고만 있는 덩어리는 사양이 아니다 — 값 없는 칸을 화면에 세우지 않는다", () => {
    expect(parseRequirementBlock(li("<li>Requires a 64-bit processor and operating system</li>"), "windows", "recommended")).toBeNull();
    expect(parseRequirementBlock(li("<li>Available with Proton</li>"), "linux", "minimum")).toBeNull();
  });

  it("모르는 라벨과 라벨 없는 줄은 버리지 않고 비고로 모은다", () => {
    const r = parseRequirementBlock(
      li(
        "<li>Requires a 64-bit processor and operating system<br></li>" +
          "<li><strong>Sound Card:</strong> Windows Compatible Audio Device<br></li>" +
          "<li><strong>OS:</strong> Windows 10</li>",
      ),
      "windows",
      "minimum",
    )!;
    expect(r.noteText).toContain("64-bit");
    expect(r.noteText).toContain("Sound Card");
    // 네 칸 중 OS 하나만 건졌다
    expect(r.parseConfidence).toBe(0.25);
  });

  it("HTML 실체 문자를 되돌린다", () => {
    const r = parseRequirementBlock(li("<li><strong>Graphics:</strong> 32 MB with Hardware T&amp;L</li>"), "windows", "minimum")!;
    expect(r.gpuText).toBe("32 MB with Hardware T&L");
  });

  // 맥 빌드가 없는 게임은 빈 ul 로 온다(엘든 링 실측). 그 자리에 행을 만들면 "맥 사양 있음" 이 된다
  it("빈 목록은 null 이다", () => {
    expect(parseRequirementBlock('<strong>Minimum:</strong><br><ul class="bb_ul"></ul>', "mac", "minimum")).toBeNull();
    expect(parseRequirementBlock(undefined, "mac", "minimum")).toBeNull();
  });
});

describe("parseRequirements", () => {
  it("사양이 없는 게임은 빈 배열을 준다 — 스팀은 그 자리에 빈 배열을 보낸다", () => {
    expect(parseRequirements({ pc_requirements: [], mac_requirements: [], linux_requirements: [] })).toEqual([]);
  });

  it("OS 3 × 등급 2 를 각각 한 덩어리로 가른다", () => {
    const rows = parseAppRequirements(fixture("steam-appdetails-requirements.json"), "367520");
    // 할로우 나이트는 세 OS 모두 최소, 권장을 갖는다(2026-09-18 실측)
    expect(rows).toHaveLength(6);
    const win = rows.filter((r) => r.osFamily === "windows");
    expect(win.map((r) => r.tier)).toEqual(["minimum", "recommended"]);
    expect(win[0].ramMb).toBe(4096);
    expect(win[1].ramMb).toBe(8192);
    expect(rows.find((r) => r.osFamily === "mac")!.osText).toContain("Big Sur");
    expect(rows.find((r) => r.osFamily === "linux")!.osText).toContain("Ubuntu");
    // 맥, 리눅스에는 DirectX 줄이 없다 — 없는 칸을 지어내지 않는다
    expect(rows.find((r) => r.osFamily === "mac")!.directxText).toBeNull();
  });

  it("응답에 게임이 없으면 빈 배열이다", () => {
    expect(parseAppRequirements({ "999": { success: false } }, "999")).toEqual([]);
  });
});
