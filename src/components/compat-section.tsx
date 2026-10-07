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
import { judgeAgainst, type OverallVerdict, type PartSlot, type PartVerdict, type RequirementSpec } from "@/lib/hardware/verdict";
import { verdictForDevice, type VerdictGroup } from "@/components/devices/verdict-note";
import { nativeSupport, type NativeFlags } from "@/lib/hardware/native";
import type { RequirementGroupDto } from "@/server/services/games";

export type { CompatDevice };

const toSpec = (r: RequirementGroupDto["minimum"]): RequirementSpec | null =>
  r ? { cpuTiers: r.cpuTiers, gpuTiers: r.gpuTiers, ramMb: r.ramMb, storageMb: r.storageMb } : null;

/** 사양 DTO → 판정이 읽는 모양. 판정은 티어만 본다(문구는 근거 줄이 따로 읽는다) */
const toVerdictGroup = (g: RequirementGroupDto): VerdictGroup => ({
  osFamily: g.osFamily,
  minimum: toSpec(g.minimum),
  recommended: toSpec(g.recommended),
});

/**
 * 결론 면의 차림.
 *
 * **미충족에서 빨간 면을 걷었다**(2026-09-22, 사용자 지적: "빨간배경 빨간글씨 넘 구려").
 * --danger-soft 위에 --danger 글자는 대비는 서지만(4.5:1 넘는다) 같은 계열 둘이 겹쳐
 * 면이 글자를 밀어내는 것처럼 탁하게 읽혔다. 게다가 이 결과는 오류가 아니다 —
 * 게임이 이 기기보다 무겁다는 사실일 뿐이라, 경고 면을 통째로 깔 만한 사건이 아니다.
 *
 * 그래서 면은 중립(--surface-2)으로 두고 색은 **아이콘과 결론 한 줄**만 갖는다.
 * 통과 쪽 초록 면은 그대로다 — 거기는 색이 하나뿐이라 겹치는 문제가 없고,
 * 두 결과가 같은 회색 면이면 훑는 눈이 둘을 구별할 표시를 잃는다.
 *
 * **그 글자색은 --danger 가 아니라 --verdict-bad 다**(같은 날 사용자 지적: "빨간색이 아닌거 같은데...?").
 * --danger 는 11px 배지(마감 임박)용으로 채도를 낮춘 벽돌색이라, 중립 면 위 15px 한 줄로 서면
 * 갈색으로 읽힌다. 근거는 globals.css 의 --verdict-bad 주석.
 */
const OVERALL_TONE: Record<OverallVerdict, { panel: string; text: string; Icon: typeof CheckCircleIcon }> = {
  meets_recommended: { panel: "bg-ok-soft", text: "text-ok", Icon: CheckCircleIcon },
  meets_minimum: { panel: "bg-ok-soft", text: "text-ok", Icon: CheckCircleIcon },
  below_minimum: { panel: "bg-surface-2", text: "text-verdict-bad", Icon: XCircleIcon },
  unknown: { panel: "bg-surface-2", text: "text-mut", Icon: MinusCircleIcon },
};

const PART_TONE: Record<PartVerdict["status"], { text: string; Icon: typeof CheckCircleIcon }> = {
  meets: { text: "text-ok", Icon: CheckCircleIcon },
  below: { text: "text-verdict-bad", Icon: XCircleIcon },
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
  // no-requirement(스토어가 사양을 안 적음)는 덧말 없이 "미확인" 만 둔다(2026-10-07, 사용자 지정)
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

  // 기기의 OS 에 맞는 사양을 견준다. 그 OS 사양이 아예 없으면 네이티브 지원이 없다는 뜻이다(설계 §5).
  // 마디 제목 옆의 한 마디(VerdictNote)와 **같은 함수**를 쓴다 — 두 자리가 다른 답을 하면 안 된다
  const { group, verdict } = verdictForDevice(device, groups.map(toVerdictGroup));
  // 권장 판정을 따로 돌린다 — judge 는 결론 한 글자만 돌려주고 부위별 결과는 최소 기준 것만 준다.
  // 같은 순수 함수라 비용은 티어 비교 네 번뿐이다
  const recSpec = group?.recommended ?? null;
  const recParts = device && recSpec ? judgeAgainst(device, recSpec) : null;
  const tone = verdict ? OVERALL_TONE[verdict.overall] : null;
  const lead = verdict ? leadText(verdict.overall, verdict.parts, recParts) : null;
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

            {/*
              항목별 판정은 헤어라인 표다. 왼쪽은 무엇을, 오른쪽은 되는지 —
              눈이 오른쪽 기둥만 훑어도 답이 나고, 무엇과 견줬는지는 그 왼쪽이 말한다.

              **요구값("최소 16GB")을 뺐다**(2026-09-22, 사용자 지정: "최소는 나올 필요 없고 각 타이틀 옆
              내 기기 정보 보여주면 될듯"). 요구값은 바로 옆 기둥의 사양표가 통째로 적고 있어서, 이 표는
              같은 숫자를 줄마다 한 번 더 말하고 있었다. 여기서만 알 수 있는 값은 **내 기기 쪽**이다.

              그리고 내 값을 아랫줄이 아니라 **항목 이름 옆**에 둔다. 아래로 내리면 항목 하나가 두 줄이 돼
              네 줄짜리 표가 여덟 줄이 됐다. 이름은 짧고(프로세서, 그래픽, 메모리, 저장공간) 옆자리가
              늘 비어 있었다 — "메모리 32GB" 한 줄이면 읽는 일이 한 번에 끝난다.
              "내 기기" 라는 말머리도 뗐다: 이 표에 남은 값이 그것뿐이라 이름을 붙일 이유가 없어졌다.
            */}
            <ul className={ROWS}>
              {verdict.parts.map((p) => {
                const partTone = PART_TONE[p.status];
                const mine = mineText(device, p.slot);
                const why = p.status === "unknown" ? whyText(p.reason) : null;
                return (
                  <li key={p.slot} className="flex items-center justify-between gap-2.5 py-[11px] text-[13px] leading-[1.6]">
                    <span className="flex min-w-0 items-center gap-2">
                      <partTone.Icon size={15} className={cn("shrink-0", partTone.text)} />
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 text-mut">{VERDICT_PART_LABEL[p.slot]}</span>
                        {/* 내 부품 이름은 길다("AMD Ryzen 7 5800X3D") — 한 줄로 자르고 잘렸을 때만 말풍선이 붙는다 */}
                        {mine && (
                          <Clamp lines={1} className="min-w-0 text-[12.5px] text-ink-2">
                            {mine}
                          </Clamp>
                        )}
                        {why && <span className="shrink-0 text-[11.5px] text-dim-2">{why}</span>}
                      </span>
                    </span>
                    <span className={cn("shrink-0", p.status === "unknown" ? "text-mut" : cn("font-bold", partTone.text))}>
                      {statusText(p.status)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {/* 면책이 아니라 기준이다(messages 의 basis 주석) — "다를 수 있어요" 를 지운 자리다 */}
            <p className="text-[11.5px] leading-[1.6] text-dim">{COMPAT_MESSAGES.basis}</p>
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
