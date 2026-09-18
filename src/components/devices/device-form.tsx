"use client";
// 기기 등록, 수정 폼. Server Action 은 app/(user)/settings/devices/actions.ts
//
// 부품을 드롭다운이 아니라 **자유 입력 + 제안 목록**으로 받는 이유: 사전이 300개가 넘어
// 고르는 목록이 스크롤 벽이 되고, 사람은 자기 부품을 정식 이름으로 기억하지 않는다("1060").
// 적은 대로 받아 우리 매칭기가 알아본다 — 사양 문구를 알아보는 그 매칭기와 같은 것이다.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveDeviceAction, type ActionState } from "@/app/(user)/settings/devices/actions";
import { Button } from "@/components/ui/button";
import { DetectButton } from "./detect-button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { DEVICE_LABEL_MAX, mbToGb } from "@/lib/hardware/device-schemas";
import { DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import type { DeviceDto } from "@/server/services/devices";
import type { OsFamily } from "@/server/db/schema";

/** 제안 목록에 띄울 부품 이름. 사전 전체를 내려보내면 목록 화면이 무거워져 빠른 쪽부터 자른다 */
export type ModelOption = { key: string; name: string };

const OS_OPTIONS: OsFamily[] = ["windows", "mac", "linux"];

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingLabel="저장하는 중">
      {editing ? "저장" : "기기 추가"}
    </Button>
  );
}

export function DeviceForm({
  device,
  cpuOptions,
  gpuOptions,
  onDone,
}: {
  device?: DeviceDto & { cpuName: string | null; gpuName: string | null };
  cpuOptions: ModelOption[];
  gpuOptions: ModelOption[];
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await saveDeviceAction(prev, fd);
    if (next?.ok) onDone?.();
    return next;
  }, null);
  const [os, setOs] = useState<OsFamily>(device?.osFamily ?? "windows");
  // 감지가 채울 칸만 controlled 로 둔다. 나머지를 다 옮기면 폼이 상태 덩어리가 되고 얻는 것이 없다
  const [gpu, setGpu] = useState(device?.gpuName ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {device && <input type="hidden" name="id" value={device.id} />}
      <input type="hidden" name="osFamily" value={os} />

      <TextField
        label="기기 이름"
        name="label"
        defaultValue={device?.label ?? ""}
        maxLength={DEVICE_LABEL_MAX}
        placeholder="집 데스크탑"
        hint={DEVICE_MESSAGES.labelHint}
        required
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[12.5px] font-medium text-mut">운영체제</legend>
        <div className="flex flex-wrap gap-1.5">
          {OS_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOs(value)}
              aria-pressed={os === value}
              className={`press inline-flex min-h-[44px] items-center rounded-full border px-4 text-[13px] transition-colors ${
                os === value ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink"
              }`}
            >
              {OS_FAMILY_LABEL[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <DetectButton
        size="md"
        onDetected={(spec) => {
          if (spec.gpuName) setGpu(spec.gpuName);
          if (spec.osFamily) setOs(spec.osFamily);
        }}
      />

      <TextField
        label="프로세서"
        name="cpuText"
        defaultValue={device?.cpuName ?? ""}
        list="cpu-models"
        placeholder="Core i5 8400"
        hint={DEVICE_MESSAGES.partHint}
      />
      <datalist id="cpu-models">
        {cpuOptions.map((m) => (
          <option key={m.key} value={m.name} />
        ))}
      </datalist>

      <TextField
        label="그래픽"
        name="gpuText"
        value={gpu}
        onChange={(e) => setGpu(e.target.value)}
        list="gpu-models"
        placeholder="GeForce GTX 1060"
        hint={DEVICE_MESSAGES.partHint}
      />
      <datalist id="gpu-models">
        {gpuOptions.map((m) => (
          <option key={m.key} value={m.name} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="메모리 (GB)" name="ramGb" type="number" inputMode="numeric" min={1} step={1} defaultValue={mbToGb(device?.ramMb ?? null) ?? ""} placeholder="16" />
        <TextField label="남은 저장공간 (GB)" name="storageGb" type="number" inputMode="numeric" min={1} step={1} defaultValue={mbToGb(device?.storageFreeMb ?? null) ?? ""} placeholder="500" />
      </div>

      <Checkbox name="isPrimary" defaultChecked={device?.isPrimary ?? false}>기본 기기로 쓰기</Checkbox>

      {state && (
        <p aria-live="polite" className={`text-[12.5px] leading-[1.6] ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton editing={Boolean(device)} />
      </div>
    </form>
  );
}
