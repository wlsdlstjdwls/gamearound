"use client";
// "내 PC 로 돌아갈까요" — 설계 문서 §7. 사양표 옆에서 결론과 부위별 결과를 말한다.
//
// **클라이언트에서 판정하는 이유가 둘이다.**
//   1) 비회원의 기기는 브라우저에만 있다. 로그인을 요구하면 이 기능을 아무도 안 쓴다(설계 §4).
//   2) 판정은 순수 계산이라(티어 비교) 서버 왕복이 필요 없다. 기기를 바꿔 볼 때마다
//      Neon 왕복(실측 220ms)을 기다릴 이유가 없다.
// 규칙 자체는 lib/hardware/verdict 한 곳에 있다 — 서버가 판정할 일이 생겨도 같은 함수를 쓴다.
import { useState } from "react";
import { SectionHead } from "@/components/ui/page";
import { chipClass } from "@/components/ui/chip";
import { ROWS } from "@/components/ui/page";
import { COMPAT_MESSAGES, OS_FAMILY_LABEL, VERDICT_LABEL, VERDICT_PART_LABEL } from "@/lib/games/messages";
import { useGuestDevice, type CompatDevice } from "@/components/devices/guest-device";
import { GuestDeviceForm } from "@/components/devices/guest-device-form";
import { judge, type PartVerdict, type RequirementSpec } from "@/lib/hardware/verdict";
import { nativeSupport, type NativeFlags } from "@/lib/hardware/native";
import type { RequirementGroupDto } from "@/server/services/games";

export type { CompatDevice };

const toSpec = (r: RequirementGroupDto["minimum"]): RequirementSpec | null =>
  r ? { cpuTiers: r.cpuTiers, gpuTiers: r.gpuTiers, ramMb: r.ramMb, storageMb: r.storageMb } : null;

function StatusDot({ status }: { status: PartVerdict["status"] }) {
  const tone = status === "meets" ? "bg-ok" : status === "below" ? "bg-danger" : "bg-dim-2";
  return <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />;
}

/** 사양 행이 없는 OS 에 붙일 한 줄. 스토어가 "없다" 고 한 것과 아무 말 안 한 것을 가려 말한다 */
function nativeNote(platforms: NativeFlags[], osFamily: CompatDevice["osFamily"]): string {
  const os = OS_FAMILY_LABEL[osFamily];
  const support = nativeSupport(platforms, osFamily);
  if (support === "no") return COMPAT_MESSAGES.nativeNo(os);
  if (support === "yes") return COMPAT_MESSAGES.nativeYesNoSpec(os);
  return COMPAT_MESSAGES.nativeUnknown(os);
}

function statusText(status: PartVerdict["status"]): string {
  if (status === "meets") return COMPAT_MESSAGES.meets;
  if (status === "below") return COMPAT_MESSAGES.below;
  return COMPAT_MESSAGES.unknownPart;
}

export function CompatSection({
  groups,
  devices,
  platforms,
}: {
  groups: RequirementGroupDto[];
  devices: CompatDevice[];
  /** 네이티브 빌드 여부. 사양 행이 없을 때 "지원 안 함" 을 추측이 아니라 사실로 말하기 위한 값이다 */
  platforms: NativeFlags[];
}) {
  const [selected, setSelected] = useState<string | null>(devices[0]?.id ?? null);
  /** 비회원이 적어 둔 기기를 다시 펴 놓았나. 한 번 저장하면 못 고치는 화면이 되면 안 된다 */
  const [editing, setEditing] = useState(false);
  // 서버 그림에서는 늘 null 이다 — 브라우저에만 있는 값이라 서버가 알 방법이 없다
  const guest = useGuestDevice();

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
      <div className="flex flex-col gap-3.5 border-t border-line-strong pt-4">
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
                  className={chipClass({ active: d.id === device.id })}
                >
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {device && !group && !editing && (
          // 맥 사용자에게 먼저 답해야 하는 것은 사양이 아니라 "네이티브 빌드가 있느냐" 다(설계 §5).
          // 사양 행이 없다는 사실로 추측하지 않는다 — 맥판이 있는데 스토어가 사양을 윈도우 하나로만
          // 적어 둔 게임이 흔하고, 그때 옛 문구는 멀쩡히 도는 게임을 "지원 안 함" 이라고 말했다
          <p className="text-[13px] leading-[1.7] text-mut">{nativeNote(platforms, device.osFamily)}</p>
        )}

        {verdict && !editing && (
          <>
            <p className="text-[15px] font-bold text-ink">{VERDICT_LABEL[verdict.overall]}</p>
            {/* 항목별 판정은 헤어라인 표다 — 왼쪽은 무엇을, 오른쪽은 되는지. 눈이 오른쪽 기둥만 훑어도 답이 난다 */}
            <ul className={ROWS}>
              {verdict.parts.map((p) => (
                <li key={p.slot} className="flex items-baseline justify-between gap-2.5 py-[11px] text-[13px] leading-[1.6]">
                  <span className="flex items-center gap-2 text-mut">
                    <StatusDot status={p.status} />
                    {VERDICT_PART_LABEL[p.slot]}
                  </span>
                  <span className={p.status === "below" ? "font-bold text-danger" : p.status === "unknown" ? "text-mut" : "font-bold text-ok"}>
                    {statusText(p.status)}
                  </span>
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
      </div>
    </section>
  );
}
