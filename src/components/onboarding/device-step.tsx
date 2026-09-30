"use client";
// 온보딩 기기 단계의 칸들 — 기존 기기 부품을 **감싸기만** 한다(설계 §6.3). 새 저장소를 만들지 않는다.
//
// 제출은 껍데기의 폼이 한다. 여기서는 칸의 값만 쥔다 — 이름(label, osFamily, cpuText, gpuText, ramGb)이
// 설정의 기기 폼과 같아서 액션 쪽이 같은 해석기(lib/hardware/device-input)를 쓴다.
//
// 감지값은 비회원 폼과 같은 규칙으로 채운다: 사람이 고른 값만 상태로 두고, 안 고른 칸은 감지가 채운다.
// 사파리처럼 그래픽을 뭉개는 브라우저에서는 칸을 비워 두고 넘어간다 — 온보딩에서 부품 고르기로 붙잡지 않는다.
import { useMemo, useState } from "react";
import { usePartSuggest } from "@/components/devices/use-part-suggest";
import { chipClass } from "@/components/ui/chip";
import { Panel } from "@/components/ui/page";
import { useDetectedSpec } from "@/components/devices/use-detected-spec";
import { FIELD_CLASS, HINT_CLASS, LABEL_CLASS } from "@/components/devices/field-style";
import { DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { listModels } from "@/lib/hardware";
import { RAM_QUICK_GB } from "@/lib/hardware/constants";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import type { OsFamily } from "@/server/db/schema";

const M = ONBOARDING_MESSAGES.device;
const OS_OPTIONS: OsFamily[] = ["windows", "mac", "linux"];

export function DeviceStepFields() {
  const detected = useDetectedSpec();
  const [osPick, setOsPick] = useState<OsFamily | null>(null);
  const [gpuPick, setGpuPick] = useState<string | null>(null);
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");

  const os = osPick ?? detected?.osFamily ?? "windows";
  const gpu = gpuPick ?? detected?.gpuName ?? "";
  // 서버 그림(detected === null)에서는 아무 말도 하지 않는다 — "못 읽었다" 와 "아직 안 읽었다" 는 다르다
  const autoNote = detected === null ? null : detected.gpuName ? DEVICE_MESSAGES.autoFilled : DEVICE_MESSAGES.autoFailed;

  // 사전 전체를 넘긴다 — 몇 줄을 띄울지는 친 글자로 거른 뒤에 정한다(usePartSuggest)
  const cpuOptions = useMemo(() => listModels("cpu"), []);
  const gpuOptions = useMemo(() => listModels("gpu"), []);
  const gpuSuggest = usePartSuggest("onboarding-gpu", gpuOptions, gpu, setGpuPick);
  const cpuSuggest = usePartSuggest("onboarding-cpu", cpuOptions, cpu, setCpu);

  return (
    <Panel className="flex flex-col gap-4 p-4">
      <input type="hidden" name="label" value={M.label} />
      <input type="hidden" name="osFamily" value={os} />

      <div>
        <span className={LABEL_CLASS}>{M.os}</span>
        <ul className="flex flex-wrap gap-1.5" aria-label={M.os}>
          {OS_OPTIONS.map((value) => (
            <li key={value}>
              <button type="button" onClick={() => setOsPick(value)} aria-pressed={os === value} className={chipClass({ active: os === value, size: "sm", outline: true })}>
                {OS_FAMILY_LABEL[value]}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="onboarding-gpu">
          {M.gpu}
        </label>
        <div className="relative">
          <input name="gpuText" {...gpuSuggest.inputProps} placeholder="GeForce GTX 1060" aria-describedby="onboarding-gpu-hint" className={FIELD_CLASS} />
          {gpuSuggest.popup}
        </div>
        <p id="onboarding-gpu-hint" className={HINT_CLASS}>
          {DEVICE_MESSAGES.gpuHint}
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="onboarding-cpu">
          {M.cpu}
        </label>
        <div className="relative">
          <input name="cpuText" {...cpuSuggest.inputProps} placeholder="Core i5 8400" aria-describedby="onboarding-cpu-hint" className={FIELD_CLASS} />
          {cpuSuggest.popup}
        </div>
        <p id="onboarding-cpu-hint" className={HINT_CLASS}>
          {DEVICE_MESSAGES.cpuHint}
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="onboarding-ram">
          {M.ram}
        </label>
        <input
          id="onboarding-ram"
          name="ramGb"
          value={ram}
          onChange={(e) => setRam(e.target.value)}
          inputMode="numeric"
          placeholder="16"
          className={FIELD_CLASS}
        />
        {/* 빠른 선택 — 누르면 위 칸에 그대로 들어간다. 목록에 없는 값은 칸에 적는다 */}
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={M.ram}>
          {RAM_QUICK_GB.map((gb) => (
            <li key={gb}>
              <button type="button" onClick={() => setRam(String(gb))} aria-pressed={ram === String(gb)} className={chipClass({ active: ram === String(gb), size: "sm", outline: true })}>
                {gb}GB
              </button>
            </li>
          ))}
        </ul>
      </div>

      {autoNote && (
        <p aria-live="polite" className="text-[11.5px] leading-[1.6] text-dim">
          {autoNote}
        </p>
      )}
    </Panel>
  );
}
