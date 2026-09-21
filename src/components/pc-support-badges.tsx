// PC 구동 칩 — 스팀덱 등급과 네이티브 OS. 기기 등록과 무관하게 바로 뜨는 값이다(사양 설계 §0, §5).
//
// 왜 플랫폼 행을 받아 접는가: 두 값 다 스토어의 성질이라 game_platforms 에 붙어 있다.
// 그런데 사용자에게는 "이 게임이 내 덱에서 도나" 하나의 질문이라, 칩은 게임 머리에 한 줄로 선다.
// 스팀 행이 없는 게임(콘솔 전용)은 아무것도 그리지 않는다 — 물어볼 축 자체가 없다.
import { DECK_COMPAT_LABEL, NATIVE_OS_LABEL } from "@/lib/games/messages";
import type { PlatformDto } from "@/server/services/games";

type Props = { platforms: Pick<PlatformDto, "deckCompat" | "nativeMac" | "nativeLinux">[] };

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 px-[11px] py-[5px] text-[12.5px] text-ink-2">
      {children}
    </span>
  );
}

export function PcSupportBadges({ platforms }: Props) {
  // 여러 스토어가 같은 사실을 말할 수 있어(맥 지원) 값 단위로 접는다. 등급은 스팀만 주므로 첫 값이 곧 답이다
  const deck = platforms.find((p) => p.deckCompat !== null)?.deckCompat ?? null;
  const items = [
    deck ? DECK_COMPAT_LABEL[deck] : null,
    platforms.some((p) => p.nativeMac === true) ? NATIVE_OS_LABEL.mac : null,
    platforms.some((p) => p.nativeLinux === true) ? NATIVE_OS_LABEL.linux : null,
  ].filter((v): v is string => v !== null);

  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="PC 구동">
      {items.map((label) => (
        <li key={label}>
          <Chip>{label}</Chip>
        </li>
      ))}
    </ul>
  );
}
