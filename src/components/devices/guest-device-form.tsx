"use client";
// 비회원용 간이 기기 등록 — 계정 화면의 폼과 달리 기기 이름도 저장공간도 묻지 않는다.
// 여기서 답해야 하는 질문은 "이 게임이 돌아가나" 하나뿐이고, 칸이 늘수록 안 쓴다.
//
// 상세("내 PC 로 돌아갈까요")와 목록 필터가 같은 폼을 쓴다. 적는 자리가 두 벌이 되면
// 한쪽에서 적은 기기가 다른 쪽에 없는 것처럼 보인다 — 저장소는 같은데 모양만 다른 꼴이다.
import { useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DetectButton } from "./detect-button";
import { COMPAT_MESSAGES, DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { findModel, modelByKey } from "@/lib/hardware";
import { ROUTES } from "@/lib/routes";
import type { OsFamily } from "@/server/db/schema";
import { saveGuestDevice, type CompatDevice } from "./guest-device";

/** 간이 폼의 입력칸. 폭이 좁아 공용 TextField 의 라벨 자리를 못 쓴다 — 라벨은 aria 로만 준다 */
const FIELD_CLASS =
  "h-[44px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-dim focus:border-ink";

export function GuestDeviceForm({
  current,
  onSaved,
  lead = COMPAT_MESSAGES.guestLead,
  columns = true,
}: {
  current: CompatDevice | null;
  onSaved: (device: CompatDevice) => void;
  /** 자리마다 묻는 까닭이 달라 첫 줄만 갈아 끼운다 */
  lead?: string;
  /** 넓은 자리에서는 세 칸을 나란히, 좁은 기둥(목록 필터)에서는 세로로 쌓는다 */
  columns?: boolean;
}) {
  // 고치러 들어왔으면 적어 둔 값을 되돌려 준다 — 빈칸부터 다시 적게 하면 고치는 것이 아니라 새로 쓰는 것이다.
  // 저장은 열쇠로 하지만 사람에게는 이름으로 보여 준다(modelByKey)
  const [os, setOs] = useState<OsFamily>(current?.osFamily ?? "windows");
  const [cpu, setCpu] = useState(modelByKey("cpu", current?.cpuModelKey ?? null)?.name ?? "");
  const [gpu, setGpu] = useState(modelByKey("gpu", current?.gpuModelKey ?? null)?.name ?? "");
  const [ram, setRam] = useState(current?.ramMb ? String(Math.round(current.ramMb / 1024)) : "");

  function save() {
    const ramGb = Number(ram);
    const device: CompatDevice = {
      id: "guest",
      label: "내 기기",
      osFamily: os,
      // 적은 대로 받아 우리가 알아본다. 못 알아본 부품은 null 이고 그 항목만 판정에서 빠진다
      cpuModelKey: cpu.trim() ? findModel("cpu", cpu)?.key ?? null : null,
      gpuModelKey: gpu.trim() ? findModel("gpu", gpu)?.key ?? null : null,
      ramMb: Number.isFinite(ramGb) && ramGb > 0 ? Math.round(ramGb * 1024) : null,
      storageFreeMb: null,
    };
    saveGuestDevice(device);
    onSaved(device);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.7] text-mut">{lead}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="운영체제">
        {(["windows", "mac", "linux"] as OsFamily[]).map((value) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => setOs(value)}
              aria-pressed={os === value}
              className={`press inline-flex min-h-[36px] items-center rounded-full border px-3 text-[12.5px] transition-colors ${
                os === value ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink"
              }`}
            >
              {OS_FAMILY_LABEL[value]}
            </button>
          </li>
        ))}
      </ul>
      {/* 적는 칸보다 먼저 둔다 — 채워진 칸을 고치는 것이 빈칸을 처음부터 적는 것보다 쉽다 */}
      <DetectButton
        onDetected={(spec) => {
          if (spec.gpuName) setGpu(spec.gpuName);
          if (spec.osFamily) setOs(spec.osFamily);
        }}
      />
      <div className={`grid gap-2 ${columns ? "sm:grid-cols-3" : ""}`}>
        <input value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="프로세서 (Core i5 8400)" aria-label="프로세서" className={FIELD_CLASS} />
        <input value={gpu} onChange={(e) => setGpu(e.target.value)} placeholder="그래픽 (GTX 1060)" aria-label="그래픽" className={FIELD_CLASS} />
        <input value={ram} onChange={(e) => setRam(e.target.value)} inputMode="numeric" placeholder="메모리 GB" aria-label="메모리 (GB)" className={FIELD_CLASS} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className={buttonClass({ variant: "primary" })}>
          {COMPAT_MESSAGES.check}
        </button>
        <Link href={ROUTES.settingsDevices} className="text-[12.5px] text-acc hover:underline">
          {COMPAT_MESSAGES.cta}
        </Link>
      </div>
      <p className="text-[11.5px] text-dim">{DEVICE_MESSAGES.guestNote}</p>
    </div>
  );
}
