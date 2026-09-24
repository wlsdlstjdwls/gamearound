// 기기 폼 제출값을 저장 모양으로 옮긴다 — 설정의 기기 화면과 온보딩 기기 단계가 같은 것을 쓴다.
//
// 한곳에 둔 이유: 두 입구가 부품을 따로 해석하면 같은 "1060" 이 한쪽에서만 알아봐진다.
// 부품을 목록에서 고르게 하지 않고 **적은 대로 받아 우리가 알아보는** 이유는 settings/devices/actions.ts 주석.
import { findModel } from "@/lib/hardware";
import { gbToMb } from "@/lib/hardware/device-schemas";

export type DeviceFormRead = {
  /** deviceSchema 에 넘길 값. 검증은 부르는 쪽이 한다 */
  values: {
    label: string;
    osFamily: string;
    cpuModelKey: string | null;
    gpuModelKey: string | null;
    ramMb: number | null;
    storageFreeMb: number | null;
    isPrimary: boolean;
  };
  /** 적었는데 사전이 못 알아본 부품 글자. 저장은 하되 그 사실을 말해야 판정이 왜 비는지 안다 */
  unknown: string[];
};

export function readDeviceForm(formData: FormData): DeviceFormRead {
  const num = (name: string): number | null => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const model = (kind: "cpu" | "gpu"): { key: string | null; typed: string } => {
    const typed = String(formData.get(`${kind}Text`) ?? "").trim();
    return { key: typed ? findModel(kind, typed)?.key ?? null : null, typed };
  };
  const cpu = model("cpu");
  const gpu = model("gpu");
  return {
    values: {
      label: String(formData.get("label") ?? "").trim(),
      osFamily: String(formData.get("osFamily") ?? "windows"),
      cpuModelKey: cpu.key,
      gpuModelKey: gpu.key,
      ramMb: gbToMb(num("ramGb")),
      storageFreeMb: gbToMb(num("storageGb")),
      isPrimary: formData.get("isPrimary") === "on",
    },
    unknown: [cpu.typed && !cpu.key ? cpu.typed : null, gpu.typed && !gpu.key ? gpu.typed : null].filter((s): s is string => Boolean(s)),
  };
}
