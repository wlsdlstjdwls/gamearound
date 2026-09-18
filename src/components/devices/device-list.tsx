"use client";
// 내 기기 목록 — 줄마다 부품 요약, 그리고 수정, 기본 지정, 삭제.
//
// 폼을 목록 아래에 늘 펴 두지 않고 "기기 추가" 를 눌러야 열리는 이유: 기기는 한 번 등록하면
// 거의 안 고치는 값이다. 늘 펴 두면 화면의 절반이 다시 쓸 일 없는 입력칸이 된다.
import { useState } from "react";
import { deleteDeviceAction, setPrimaryDeviceAction } from "@/app/(user)/settings/devices/actions";
import { DeviceForm, type ModelOption } from "@/components/devices/device-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/page";
import { DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { formatSizeMb } from "@/lib/format";
import type { DeviceDto } from "@/server/services/devices";

export type DeviceWithNames = DeviceDto & { cpuName: string | null; gpuName: string | null };

/** 줄에 적을 부품 요약. 모르는 값은 아예 안 적는다 — "-" 로 채우면 고장난 것처럼 읽힌다 */
function summaryOf(d: DeviceWithNames): string {
  return [d.cpuName, d.gpuName, d.ramMb ? `메모리 ${formatSizeMb(d.ramMb)}` : null, d.storageFreeMb ? `여유 ${formatSizeMb(d.storageFreeMb)}` : null]
    .filter(Boolean)
    .join(" | ");
}

export function DeviceList({
  devices,
  cpuOptions,
  gpuOptions,
}: {
  devices: DeviceWithNames[];
  cpuOptions: ModelOption[];
  gpuOptions: ModelOption[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(devices.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {devices.length === 0 && !adding && <p className="text-[13px] text-dim">{DEVICE_MESSAGES.empty}</p>}

      <ul className="flex flex-col gap-3">
        {devices.map((d) => (
          <li key={d.id}>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink">{d.label}</h2>
                    {d.isPrimary && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2">{DEVICE_MESSAGES.primary}</span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-mut">
                    {OS_FAMILY_LABEL[d.osFamily]}
                    {summaryOf(d) && ` | ${summaryOf(d)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(editing === d.id ? null : d.id)}>
                    수정
                  </Button>
                  {!d.isPrimary && (
                    <Button variant="secondary" size="sm" onClick={() => void setPrimaryDeviceAction(d.id)}>
                      {DEVICE_MESSAGES.makePrimary}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => void deleteDeviceAction(d.id)}>
                    {DEVICE_MESSAGES.remove}
                  </Button>
                </div>
              </div>
              {editing === d.id && (
                <div className="border-t border-line-soft pt-3">
                  <DeviceForm device={d} cpuOptions={cpuOptions} gpuOptions={gpuOptions} onDone={() => setEditing(null)} />
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {adding ? (
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-[14px] font-bold text-ink">{DEVICE_MESSAGES.addHeading}</h2>
          <DeviceForm cpuOptions={cpuOptions} gpuOptions={gpuOptions} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {DEVICE_MESSAGES.addHeading}
          </Button>
        </div>
      )}
    </div>
  );
}
