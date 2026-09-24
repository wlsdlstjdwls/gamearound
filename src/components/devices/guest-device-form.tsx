"use client";
// 비회원용 간이 기기 등록 — 계정 화면의 폼과 달리 기기 이름도 저장공간도 묻지 않는다.
// 여기서 답해야 하는 질문은 "이 게임이 돌아가나" 하나뿐이고, 칸이 늘수록 안 쓴다.
//
// 상세("내 PC 로 돌아갈까요")와 목록 필터가 같은 폼을 쓴다. 적는 자리가 두 벌이 되면
// 한쪽에서 적은 기기가 다른 쪽에 없는 것처럼 보인다 — 저장소는 같은데 모양만 다른 꼴이다.
//
// **2026-09-22 — 적는 수고를 줄였다(사용자 요청).** 브라우저가 스스로 아는 것은 그래픽과 OS 둘뿐이고
// (CPU 와 메모리는 브라우저가 아예 모르거나 8GB 에서 잘린다 — lib/hardware/detect 주석)
// 그 둘은 **버튼을 누르지 않아도 처음에 자동으로 채운다.** 사람이 할 일은 남은 둘이고,
// 그것도 자판을 덜 쓰게 했다: 부품은 사전 제안 목록(datalist), 메모리는 빠른 선택 칩.
//
// **2026-09-22 2차 — 차림을 화면과 맞췄다(사용자: "UI나 색상도 구려서 못쓸 정도").**
// 고친 것 셋이다.
//   1) 검정 필 알약(고른 상태)을 걷고 **공용 칩**(chipClass)을 쓴다. 이 화면에서 채워진 면은
//      브랜드 보라 하나여야 하는데 이 폼만 검정 필을 써서 "눌린 버튼" 처럼 떠 있었다.
//   2) 입력칸을 공용 입력의 차림으로 맞췄다 — 흰 면 + 헤어라인, 포커스에서 브랜드 링(text-field 와 같은 값).
//      1px 테두리 + 배경색 bg 는 판 위에서 칸이 파인 것처럼 보였다.
//   3) 폼 전체를 판(Panel) 안에 넣고 칸마다 라벨을 세웠다. 자리표시자만 있던 때는 무엇을 적는 칸인지가
//      글자를 치는 순간 사라졌다.
import { useMemo, useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { Panel } from "@/components/ui/page";
import { DetectButton } from "./detect-button";
import { COMPAT_MESSAGES, DEVICE_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { findModel, listModels, modelByKey } from "@/lib/hardware";
import { PART_SUGGEST_LIMIT, RAM_QUICK_GB } from "@/lib/hardware/constants";
import { useDetectedSpec } from "./use-detected-spec";
import { ROUTES } from "@/lib/routes";
import type { OsFamily } from "@/server/db/schema";
import { saveGuestDevice, type CompatDevice } from "./guest-device";
import { FIELD_CLASS, HINT_CLASS, LABEL_CLASS } from "./field-style";

export function GuestDeviceForm({
  current,
  onSaved,
  lead,
  columns = true,
}: {
  current: CompatDevice | null;
  onSaved: (device: CompatDevice) => void;
  /**
   * 첫 줄 안내. **기본값이 없다**(2026-09-22, 사용자 지정) — 상세의 판정 칸에서는 마디 제목이
   * 이미 "내 PC 로 돌아갈까요" 라서 그 밑에 "기기를 적어 두면 알려줘요" 를 또 적으면 같은 말이 두 번이다.
   * 자리마다 묻는 까닭이 다른 곳(목록 필터)만 제 문구를 넘긴다.
   */
  lead?: string;
  /** 넓은 자리에서는 세 칸을 나란히, 좁은 기둥(목록 필터)에서는 세로로 쌓는다 */
  columns?: boolean;
}) {
  // 사람이 고른 값만 상태로 둔다. 아직 안 고른 칸(null)은 감지 결과가, 그것도 없으면 기본값이 채운다 —
  // "내가 적은 값" 과 "우리가 채운 값" 을 한 상태에 섞으면 감지가 사람 글자를 덮는 사고가 난다
  const [osPick, setOsPick] = useState<OsFamily | null>(current?.osFamily ?? null);
  const [cpu, setCpu] = useState(modelByKey("cpu", current?.cpuModelKey ?? null)?.name ?? "");
  const [gpuPick, setGpuPick] = useState<string | null>(modelByKey("gpu", current?.gpuModelKey ?? null)?.name ?? null);
  const [ram, setRam] = useState(current?.ramMb ? String(Math.round(current.ramMb / 1024)) : "");

  // 고치러 들어온 사람에게는 감지를 쓰지 않는다 — 적어 둔 값이 이미 답이다
  const detected = useDetectedSpec();
  const auto = current ? null : detected;
  const os = osPick ?? auto?.osFamily ?? "windows";
  const gpu = gpuPick ?? auto?.gpuName ?? "";
  /** 자동으로 채운 결과를 알리는 한 줄. 서버 그림(detected === null)에서는 아무 말도 하지 않는다 */
  const autoNote = auto === null ? null : auto.gpuName ? DEVICE_MESSAGES.autoFilled : DEVICE_MESSAGES.autoFailed;

  // 사전은 이미 이 번들 안에 있다(findModel 이 쓴다) — 제안 목록은 그 표를 그대로 편 것뿐이라 공짜다
  const cpuOptions = useMemo(() => listModels("cpu").slice(0, PART_SUGGEST_LIMIT), []);
  const gpuOptions = useMemo(() => listModels("gpu").slice(0, PART_SUGGEST_LIMIT), []);

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
    <Panel className="flex flex-col gap-4 p-4">
      {lead && <p className="text-[13px] leading-[1.7] text-mut">{lead}</p>}

      <div>
        <span className={LABEL_CLASS}>운영체제</span>
        <ul className="flex flex-wrap gap-1.5" aria-label="운영체제">
          {(["windows", "mac", "linux"] as OsFamily[]).map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => setOsPick(value)}
                aria-pressed={os === value}
                className={chipClass({ active: os === value, size: "sm" })}
              >
                {OS_FAMILY_LABEL[value]}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={`grid gap-3.5 ${columns ? "sm:grid-cols-3" : ""}`}>
        <div>
          <label className={LABEL_CLASS} htmlFor="guest-cpu">
            프로세서
          </label>
          {/* 제안 목록(datalist)은 계정 폼과 같은 사전, 같은 길이다(PART_SUGGEST_LIMIT) */}
          <input
            id="guest-cpu"
            value={cpu}
            onChange={(e) => setCpu(e.target.value)}
            list="guest-cpu-models"
            placeholder="Core i5 8400"
            className={FIELD_CLASS}
          />
          <datalist id="guest-cpu-models">
            {cpuOptions.map((m) => (
              <option key={m.key} value={m.name} />
            ))}
          </datalist>
          <p className={HINT_CLASS}>{DEVICE_MESSAGES.cpuHint}</p>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="guest-gpu">
            그래픽
          </label>
          <input
            id="guest-gpu"
            value={gpu}
            onChange={(e) => setGpuPick(e.target.value)}
            list="guest-gpu-models"
            placeholder="GeForce GTX 1060"
            className={FIELD_CLASS}
          />
          <datalist id="guest-gpu-models">
            {gpuOptions.map((m) => (
              <option key={m.key} value={m.name} />
            ))}
          </datalist>
          {/* 브라우저가 읽은 값이 게임용 그래픽이 아닐 수 있다는 사실은 이 칸 옆에서만 뜻이 있다 */}
          <p className={HINT_CLASS}>{DEVICE_MESSAGES.gpuHint}</p>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="guest-ram">
            메모리 (GB)
          </label>
          <input
            id="guest-ram"
            value={ram}
            onChange={(e) => setRam(e.target.value)}
            inputMode="numeric"
            placeholder="16"
            className={FIELD_CLASS}
          />
          {/* 빠른 선택 — 누르면 위 칸에 그대로 들어간다. 목록에 없는 값은 칸에 적는다 */}
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="메모리 빠른 선택">
            {RAM_QUICK_GB.map((gb) => (
              <li key={gb}>
                <button
                  type="button"
                  onClick={() => setRam(String(gb))}
                  aria-pressed={ram === String(gb)}
                  className={chipClass({ active: ram === String(gb), size: "sm" })}
                >
                  {gb}GB
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 자동으로 채운 결과. 버튼은 남겨 둔다 — 감지가 실패했거나 기기를 바꾼 사람이 다시 부른다 */}
      {autoNote && (
        <p aria-live="polite" className="text-[11.5px] leading-[1.6] text-dim">
          {autoNote}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className={buttonClass({ variant: "accent" })}>
          {COMPAT_MESSAGES.check}
        </button>
        <DetectButton
          onDetected={(spec) => {
            if (spec.gpuName) setGpuPick(spec.gpuName);
            if (spec.osFamily) setOsPick(spec.osFamily);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href={ROUTES.settingsDevices} className="text-[12.5px] text-acc hover:underline">
          {COMPAT_MESSAGES.cta}
        </Link>
        <p className="text-[11.5px] text-dim">{DEVICE_MESSAGES.guestNote}</p>
      </div>
    </Panel>
  );
}
