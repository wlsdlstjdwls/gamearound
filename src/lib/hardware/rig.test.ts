// 기기를 주소에 싣고 되찾는 왕복 테스트 — 순수 함수만. 네트워크, DB 를 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { encodeRig, parseRig } from "./rig";
import { findModel } from "./index";

const GPU = "GTX 1060";
const CPU = "Core i5-8400";

function device(over: Partial<Parameters<typeof encodeRig>[0]> = {}) {
  return {
    osFamily: "windows" as const,
    cpuModelKey: findModel("cpu", CPU)?.key ?? null,
    gpuModelKey: findModel("gpu", GPU)?.key ?? null,
    ramMb: 16 * 1024,
    storageFreeMb: null,
    ...over,
  };
}

describe("encodeRig", () => {
  it("기기를 티어로 접는다 — 주소에 기기 id 를 싣지 않는다", () => {
    const encoded = encodeRig(device())!;
    expect(encoded.startsWith("w.")).toBe(true);
    // 사전을 고치면 숫자는 바뀔 수 있다. 고정하는 것은 "id 가 아니라 숫자" 라는 사실이다
    expect(encoded.split(".")).toHaveLength(4);
    expect(parseRig(encoded)!.ramMb).toBe(16 * 1024);
  });

  it("못 알아본 부품은 빈 자리로 남고 나머지는 그대로 실린다", () => {
    const encoded = encodeRig(device({ gpuModelKey: null }))!;
    expect(parseRig(encoded)!.gpuTier).toBeNull();
    expect(parseRig(encoded)!.cpuTier).not.toBeNull();
  });

  it("실을 값이 하나도 없으면 주소에 남기지 않는다", () => {
    expect(encodeRig(device({ cpuModelKey: null, gpuModelKey: null, ramMb: null }))).toBeNull();
  });

  it("OS 가 값에 들어간다 — 맥과 윈도우는 견줄 사양 자체가 다르다", () => {
    expect(encodeRig(device({ osFamily: "mac" }))!.startsWith("m.")).toBe(true);
    expect(parseRig(encodeRig(device({ osFamily: "linux" }))!)!.osFamily).toBe("linux");
  });
});

describe("parseRig", () => {
  it("모양이 어긋나면 null — 그때 필터는 아예 안 걸린다", () => {
    expect(parseRig(undefined)).toBeNull();
    expect(parseRig("")).toBeNull();
    expect(parseRig("w.1.2")).toBeNull();
    expect(parseRig("x.1.2.16")).toBeNull();
    expect(parseRig("w.-.-.-")).toBeNull();
  });

  it("범위 밖이나 숫자가 아닌 값은 모르는 값으로 접는다", () => {
    expect(parseRig("w.999.5.16")!.cpuTier).toBeNull();
    expect(parseRig("w.0.5.16")!.cpuTier).toBeNull();
    expect(parseRig("w.abc.5.16")!.cpuTier).toBeNull();
    expect(parseRig("w.3.5.99999")!.ramMb).toBeNull();
  });

  it("메모리는 GB 로 싣고 MB 로 되돌린다 — 문턱이 MB 라 여기서 맞춘다", () => {
    expect(parseRig("w.3.5.8")!.ramMb).toBe(8192);
  });
});
