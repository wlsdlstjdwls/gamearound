"use client";
// 판정 마디 제목 옆 한 마디 — "내 기기가 최소 사양을 넘나" 만 말한다(2026-09-22, 사용자 지정).
//
// 왜 제목 옆인가: 이 마디는 접혀 있다(RunCheck 의 defaultOpen=false). 접힌 채로 "내 PC 로 돌아갈까요" 만
// 보이면, 기기를 이미 적어 둔 사람도 답을 보려고 마디를 열어야 한다. 답 자체가 한 단어라 제목 옆에 선다.
//
// **내 부품 이름을 적지 않는다**(한 번 그렇게 만들었다가 사용자가 바로잡았다). 내 기기는 내가 아는 값이고,
// 여기서 궁금한 것은 "그래서 되나 안 되나" 하나다. 부품과 근거는 마디를 열면 표가 다 말한다.
//
// 판정 규칙은 CompatSection 과 **같은 함수**를 쓴다(verdictForDevice). 두 자리가 다른 답을 하면
// 제목 옆에서 "충족" 을 보고 열었더니 "모자람" 이 서 있는 화면이 된다.
import { judge, type OverallVerdict, type Verdict } from "@/lib/hardware/verdict";
import { VERDICT_SHORT_LABEL } from "@/lib/games/messages";
import { cn } from "@/lib/cn";
import { useGuestDevice, type CompatDevice } from "./guest-device";

/** 이 판정이 읽는 사양 묶음. 서비스 DTO 의 부분집합이라 타입을 그대로 들이지 않는다 */
export type VerdictGroup = {
  osFamily: string;
  minimum: { cpuTiers: Array<number | null>; gpuTiers: Array<number | null>; ramMb: number | null; storageMb: number | null } | null;
  recommended: { cpuTiers: Array<number | null>; gpuTiers: Array<number | null>; ramMb: number | null; storageMb: number | null } | null;
};

/**
 * 기기 하나를 그 기기의 OS 사양과 견준다. 그 OS 사양이 아예 없으면 견줄 것이 없다는 뜻이고(설계 §5)
 * 그때는 group 이 null 이다 — 부르는 쪽이 "네이티브 빌드가 없다" 를 따로 말한다.
 */
export function verdictForDevice(
  device: CompatDevice | null,
  groups: VerdictGroup[],
): { group: VerdictGroup | null; verdict: Verdict | null } {
  if (!device) return { group: null, verdict: null };
  const group = groups.find((g) => g.osFamily === device.osFamily) ?? null;
  if (!group) return { group: null, verdict: null };
  return { group, verdict: judge(device, group.minimum, group.recommended) };
}

/**
 * 판정 한 마디의 차림. 모르는 것에는 색을 주지 않는다.
 *
 * 미충족은 **꽉 찬 밝은 빨강 + 흰 글자**다(2026-09-30, 사용자: "최소 사양 미충족 뱃지 색상이 어두워").
 * 전에는 중립 면(--surface-3) + --danger 글자였는데, 회색 면 위 벽돌색 글자가 11px 에서 탁하게 가라앉았다.
 * 09-22 에 걷은 "빨간 면 위 빨간 글자" 로 돌아간 것이 아니다 — 면과 글자가 반대편이라 겹치지 않는다.
 * 글자는 --on-verdict 다(라이트 순백 4.51:1, 다크 먹색) — 흰색을 박으면 다크의 밝은 빨강 위에서 대비가 무너지고,
 * --on-ink(#f9fafb)는 라이트에서 4.32:1 로 본문 기준에 모자란다.
 */
const TONE: Record<OverallVerdict, string> = {
  meets_recommended: "bg-ok-soft text-ok",
  meets_minimum: "bg-ok-soft text-ok",
  below_minimum: "bg-verdict-bad text-on-verdict",
  unknown: "bg-surface-2 text-mut",
};

export function VerdictNote({ devices, groups }: { devices: CompatDevice[]; groups: VerdictGroup[] }) {
  // 로그인 사용자는 서버가, 비회원은 브라우저가 기기를 준다. 고르는 규칙은 판정 칸과 같다(첫 줄이 기본 기기)
  const guest = useGuestDevice();
  const device = devices[0] ?? guest;
  const { verdict } = verdictForDevice(device, groups);
  // 기기를 아직 안 적었거나 그 OS 사양이 없으면 아무 말도 하지 않는다 — 마디를 열면 폼과 안내가 서 있다
  if (!verdict || verdict.overall === "unknown") return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-bold leading-none", TONE[verdict.overall])}>
      {VERDICT_SHORT_LABEL[verdict.overall]}
    </span>
  );
}
