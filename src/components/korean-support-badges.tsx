// 한국어 칩 — 한국어 지원(화면, 자막), 한국어 미지원.
// 한국어 음성 칩은 걷었다(2026-11-16 사용자 "한국어 음성 뱃지는 제거"). 값(ko_voice)은 그대로 모은다.
//
// 칩마다 스토어 이름을 붙이는 이유: 같은 게임이라도 판마다 다르다. PC 판은 한국어인데 스위치 판은 아닌 게임이 흔하고
// (schema 의 ko_text 주석), "한국어 지원" 만 크게 띄우면 그 말을 믿고 스위치 판을 산 사람이 속는다.
//
// 미지원도 그린다. 멀티플레이 칩은 아는 것만 그리지만(multiplayer-badges 주석) 여기는 사정이 다르다 —
// 여기 false 는 "스토어가 안 알려 줌" 이 아니라 스토어가 언어 목록을 주면서 한국어를 빼놓은 것이다.
// 모르는 판(null)은 어느 칩에도 넣지 않는다.
//
// 일본 스토어 행은 보지 않는다. 한국 계정으로 사는 판이 아니고, 그 판의 언어는 한국판과 다를 수 있다.
import { FactEmpty, FactRow } from "@/components/ui/fact-row";
import { FACT_ROW_LABEL } from "@/lib/games/messages";
import { platformLabel } from "@/lib/format";
import { HOME_REGION } from "@/server/db/schema";
import type { PlatformDto } from "@/server/services/games";

type Props = { platforms: Pick<PlatformDto, "platform" | "region" | "koText" | "koVoice">[] };

/** 줄 이름표가 "한국어" 라 값은 지원 여부만 말한다 */
const KO_VALUE = { on: "지원", off: "미지원" } as const;

/** 같은 스토어 이름이 둘 이상의 행(PS4, PS5 처럼 기기만 다른 행)에서 겹쳐 나오지 않게 접는다 */
function labelsOf(rows: Props["platforms"]): string {
  return [...new Set(rows.map((p) => platformLabel(p)))].join(", ");
}

/**
 * 한국어 줄 — 지원은 굵은 진한 글자 뒤 스토어 이름, 미지원은 옅은 글자(ui/fact-row 머리 주석).
 * 앞의 체크 표시는 걷었다(2026-11-23 사용자 "체크 표기가 어색") — 이름표 줄 꼴에서는 글자 "지원" 이 이미 답이고, 옆 PC 줄에는 체크가 없다.
 * 스토어 이름은 회색으로 물러선다 — 이 줄의 답은 "지원" 이고 어디서인지는 덧말이다
 */
export function KoreanSupportBadges({ platforms }: Props) {
  const home = platforms.filter((p) => p.region === HOME_REGION);
  const text = home.filter((p) => p.koText === true);
  const none = home.filter((p) => p.koText === false);
  return (
    <FactRow label={FACT_ROW_LABEL.korean}>
      {text.length === 0 && none.length === 0 && <FactEmpty />}
      {text.length > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <b className="font-bold text-ink">{KO_VALUE.on}</b>
          {/* 스토어 이름은 괄호로 묶는다(2026-11-23 사용자) — "지원 Steam, PS5" 로 붙여 두면 스토어 이름까지 값으로 읽혔다 */}
          <span className="text-mut">({labelsOf(text)})</span>
        </span>
      )}
      {none.length > 0 && (
        <span className="inline-flex items-center gap-1 text-dim">
          {KO_VALUE.off} ({labelsOf(none)})
        </span>
      )}
    </FactRow>
  );
}
