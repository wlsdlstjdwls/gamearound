"use client";
// "내 PC 로 돌아갈까요" — 설계 문서 §7. 사양표 옆에서 결론과 부위별 결과를 말한다.
//
// **클라이언트에서 판정하는 이유가 둘이다.**
//   1) 비회원의 기기는 브라우저에만 있다. 로그인을 요구하면 이 기능을 아무도 안 쓴다(설계 §4).
//   2) 판정은 순수 계산이라(티어 비교) 서버 왕복이 필요 없다. 기기를 바꿔 볼 때마다
//      Neon 왕복(실측 220ms)을 기다릴 이유가 없다.
// 규칙 자체는 lib/hardware/verdict 한 곳에 있다 — 서버가 판정할 일이 생겨도 같은 함수를 쓴다.
//
// **2026-09-21 고도화 — 세 가지를 더했다.**
//   1) 결론을 면 위에 올리고 상태색을 준다. 전에는 15px 굵은 글자 한 줄이라, 바로 아래 부위 표의
//      "충족/모자람" 과 같은 무게로 읽혔다. 결론과 근거가 같은 크기면 읽는 순서가 정해지지 않는다.
//   2) 결론 밑에 병목 한 줄을 적는다. 부위 표를 네 줄 훑어야 알던 것을 먼저 말한다.
//   3) 부위 줄에 근거(내 값, 요구값)를 붙인다. "모자람" 만으로는 얼마나 모자란지 모르고,
//      그걸 모르면 사람이 할 수 있는 일(램 증설, 설정 낮추기)을 고를 수 없다.
//      권장 판정도 같이 돌린다 — 최소를 넘은 사람이 다음에 묻는 것은 "쾌적한가" 하나다.
import { useState } from "react";
import { ROWS } from "@/components/ui/page";
import { chipClass } from "@/components/ui/chip";
import { Clamp } from "@/components/ui/tooltip";
import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatSizeMb } from "@/lib/format";
import { COMPAT_MESSAGES, OS_FAMILY_LABEL, VERDICT_LABEL, VERDICT_PART_LABEL } from "@/lib/games/messages";
import { useGuestDevice, type CompatDevice } from "@/components/devices/guest-device";
import { GuestDeviceForm } from "@/components/devices/guest-device-form";
import { findModel } from "@/lib/hardware";
import { judge, judgeAgainst, type OverallVerdict, type PartSlot, type PartVerdict, type RequirementSpec } from "@/lib/hardware/verdict";
import { nativeSupport, type NativeFlags } from "@/lib/hardware/native";
import type { RequirementDto, RequirementGroupDto } from "@/server/services/games";

export type { CompatDevice };

const toSpec = (r: RequirementGroupDto["minimum"]): RequirementSpec | null =>
  r ? { cpuTiers: r.cpuTiers, gpuTiers: r.gpuTiers, ramMb: r.ramMb, storageMb: r.storageMb } : null;

/**
 * 결론 면의 차림. 빨강을 쓰는 자리는 "못 돌아간다" 하나뿐이다.
 * 판정 불가에는 색을 주지 않는다 — 모른다는 것은 좋은 소식도 나쁜 소식도 아니다.
 */
const OVERALL_TONE: Record<OverallVerdict, { panel: string; text: string; Icon: typeof CheckCircleIcon }> = {
  meets_recommended: { panel: "bg-ok-soft", text: "text-ok", Icon: CheckCircleIcon },
  meets_minimum: { panel: "bg-ok-soft", text: "text-ok", Icon: CheckCircleIcon },
  below_minimum: { panel: "bg-danger-soft", text: "text-danger", Icon: XCircleIcon },
  unknown: { panel: "bg-surface-2", text: "text-mut", Icon: MinusCircleIcon },
};

const PART_TONE: Record<PartVerdict["status"], { text: string; Icon: typeof CheckCircleIcon }> = {
  meets: { text: "text-ok", Icon: CheckCircleIcon },
  below: { text: "text-danger", Icon: XCircleIcon },
  unknown: { text: "text-dim-2", Icon: MinusCircleIcon },
};

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

function whyText(reason: PartVerdict["reason"]): string | null {
  if (reason === "no-requirement") return COMPAT_MESSAGES.whyNoRequirement;
  if (reason === "no-device") return COMPAT_MESSAGES.whyNoDevice;
  if (reason === "unknown-model") return COMPAT_MESSAGES.whyUnknownModel;
  return null;
}

/** 내 기기의 그 부위를 사람 말로. 부품 열쇠는 저장용 문자열이라 그대로 보여 주지 않는다 */
function mineText(device: CompatDevice, slot: PartSlot): string | null {
  if (slot === "ram") return device.ramMb ? formatSizeMb(device.ramMb) : null;
  if (slot === "storage") return device.storageFreeMb ? formatSizeMb(device.storageFreeMb) : null;
  const key = slot === "cpu" ? device.cpuModelKey : device.gpuModelKey;
  if (!key) return null;
  // 사전에 없어도 적어 둔 글자는 보여 준다 — "확인 못 함" 옆에 내가 적은 이름이 있어야
  // 오타인지 사전 구멍인지 사람이 가린다
  return findModel(slot, key)?.name ?? key;
}

/** 스토어가 요구한 값. 후보가 여럿인 줄(그래픽)은 한 줄로 잘리고 잘렸을 때만 툴팁이 붙는다 */
function needText(min: RequirementDto | null, slot: PartSlot): string | null {
  if (!min) return null;
  if (slot === "cpu") return min.cpuText;
  if (slot === "gpu") return min.gpuText;
  if (slot === "ram") return min.ramMb ? formatSizeMb(min.ramMb) : null;
  return min.storageMb ? formatSizeMb(min.storageMb) : null;
}

/** 결론 밑 한 줄 — 최소가 모자라면 그 항목, 최소를 넘었으면 권장에 걸리는 항목 */
function leadText(overall: OverallVerdict, minParts: PartVerdict[], recParts: PartVerdict[] | null): string | null {
  const names = (parts: PartVerdict[]) =>
    parts
      .filter((p) => p.status === "below")
      .map((p) => VERDICT_PART_LABEL[p.slot])
      .join(", ");

  if (overall === "below_minimum") {
    const short = names(minParts);
    return short ? COMPAT_MESSAGES.shortOfMinimum(short) : null;
  }
  if (overall === "meets_recommended") return COMPAT_MESSAGES.aboveRecommended;
  if (overall === "meets_minimum") {
    if (!recParts) return COMPAT_MESSAGES.noRecommended;
    const short = names(recParts);
    return short ? COMPAT_MESSAGES.shortOfRecommended(short) : null;
  }
  return null;
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
  // 권장 판정을 따로 돌린다 — judge 는 결론 한 글자만 돌려주고 부위별 결과는 최소 기준 것만 준다.
  // 같은 순수 함수라 비용은 티어 비교 네 번뿐이다
  const recSpec = group ? toSpec(group.recommended) : null;
  const recParts = device && recSpec ? judgeAgainst(device, recSpec) : null;
  const tone = verdict ? OVERALL_TONE[verdict.overall] : null;
  const lead = verdict ? leadText(verdict.overall, verdict.parts, recParts) : null;
  // 근거는 최소 사양과 견준 값이다 — 최소가 없는 게임은 judge 가 권장으로 견주므로 여기도 같은 것을 쓴다
  const basis = group?.minimum ?? group?.recommended ?? null;

  return (
    // 제목과 위쪽 헤어라인은 이 컴포넌트가 그리지 않는다(2026-09-21) — 사양표와 한 마디로 묶이면서
    // 둘의 공통 머리를 RunCheck 가 맡는다. 여기서 또 그리면 선이 두 번 그어지고 기준선도 어긋난다
    <section aria-labelledby="compat-heading">
      <div className="flex flex-col gap-3.5">
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

        {device && verdict && tone && !editing && (
          <>
            {/* 결론 면 — 이 칸에서 면을 가진 것은 여기 하나다(리디자인 규칙: 면은 "따로 읽는 곳" 표시) */}
            <div className={cn("flex items-start gap-2.5 rounded-[var(--radius-panel)] p-3.5", tone.panel)}>
              <tone.Icon size={18} className={cn("mt-px shrink-0", tone.text)} />
              <div className="flex min-w-0 flex-col gap-1">
                <p className={cn("text-[15px] font-bold", tone.text)}>{VERDICT_LABEL[verdict.overall]}</p>
                {lead && <p className="text-[12.5px] leading-[1.6] text-mut">{lead}</p>}
                {verdict.hasUnknown && <p className="text-[12px] text-dim">{COMPAT_MESSAGES.partial}</p>}
              </div>
            </div>

            {/* 항목별 판정은 헤어라인 표다. 왼쪽은 무엇을, 오른쪽은 되는지 —
                눈이 오른쪽 기둥만 훑어도 답이 나고, 근거가 필요하면 그 아래 작은 줄을 읽는다 */}
            <ul className={ROWS}>
              {verdict.parts.map((p) => {
                const partTone = PART_TONE[p.status];
                const mine = mineText(device, p.slot);
                const need = needText(basis, p.slot);
                const why = p.status === "unknown" ? whyText(p.reason) : null;
                // 내 값과 요구값을 한 줄에 잇는다. 둘 다 없으면 줄을 안 세운다 —
                // 빈 근거 줄은 표 높이만 키우고 아무것도 말하지 않는다
                const evidence = [mine ? COMPAT_MESSAGES.mine(mine) : null, need ? COMPAT_MESSAGES.need(need) : null]
                  .filter(Boolean)
                  .join(" | ");
                return (
                  <li key={p.slot} className="flex items-start justify-between gap-2.5 py-[11px] text-[13px] leading-[1.6]">
                    <span className="flex min-w-0 items-start gap-2">
                      <partTone.Icon size={15} className={cn("mt-[3px] shrink-0", partTone.text)} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-mut">{VERDICT_PART_LABEL[p.slot]}</span>
                        {evidence && (
                          <Clamp lines={1} className="text-[11.5px] text-dim">
                            {evidence}
                          </Clamp>
                        )}
                        {why && <span className="text-[11.5px] text-dim-2">{why}</span>}
                      </span>
                    </span>
                    <span className={cn("shrink-0", p.status === "unknown" ? "text-mut" : cn("font-bold", partTone.text))}>
                      {statusText(p.status)}
                    </span>
                  </li>
                );
              })}
            </ul>
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
