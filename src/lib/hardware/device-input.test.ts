import { describe, expect, it } from "vitest";
import { readDeviceForm } from "./device-input";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("readDeviceForm", () => {
  it("적은 부품을 사전 열쇠로 알아보고 GB 를 MB 로 옮긴다", () => {
    const { values, unknown } = readDeviceForm(form({ label: "내 PC", osFamily: "windows", gpuText: "GTX 1060", ramGb: "16" }));
    expect(values.gpuModelKey).not.toBeNull();
    expect(values.ramMb).toBe(16 * 1024);
    expect(values.cpuModelKey).toBeNull();
    expect(unknown).toEqual([]);
  });

  it("못 알아본 부품은 null 로 두고 적은 글자를 돌려준다 — 지어내지 않는다", () => {
    const { values, unknown } = readDeviceForm(form({ label: "내 PC", cpuText: "감자 프로세서" }));
    expect(values.cpuModelKey).toBeNull();
    expect(unknown).toEqual(["감자 프로세서"]);
  });

  it("빈 칸과 0 이하 숫자는 값이 없는 것으로 친다", () => {
    const { values } = readDeviceForm(form({ label: "내 PC", ramGb: "0", storageGb: " " }));
    expect(values.ramMb).toBeNull();
    expect(values.storageFreeMb).toBeNull();
    expect(values.osFamily).toBe("windows");
    expect(values.isPrimary).toBe(false);
  });
});
