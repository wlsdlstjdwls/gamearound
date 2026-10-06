// 한국어 칩 — 한국어 지원(화면, 자막), 한국어 음성, 한국어 미지원.
//
// 칩마다 스토어 이름을 붙이는 이유: 같은 게임이라도 판마다 다르다. PC 판은 한국어인데 스위치 판은 아닌 게임이 흔하고
// (schema 의 ko_text 주석), "한국어 지원" 만 크게 띄우면 그 말을 믿고 스위치 판을 산 사람이 속는다.
//
// 미지원도 그린다. 멀티플레이 칩은 아는 것만 그리지만(multiplayer-badges 주석) 여기는 사정이 다르다 —
// 여기 false 는 "스토어가 안 알려 줌" 이 아니라 스토어가 언어 목록을 주면서 한국어를 빼놓은 것이다.
// 모르는 판(null)은 어느 칩에도 넣지 않는다.
//
// 일본 스토어 행은 보지 않는다. 한국 계정으로 사는 판이 아니고, 그 판의 언어는 한국판과 다를 수 있다.
import { KOREAN_SUPPORT_LABEL } from "@/lib/games/messages";
import { platformLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { HOME_REGION } from "@/server/db/schema";
import type { PlatformDto } from "@/server/services/games";

type Props = { platforms: Pick<PlatformDto, "platform" | "region" | "koText" | "koVoice">[] };

const CHIP = "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px]";

/** 같은 스토어 이름이 둘 이상의 행(PS4, PS5 처럼 기기만 다른 행)에서 겹쳐 나오지 않게 접는다 */
function labelsOf(rows: Props["platforms"]): string {
  return [...new Set(rows.map((p) => platformLabel(p)))].join(", ");
}

function Chip({ label, stores, tone }: { label: string; stores: string; tone: "on" | "off" }) {
  return (
    <span className={cn(CHIP, tone === "on" ? "bg-acc-soft text-acc" : "bg-surface-2 text-dim")}>
      <span className={tone === "on" ? "font-bold" : undefined}>{label}</span>
      <span className={tone === "on" ? "text-ink-2" : undefined}>{stores}</span>
    </span>
  );
}

export function KoreanSupportBadges({ platforms }: Props) {
  const home = platforms.filter((p) => p.region === HOME_REGION);
  const voice = home.filter((p) => p.koVoice === true);
  const text = home.filter((p) => p.koText === true);
  const none = home.filter((p) => p.koText === false);
  if (voice.length === 0 && text.length === 0 && none.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="한국어">
      {voice.length > 0 && (
        <li>
          <Chip label={KOREAN_SUPPORT_LABEL.voice} stores={labelsOf(voice)} tone="on" />
        </li>
      )}
      {text.length > 0 && (
        <li>
          <Chip label={KOREAN_SUPPORT_LABEL.text} stores={labelsOf(text)} tone="on" />
        </li>
      )}
      {none.length > 0 && (
        <li>
          <Chip label={KOREAN_SUPPORT_LABEL.none} stores={labelsOf(none)} tone="off" />
        </li>
      )}
    </ul>
  );
}
