// 부품 사전과 후보 추출 테스트 — 순수 함수만. 예시 문구는 전부 2026-09-18 에 우리 DB 에서 실측한 것이다.
import { describe, expect, it } from "vitest";
import { extractParts, findModel, looksLikeModel, normalizeModelKey, splitCandidates, stripSpecNoise } from "./index";

describe("normalizeModelKey", () => {
  it("제조사 표기와 상표 기호를 걷어 같은 열쇠로 만든다", () => {
    const key = normalizeModelKey("GTX 1060");
    expect(normalizeModelKey("NVIDIA® GeForce® GTX1060")).toBe(key);
    expect(normalizeModelKey("nVidia GTX-1060")).toBe(key);
    expect(normalizeModelKey("geforce gtx 1060")).toBe(key);
  });

  // 스토어 문구는 "i7-8700K" 로, 사전은 "Core i7 8700K" 로 적혀 있다
  it("core 를 양쪽에서 지워 짧게 적은 이름과 정식 이름을 잇는다", () => {
    expect(normalizeModelKey("Intel i7-8700K")).toBe(normalizeModelKey("Core i7 8700K"));
  });

  it("실측에 나온 약칭 r5 를 편다", () => {
    expect(normalizeModelKey("AMD r5 3600")).toBe(normalizeModelKey("Ryzen 5 3600"));
  });
});

describe("splitCandidates", () => {
  it("후보를 가른다 — 판정은 하나만 넘으면 충족이라 한 칸으로 두면 안 된다", () => {
    expect(splitCandidates("NVIDIA GEFORCE GTX 1060 3 GB or AMD RADEON RX 580 4 GB")).toEqual([
      "NVIDIA GEFORCE GTX 1060 3 GB",
      "AMD RADEON RX 580 4 GB",
    ]);
    expect(splitCandidates("nVidia GTX 970 / AMD R9 390")).toHaveLength(2);
    expect(splitCandidates("Intel Core i5-2300 | AMD FX-6350")).toHaveLength(2);
  });

  // 실측 문구에 중국어 구분자가 있었다
  it("或 도 구분자다", () => {
    expect(splitCandidates("NVIDIA GeForce GTX 960 或 AMD Radeon R9 280")).toHaveLength(2);
  });

  // "GTX960,4GB" 처럼 쉼표로 용량을 잇는 표기가 있어 쉼표는 조건부다
  it("용량을 잇는 쉼표로는 자르지 않는다", () => {
    expect(splitCandidates("NVIDIA GeForce GTX960,4GB")).toEqual(["NVIDIA GeForce GTX960,4GB"]);
    expect(splitCandidates("GTX960,4GB, AMD Radeon RX460,4GB")).toHaveLength(2);
  });
});

describe("findModel", () => {
  it("꼬리표가 붙어도 찾는다", () => {
    expect(findModel("gpu", "GTX 770 2GB")?.name).toBe("GeForce GTX 770");
    expect(findModel("gpu", "NVIDIA GeForce® GTX 1050 (4GB VRAM)")?.name).toBe("GeForce GTX 1050");
    expect(findModel("cpu", "Intel Core i5-6400 (2.7 GHz 4 Core)")?.name).toBe("Core i5 6400");
  });

  // 같은 1060 이라도 3GB 판은 한 티어 아래다. 꼬리표를 먼저 떼면 이 구분이 사라진다
  it("용량이 다른 변종을 구분한다", () => {
    const three = findModel("gpu", "GTX 1060 3GB")!;
    const six = findModel("gpu", "GTX 1060 6GB")!;
    expect(three.tier).toBeLessThan(six.tier);
  });

  it("열쇠 뒤에 숫자가 이어지면 다른 모델이다", () => {
    // rx580 이 rx5800 에 걸리면 안 된다. 사전에 없는 이름이라 null 이어야 한다
    expect(findModel("gpu", "Radeon RX 5800")).toBeNull();
  });

  it("사전에 없으면 null — 점수를 지어내지 않는다", () => {
    expect(findModel("gpu", "Voodoo 3dfx Banshee")).toBeNull();
  });
});

describe("looksLikeModel", () => {
  // 미매칭 1위가 `i5` 33회였는데, 이건 사전 구멍이 아니라 스토어가 세대를 안 적은 것이다
  it("세대 없는 계열명은 모델이 아니다", () => {
    expect(looksLikeModel("cpu", "Intel Core i5")).toBe(false);
    expect(looksLikeModel("cpu", "AMD Ryzen 3")).toBe(false);
    expect(looksLikeModel("cpu", "Quad Core Processor")).toBe(false);
    expect(looksLikeModel("gpu", "DirectX 10 capable hardware")).toBe(false);
  });

  it("모델 번호가 있으면 모델 이야기다", () => {
    expect(looksLikeModel("cpu", "Intel Core i5-8400")).toBe(true);
    expect(looksLikeModel("gpu", "Radeon RX 6400")).toBe(true);
  });
});

describe("extractParts", () => {
  it("후보마다 티어를 붙이고 둘째부터는 대안으로 표시한다", () => {
    const parts = extractParts("gpu", "NVIDIA GEFORCE GTX 1060 3 GB or AMD RADEON RX 580 4 GB");
    expect(parts).toHaveLength(2);
    expect(parts[0].isAlternative).toBe(false);
    expect(parts[1].isAlternative).toBe(true);
    expect(parts[0].tier).not.toBeNull();
    expect(parts[1].tier).not.toBeNull();
    // 후보에 딸려 온 용량은 그 카드의 사양이라 후보 행에 남는다
    expect(parts[0].vramMb).toBe(3072);
  });

  it("모델 이야기가 아닌 문구는 후보를 세우지 않는다 — 경고만 늘어난다", () => {
    expect(extractParts("gpu", "DirectX 10 capable hardware")).toEqual([]);
    expect(extractParts("cpu", "Dual-Core 2.2 GHz or better")).toEqual([]);
    expect(extractParts("cpu", null)).toEqual([]);
  });

  it("사전에 없어도 모델 이야기면 후보로 남긴다 — 화면이 확인 못 한 부품이라고 말한다", () => {
    const parts = extractParts("gpu", "Voodoo 5500 Ultra");
    expect(parts).toHaveLength(1);
    expect(parts[0].tier).toBeNull();
    expect(parts[0].modelKey).toBeNull();
  });
});

describe("stripSpecNoise", () => {
  it("괄호와 용량, 동작 속도를 떼어 낸다", () => {
    expect(stripSpecNoise("GTX 1050 (4GB VRAM)")).toBe("GTX 1050");
    expect(stripSpecNoise("Core i5-6400 3.2GHz")).toBe("Core i5-6400");
  });
});
