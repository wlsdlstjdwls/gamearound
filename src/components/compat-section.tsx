"use client";
// "내 PC 로 돌아갈까요" — 설계 문서 §7. 사양표 옆에서 결론과 부위별 결과를 말한다.
//
// **클라이언트에서 판정하는 이유가 둘이다.**
//   1) 비회원의 기기는 브라우저에만 있다. 로그인을 요구하면 이 기능을 아무도 안 쓴다(설계 §4).
//   2) 판정은 순수 계산이라(티어 비교) 서버 왕복이 필요 없다. 기기를 바꿔 볼 때마다
//      Neon 왕복(실측 220ms)을 기다릴 이유가 없다.
// 규칙 자체는 lib/hardware/verdict 한 곳에 있다 — 서버가 판정할 일이 생겨도 같은 함수를 쓴다.
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { COMPAT_MESSAGES, DEVICE_MESSAGES, OS_FAMILY_LABEL, VERDICT_LABEL, VERDICT_PART_LABEL } from "@/lib/games/messages";
import { GUEST_DEVICE_STORAGE_KEY } from "@/lib/hardware/device-schemas";
import { judge, type DeviceSpec, type PartVerdict, type RequirementSpec } from "@/lib/hardware/verdict";
import { findModel, modelByKey } from "@/lib/hardware";
import { ROUTES } from "@/lib/routes";
import type { RequirementGroupDto } from "@/server/services/games";
import type { OsFamily } from "@/server/db/schema";

/** 화면이 다루는 기기 한 대. 로그인 사용자는 서버가, 비회원은 브라우저가 준다 */
export type CompatDevice = DeviceSpec & { id: string; label: string; osFamily: OsFamily };

const toSpec = (r: RequirementGroupDto["minimum"]): RequirementSpec | null =>
  r ? { cpuTiers: r.cpuTiers, gpuTiers: r.gpuTiers, ramMb: r.ramMb, storageMb: r.storageMb } : null;

/**
 * 브라우저 저장을 React 가 구독할 수 있는 **외부 저장소**로 다룬다.
 *
 * effect 안에서 setState 로 읽어 오지 않는 이유: 그 방식은 첫 그림 뒤에 한 번 더 그리게 만들고
 * (렌더 두 번), 다른 탭에서 기기를 바꿔도 이 화면이 모른다. useSyncExternalStore 는 서버 그림에서
 * null 을 쓰고 브라우저에서 실제 값을 쓰므로 수분화도 어긋나지 않는다.
 */
const GUEST_DEVICE_EVENT = "gamearound:device";

function subscribeGuestDevice(onChange: () => void): () => void {
  // storage 이벤트는 **다른 탭**의 변경만 알려 준다. 이 탭에서 저장했을 때는 우리가 직접 알린다
  window.addEventListener("storage", onChange);
  window.addEventListener(GUEST_DEVICE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUEST_DEVICE_EVENT, onChange);
  };
}

function guestDeviceSnapshot(): string | null {
  try {
    return window.localStorage.getItem(GUEST_DEVICE_STORAGE_KEY);
  } catch {
    // 사생활 보호 모드에서는 읽기 자체가 던진다. 기기가 없는 것과 같게 다룬다
    return null;
  }
}

/** 저장된 문자열 → 기기. 모양이 다르면 없는 것으로 본다 — 저장소의 값은 언제든 낡거나 깨져 있을 수 있다 */
function parseGuestDevice(raw: string | null): CompatDevice | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompatDevice>;
    if (!parsed || typeof parsed.label !== "string" || typeof parsed.osFamily !== "string") return null;
    return {
      id: "guest",
      label: parsed.label,
      osFamily: parsed.osFamily as OsFamily,
      cpuModelKey: parsed.cpuModelKey ?? null,
      gpuModelKey: parsed.gpuModelKey ?? null,
      ramMb: parsed.ramMb ?? null,
      storageFreeMb: parsed.storageFreeMb ?? null,
    };
  } catch {
    return null;
  }
}

function StatusDot({ status }: { status: PartVerdict["status"] }) {
  const tone = status === "meets" ? "bg-ok" : status === "below" ? "bg-danger" : "bg-dim-2";
  return <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />;
}

function statusText(status: PartVerdict["status"]): string {
  if (status === "meets") return COMPAT_MESSAGES.meets;
  if (status === "below") return COMPAT_MESSAGES.below;
  return COMPAT_MESSAGES.unknownPart;
}

/**
 * 비회원용 간이 등록. 계정 화면의 폼과 달리 기기 이름도 저장공간도 묻지 않는다 —
 * 여기서 답해야 하는 질문은 "이 게임이 돌아가나" 하나뿐이고, 칸이 늘수록 안 쓴다.
 * 로그인해서 여러 대를 관리하고 싶은 사람에게는 아래 링크가 있다.
 */
function GuestDeviceForm({ current, onSaved }: { current: CompatDevice | null; onSaved: (device: CompatDevice) => void }) {
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
    try {
      window.localStorage.setItem(GUEST_DEVICE_STORAGE_KEY, JSON.stringify(device));
      window.dispatchEvent(new Event(GUEST_DEVICE_EVENT));
    } catch {
      // 저장이 막혀도 이번 화면의 판정은 해 준다 — 다음 방문에 다시 적게 될 뿐이다
    }
    onSaved(device);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.7] text-mut">{COMPAT_MESSAGES.guestLead}</p>
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
      <div className="grid gap-2 sm:grid-cols-3">
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

/** 간이 폼의 입력칸. 폭이 좁아 공용 TextField 의 라벨 자리를 못 쓴다 — 라벨은 aria 로만 준다 */
const FIELD_CLASS =
  "h-[44px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-dim focus:border-ink";

export function CompatSection({ groups, devices }: { groups: RequirementGroupDto[]; devices: CompatDevice[] }) {
  const [selected, setSelected] = useState<string | null>(devices[0]?.id ?? null);
  /** 비회원이 적어 둔 기기를 다시 펴 놓았나. 한 번 저장하면 못 고치는 화면이 되면 안 된다 */
  const [editing, setEditing] = useState(false);
  // 서버 그림에서는 늘 null 이다 — 브라우저에만 있는 값이라 서버가 알 방법이 없다
  const guestRaw = useSyncExternalStore(subscribeGuestDevice, guestDeviceSnapshot, () => null);
  const guest = useMemo(() => parseGuestDevice(guestRaw), [guestRaw]);

  const all = devices.length > 0 ? devices : guest ? [guest] : [];
  const device = all.find((d) => d.id === selected) ?? all[0] ?? null;
  // 사양이 없는 게임에는 이 칸 자체가 서지 않는다(콘솔 전용은 groups 가 비어 있다)
  if (groups.length === 0) return null;

  // 기기의 OS 에 맞는 사양을 견준다. 그 OS 사양이 아예 없으면 네이티브 지원이 없다는 뜻이다(설계 §5)
  const group = device ? groups.find((g) => g.osFamily === device.osFamily) ?? null : null;
  const verdict = device && group ? judge(device, toSpec(group.minimum), toSpec(group.recommended)) : null;

  return (
    <section aria-labelledby="compat-heading" className="flex flex-col gap-3">
      <SectionHead id="compat-heading" title={COMPAT_MESSAGES.heading} />
      <Card className="flex flex-col gap-3.5 px-4 py-4">
        {(!device || editing) && (
          // 비회원에게 로그인부터 요구하지 않는다(설계 §4). 이 자리에서 바로 적게 하고 브라우저에 둔다
          <GuestDeviceForm
            current={guest}
            onSaved={(d) => {
              setSelected(d.id);
              setEditing(false);
            }}
          />
        )}

        {device && all.length > 1 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="기기 고르기">
            {all.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelected(d.id)}
                  aria-pressed={d.id === device.id}
                  className={`press inline-flex min-h-[36px] items-center rounded-full border px-3 text-[12.5px] transition-colors ${
                    d.id === device.id ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink"
                  }`}
                >
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {device && !group && !editing && (
          // 맥 사용자에게 먼저 답해야 하는 것은 사양이 아니라 "네이티브 빌드가 있느냐" 다(설계 §5)
          <p className="text-[13px] leading-[1.7] text-mut">
            {OS_FAMILY_LABEL[device.osFamily]} 사양이 없어요. 이 게임은 {OS_FAMILY_LABEL[device.osFamily]} 을 지원하지 않는 것으로 보여요.
          </p>
        )}

        {verdict && !editing && (
          <>
            <p className="text-[15px] font-bold text-ink">{VERDICT_LABEL[verdict.overall]}</p>
            <ul className="flex flex-col gap-1.5">
              {verdict.parts.map((p) => (
                <li key={p.slot} className="flex items-start gap-2 text-[12.5px] leading-[1.6]">
                  <StatusDot status={p.status} />
                  <span className="w-[68px] shrink-0 text-dim">{VERDICT_PART_LABEL[p.slot]}</span>
                  <span className={p.status === "below" ? "text-danger" : "text-mut"}>{statusText(p.status)}</span>
                </li>
              ))}
            </ul>
            {verdict.hasUnknown && <p className="text-[12px] text-dim">{COMPAT_MESSAGES.partial}</p>}
            <p className="text-[11.5px] leading-[1.6] text-dim">{COMPAT_MESSAGES.note}</p>
            {/* 등록된 기기가 없는 사람(= 브라우저에 적어 둔 사람)만 여기서 고친다.
                계정에 기기가 있는 사람은 설정 화면이 제자리다 */}
            {devices.length === 0 && (
              <div>
                <button type="button" onClick={() => setEditing(true)} className="text-[12.5px] text-acc hover:underline">
                  {COMPAT_MESSAGES.editDevice}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
