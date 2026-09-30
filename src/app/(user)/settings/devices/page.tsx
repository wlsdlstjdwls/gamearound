// /settings/devices — 내 기기 목록과 등록. 설계 문서 §7 "설정".
//
// 판정의 한쪽 항이 여기서 만들어진다. 다른 한쪽(게임 사양)은 크롤러가 모은다.
import type { Metadata } from "next";
import { DeviceList } from "@/components/devices/device-list";
import { Page, PageHead } from "@/components/ui/page";
import { DEVICE_MESSAGES } from "@/lib/games/messages";
import { listModels, modelByKey } from "@/lib/hardware";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyDevices } from "@/server/services/devices";

export const metadata: Metadata = { title: DEVICE_MESSAGES.heading };

export default async function DevicesPage() {
  await requireUserOrRedirect();
  const devices = await listMyDevices();

  // 저장은 열쇠로 하고 화면은 이름으로 말한다 — 폼에 되돌려 줄 때도 사람이 읽는 이름이어야 한다
  const withNames = devices.map((d) => ({
    ...d,
    cpuName: modelByKey("cpu", d.cpuModelKey)?.name ?? null,
    gpuName: modelByKey("gpu", d.gpuModelKey)?.name ?? null,
  }));

  return (
    <Page width="tight" gap={18}>
      <PageHead title={DEVICE_MESSAGES.heading} note={DEVICE_MESSAGES.lead} />
      <DeviceList
        devices={withNames}
        cpuOptions={listModels("cpu").map((m) => ({ key: m.key, name: m.name }))}
        gpuOptions={listModels("gpu").map((m) => ({ key: m.key, name: m.name }))}
      />
    </Page>
  );
}
