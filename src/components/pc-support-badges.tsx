// PC 구동 칩 — 스팀덱 등급과 네이티브 OS. 기기 등록과 무관하게 바로 뜨는 값이다(사양 설계 §0, §5).
//
// 왜 플랫폼 행을 받아 접는가: 두 값 다 스토어의 성질이라 game_platforms 에 붙어 있다.
// 그런데 사용자에게는 "이 게임이 내 덱에서 도나" 하나의 질문이라, 칩은 게임 머리에 한 줄로 선다.
// 스팀 행이 없는 게임(콘솔 전용)은 아무것도 그리지 않는다 — 물어볼 축 자체가 없다.
//
// **등급에 따라 칩의 무게를 가른다**(2026-09-21): 전에는 셋이 같은 회색 칩이라
// "스팀덱 검증됨" 과 "스팀덱 미지원" 이 화면에서 똑같이 생겼다. 덱을 가진 사람이 이 화면에서
// 찾는 것은 등급 문자열이 아니라 "사도 되나" 한 글자다. 되는 쪽만 브랜드 면과 기기 그림을 주고,
// 안 되는 쪽은 사실만 남기고 물러난다 — 미지원을 빨강으로 칠하지 않는 이유는 그게 결함이 아니라
// 그냥 기기가 다르다는 뜻이어서다.
import { DeckIcon } from "@/components/ui/icons";
import { DECK_COMPAT_LABEL, NATIVE_OS_LABEL } from "@/lib/games/messages";
import { cn } from "@/lib/cn";
import type { DeckCompat } from "@/server/db/schema";
import type { PlatformDto } from "@/server/services/games";

type Props = { platforms: Pick<PlatformDto, "deckCompat" | "nativeMac" | "nativeLinux">[] };

const CHIP = "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px]";

/** 등급별 칩 차림. 검증됨만 굵은 글자다 — 밸브가 "여기서 그냥 돌아간다" 고 단언한 유일한 등급이다 */
const DECK_CHIP: Record<DeckCompat, string> = {
  verified: "bg-acc-soft font-bold text-acc",
  playable: "bg-acc-soft text-acc",
  unsupported: "bg-surface-2 text-dim",
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span className={cn(CHIP, "bg-surface-2 text-ink-2")}>{children}</span>;
}

export function PcSupportBadges({ platforms }: Props) {
  // 여러 스토어가 같은 사실을 말할 수 있어(맥 지원) 값 단위로 접는다. 등급은 스팀만 주므로 첫 값이 곧 답이다
  const deck = platforms.find((p) => p.deckCompat !== null)?.deckCompat ?? null;
  const os = [
    platforms.some((p) => p.nativeMac === true) ? NATIVE_OS_LABEL.mac : null,
    platforms.some((p) => p.nativeLinux === true) ? NATIVE_OS_LABEL.linux : null,
  ].filter((v) => v !== null);

  if (!deck && os.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="PC 구동">
      {deck && (
        <li>
          <span className={cn(CHIP, DECK_CHIP[deck])}>
            {/* 미지원 칩에는 기기 그림을 안 붙인다 — 그림이 있으면 훑는 눈에는 "덱 된다" 로 먼저 읽힌다 */}
            {deck !== "unsupported" && <DeckIcon size={14} className="shrink-0" />}
            {DECK_COMPAT_LABEL[deck]}
          </span>
        </li>
      )}
      {os.map((label) => (
        <li key={label}>
          <Chip>{label}</Chip>
        </li>
      ))}
    </ul>
  );
}
