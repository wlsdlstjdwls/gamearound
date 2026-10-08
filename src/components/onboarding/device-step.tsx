"use client";
// 온보딩 기기 단계의 칸들 — 기존 기기 부품을 **감싸기만** 한다(설계 §6.3). 새 저장소를 만들지 않는다.
//
// 제출은 껍데기의 폼이 한다. 여기서는 칸의 값만 쥔다 — 이름(label, osFamily, cpuText, gpuText, ramGb)이
// 설정의 기기 폼과 같아서 액션 쪽이 같은 해석기(lib/hardware/device-input)를 쓴다.
//
// 감지값은 비회원 폼과 같은 규칙으로 채운다: 사람이 고른 값만 상태로 두고, 안 고른 칸은 감지가 채운다.
// 사파리처럼 그래픽을 뭉개는 브라우저에서는 칸을 비워 두고 넘어간다 — 온보딩에서 부품 고르기로 붙잡지 않는다.
//
// 차림(2026-10-08 사용자: "입력폼이 넘 구리다"): 회색 판 안에 라벨-칸을 쌓던 것을 **부품 줄** 로 바꿨다.
// 줄마다 왼쪽에 부품 그림 칸, 그 옆에 작은 이름과 굵은 값 — 게임의 장비 슬롯처럼 읽히게. 줄 전체가 하나의 칸이라
// 포커스 링도 줄에 건다(focus-within). 운영체제는 칩 대신 한 덩어리 세그먼트, 브라우저가 읽어 채운 칸은
// 긴 안내 문장 대신 이름 옆 배지로 말한다. 칸 밑 주의 문구(gpuHint, cpuHint)는 뺐다 — 한 화면에 들어와야 하고,
// 자세한 주의는 설정의 기기 화면이 그대로 보여 준다.
//
// 공용 FIELD_CLASS 를 쓰지 않는 이유: 그건 테두리 있는 상자 칸이고, 여기 입력은 줄 안에 테두리 없이 앉는다.
// 글자 16px(iOS 확대 방지)은 같이 지킨다.
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { usePartSuggest } from "@/components/devices/use-part-suggest";
import { useDetectedSpec } from "@/components/devices/use-detected-spec";
import { CheckIcon, CpuIcon, GpuIcon, MemoryIcon } from "@/components/ui/icons";
import { DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { listModels } from "@/lib/hardware";
import { RAM_QUICK_GB } from "@/lib/hardware/constants";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import type { OsFamily } from "@/server/db/schema";

const M = ONBOARDING_MESSAGES.device;
const OS_OPTIONS: OsFamily[] = ["windows", "mac", "linux"];

/** 줄 안의 입력. 테두리는 줄이 가진다 */
const INPUT_CLASS = "h-7 w-full min-w-0 bg-transparent text-[16px] font-semibold tracking-[-0.01em] text-ink outline-none placeholder:font-normal placeholder:text-dim";

/**
 * 세그먼트 한 칸 — 운영체제와 메모리 빠른 선택이 같은 모양을 쓴다.
 * 고른 칸은 바탕 위로 떠오른 흰 면(shadow-1). 높이가 44px 보다 작아 터치 기기에서는 덧면(tap-inset)으로 손가락 범위를 채운다.
 */
function segmentClass(active: boolean): string {
  return cn(
    "press tap-inset flex h-9 items-center justify-center rounded-[9px] px-2.5 text-[13.5px] transition-[background-color,color,box-shadow] duration-base ease-standard",
    active ? "bg-surface font-bold text-acc shadow-1" : "font-medium text-mut hover:text-ink",
  );
}

/** 부품 줄 한 칸 — 그림 칸, 이름(+배지), 값 */
function PartRow({ icon, label, htmlFor, badge, children }: { icon: ReactNode; label: string; htmlFor: string; badge?: ReactNode; children: ReactNode }) {
  return (
    // relative: 부품 제안 목록(suggest popup)이 이 줄 폭으로 펼쳐진다
    <div className="relative flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 shadow-[0_0_0_1px_var(--line)] transition-[box-shadow] duration-base ease-standard focus-within:shadow-[0_0_0_1.5px_var(--acc),0_0_0_4px_var(--acc-glow)]">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-acc-soft text-acc">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[11.5px] font-medium text-mut">
          {label}
          {badge}
        </label>
        {children}
      </div>
    </div>
  );
}

export function DeviceStepFields() {
  const detected = useDetectedSpec();
  const [osPick, setOsPick] = useState<OsFamily | null>(null);
  const [gpuPick, setGpuPick] = useState<string | null>(null);
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");

  const os = osPick ?? detected?.osFamily ?? "windows";
  const gpu = gpuPick ?? detected?.gpuName ?? "";
  // 브라우저가 읽은 그래픽을 사람이 아직 안 건드렸을 때만 배지를 단다 — 고친 뒤에도 "자동" 이라 하면 거짓말이다
  const gpuAuto = gpuPick === null && Boolean(detected?.gpuName);
  // 못 읽었을 때만 한 줄로 알린다. 서버 그림(detected === null)에서는 말하지 않는다 — "못 읽었다" 와 "아직 안 읽었다" 는 다르다
  const autoFailed = detected !== null && !detected.gpuName;

  // 사전 전체를 넘긴다 — 몇 줄을 띄울지는 친 글자로 거른 뒤에 정한다(usePartSuggest)
  const cpuOptions = useMemo(() => listModels("cpu"), []);
  const gpuOptions = useMemo(() => listModels("gpu"), []);
  const gpuSuggest = usePartSuggest("onboarding-gpu", gpuOptions, gpu, setGpuPick);
  const cpuSuggest = usePartSuggest("onboarding-cpu", cpuOptions, cpu, setCpu);

  return (
    <div className="flex flex-col gap-2.5">
      <input type="hidden" name="label" value={M.label} />
      <input type="hidden" name="osFamily" value={os} />

      <ul className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" aria-label={M.os}>
        {OS_OPTIONS.map((value) => (
          <li key={value} className="flex">
            <button type="button" onClick={() => setOsPick(value)} aria-pressed={os === value} className={cn(segmentClass(os === value), "flex-1")}>
              {OS_FAMILY_LABEL[value]}
            </button>
          </li>
        ))}
      </ul>

      {/* 나란히 두지 않는다 — 그래픽 이름은 "NVIDIA GeForce RTX 4050 Laptop GPU" 처럼 길어서 반 폭이면 반이 잘린다 */}
      <div className="flex flex-col gap-2.5">
        <PartRow
          icon={<GpuIcon size={20} />}
          label={M.gpu}
          htmlFor="onboarding-gpu"
          badge={
            gpuAuto && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-ok-soft px-1.5 py-px text-[10.5px] font-bold text-ok">
                <CheckIcon size={10} />
                {M.auto}
              </span>
            )
          }
        >
          <input name="gpuText" {...gpuSuggest.inputProps} placeholder="GeForce GTX 1060" className={INPUT_CLASS} />
          {gpuSuggest.popup}
        </PartRow>

        <PartRow icon={<CpuIcon size={20} />} label={M.cpu} htmlFor="onboarding-cpu">
          <input name="cpuText" {...cpuSuggest.inputProps} placeholder="Core i5 8400" className={INPUT_CLASS} />
          {cpuSuggest.popup}
        </PartRow>
      </div>

      <PartRow icon={<MemoryIcon size={20} />} label={M.ram} htmlFor="onboarding-ram">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-baseline gap-1">
            <input
              id="onboarding-ram"
              name="ramGb"
              value={ram}
              onChange={(e) => setRam(e.target.value)}
              inputMode="numeric"
              placeholder="16"
              // 두 자리 숫자 폭만 — 넓으면 단위(GB)가 숫자에서 떨어져 따로 논다
              className={cn(INPUT_CLASS.replace("w-full", ""), "w-[2.6ch]")}
            />
            <span className="text-[13px] text-mut">{M.gb}</span>
          </div>
          {/* 빠른 선택 — 누르면 옆 칸에 그대로 들어간다. 목록에 없는 값은 칸에 적는다 */}
          <ul className="ml-auto flex gap-0.5 rounded-[11px] bg-surface-2 p-0.5" aria-label={M.ram}>
            {RAM_QUICK_GB.map((gb) => (
              <li key={gb}>
                <button type="button" onClick={() => setRam(String(gb))} aria-pressed={ram === String(gb)} className={segmentClass(ram === String(gb))}>
                  {gb}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </PartRow>

      {autoFailed && (
        <p aria-live="polite" className="text-[11.5px] leading-[1.6] text-dim">
          {DEVICE_MESSAGES.autoFailed}
        </p>
      )}
    </div>
  );
}
