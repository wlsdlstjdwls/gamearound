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
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { buttonClass } from "@/components/ui/button";
import { DeviceForm } from "@/components/devices/device-form";
import { chipClass } from "@/components/ui/chip";
import { Clamp } from "@/components/ui/tooltip";
import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatSizeMb } from "@/lib/format";
import { COMPAT_MESSAGES, OS_FAMILY_LABEL, VERDICT_PART_LABEL } from "@/lib/games/messages";
import { useGuestDevice, type CompatDevice } from "@/components/devices/guest-device";
import { GuestDeviceForm } from "@/components/devices/guest-device-form";
import { findModel, listModels, modelByKey } from "@/lib/hardware";
import { type PartSlot, type PartVerdict, type RequirementSpec } from "@/lib/hardware/verdict";
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

const PART_TONE: Record<PartVerdict["status"], { text: string; Icon: typeof CheckCircleIcon }> = {
  meets: { text: "text-verdict-ok", Icon: CheckCircleIcon },
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
  const isAccount = devices.length > 0;
  return (
    // 제목과 위쪽 헤어라인은 이 컴포넌트가 그리지 않는다(2026-09-21) — 사양표와 한 마디로 묶이면서
    // 둘의 공통 머리를 RunCheck 가 맡는다. 여기서 또 그리면 선이 두 번 그어지고 기준선도 어긋난다
    //
    // **2026-11-23 간결 개편(사용자 "색상이나 뱃지 형태, 디자인이 구려, 심플하게 많은 영역 차지하지 않게", "기기 관리로 화면이 넘어가 등록이 어렵다").**
    //   - 입력은 늘 팝업(DeviceSheet)이다. 이 칸에 입력 판을 펴 두면 칸 높이가 판정의 두 배였다. 계정 기기도 화면을 떠나지 않고 팝업에서 고친다.
    //   - 결론은 큰 면 대신 알약 하나(초록은 fitin-app 의 status_success, globals 의 --verdict-ok). 병목 한 줄은 알약 옆에 잇는다.
    //   - 부위 줄은 헤어라인 표 대신 촘촘한 세 줄 — 이름, 내 값, 결과 아이콘.
    <section aria-labelledby="compat-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span className="text-[12.5px] font-medium text-dim">{COMPAT_MESSAGES.judgedWith}</span>
        {device && all.length > 1 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={COMPAT_MESSAGES.judgedWith}>
            {all.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setSelected(d.id)} aria-pressed={d.id === device.id} className={chipClass({ active: d.id === device.id, size: "sm" })}>
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        ) : device ? (
          <span className="text-[13px] font-bold text-ink">
            {device.label} <span className="font-medium text-mut">({OS_FAMILY_LABEL[device.osFamily]})</span>
          </span>
        ) : (
          <span className="text-[13px] text-mut">{COMPAT_MESSAGES.noDevice}</span>
        )}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setEditing(true)}
          className={buttonClass({ variant: device ? "secondary" : "accent", size: "sm", className: "ml-auto" })}
        >
          {device ? COMPAT_MESSAGES.changeSpec : COMPAT_MESSAGES.enterSpec}
        </button>
      </div>

      {device && !group && (
        // 맥 사용자에게 먼저 답해야 하는 것은 사양이 아니라 "네이티브 빌드가 있느냐" 다(설계 §5).
        // 사양 행이 없다는 사실로 추측하지 않는다 — 맥판이 있는데 스토어가 사양을 윈도우 하나로만 적어 둔 게임이 흔하다
        <p className="text-[13px] leading-[1.7] text-mut">{nativeNote(platforms, device.osFamily)}</p>
      )}

      {device && verdict && (
        <>
          {/* 결론 알약("최소 사양에 못 미쳐요")과 병목 한 줄은 걷었다(2026-11-23 사용자 "제거") — 마디 제목 옆 한 마디(VerdictNote)가
              같은 결론을 접힌 채로도 말한다. 여기는 부위별 결과만 */}
          {/* 요구값은 옆 기둥 사양표가 적는다(2026-09-22 사용자 "최소는 나올 필요 없고 내 기기 정보") — 여기는 내 값과 결과만 */}
          <ul className="flex flex-col gap-1">
            {verdict.parts.map((p) => {
              const partTone = PART_TONE[p.status];
              const mine = mineText(device, p.slot);
              const why = p.status === "unknown" ? whyText(p.reason) : null;
              return (
                <li key={p.slot} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px] leading-[1.6]">
                  <span className="text-dim">{VERDICT_PART_LABEL[p.slot]}</span>
                  <span className="flex min-w-0 items-baseline gap-2">
                    {/* 내 부품 이름은 길다("AMD Ryzen 7 5800X3D") — 한 줄로 자르고 잘렸을 때만 말풍선이 붙는다 */}
                    {mine && (
                      <Clamp lines={1} className="min-w-0 text-ink-2">
                        {mine}
                      </Clamp>
                    )}
                    {why && <span className="shrink-0 text-[11.5px] text-dim-2">{why}</span>}
                  </span>
                  <span className={cn("flex shrink-0 items-center gap-1 text-[12.5px]", p.status === "unknown" ? "text-mut" : cn("font-bold", partTone.text))}>
                    <partTone.Icon size={14} className="shrink-0" />
                    {statusText(p.status)}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* 면책이 아니라 기준이다(messages 의 basis 주석) */}
          {/* 문장이 아니라 "이름: 값" 두 줄(2026-11-23 사용자 "문구가 아니라 타이틀: 값 이런 식으로") */}
          <dl className="flex flex-col gap-0.5 text-[11.5px] leading-[1.6]">
            {COMPAT_MESSAGES.basis.map((b) => (
              <div key={b.label} className="flex gap-1.5">
                <dt className="shrink-0 font-semibold text-mut">{b.label}:</dt>
                <dd className="text-dim">{b.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <DeviceSheet
        open={editing}
        onClose={() => setEditing(false)}
        account={isAccount ? (device as AccountDevice | null) : null}
        guest={guest}
        onGuestSaved={(d) => {
          setSelected(d.id);
          setEditing(false);
        }}
      />
    </section>
  );
}

type AccountDevice = CompatDevice & { isPrimary?: boolean };

/**
 * 사양 입력 팝업(2026-11-23). 계정 기기는 설정 화면과 같은 폼(DeviceForm, 서버 액션 저장)으로 고르고 있는 기기를 고친다 —
 * 저장 뒤 router.refresh 로 이 화면의 판정이 새 값을 받는다. 계정 기기가 없으면(비회원, 기기 없는 회원) 브라우저에 두는 간이 폼이다.
 */
function DeviceSheet({
  open,
  onClose,
  account,
  guest,
  onGuestSaved,
}: {
  open: boolean;
  onClose: () => void;
  account: AccountDevice | null;
  guest: CompatDevice | null;
  onGuestSaved: (d: CompatDevice) => void;
}) {
  const router = useRouter();
  const cpuOptions = useMemo(() => listModels("cpu"), []);
  const gpuOptions = useMemo(() => listModels("gpu"), []);
  return (
    <Sheet
      title={COMPAT_MESSAGES.sheetTitle}
      size="wide"
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      {open &&
        (account ? (
          <DeviceForm
            device={{
              ...account,
              isPrimary: account.isPrimary ?? false,
              cpuName: modelByKey("cpu", account.cpuModelKey)?.name ?? null,
              gpuName: modelByKey("gpu", account.gpuModelKey)?.name ?? null,
            }}
            cpuOptions={cpuOptions}
            gpuOptions={gpuOptions}
            onDone={() => {
              onClose();
              router.refresh();
            }}
          />
        ) : (
          <GuestDeviceForm current={guest} onSaved={onGuestSaved} onCancel={onClose} bare />
        ))}
    </Sheet>
  );
}
