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

/**
 * 폼의 제안 목록에 내려보낼 부품 수.
 *
 * 사전 전체(300개가 넘는다)를 내려보내지 않는 이유는 화면 무게다. 제안이 없어도 입력은 되고
 * (자유 입력이라 매칭기가 알아본다) 옛 부품을 쓰는 사람은 이름을 정확히 아는 편이다 —
 * 제안이 필요한 쪽은 요즘 부품을 고르는 사람이라 빠른 것부터 자른다.
 */
const SUGGEST_LIMIT = 80;

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
        cpuOptions={listModels("cpu").slice(0, SUGGEST_LIMIT).map((m) => ({ key: m.key, name: m.name }))}
        gpuOptions={listModels("gpu").slice(0, SUGGEST_LIMIT).map((m) => ({ key: m.key, name: m.name }))}
      />
    </Page>
  );
}
