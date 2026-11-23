// PC 구동 사실 한 줄 — 네이티브 OS. 기기 등록과 무관하게 바로 뜨는 값이다(사양 설계 §0, §5).
//
// 왜 플랫폼 행을 받아 접는가: 두 값 다 스토어의 성질이라 game_platforms 에 붙어 있다.
// 콘솔 전용 게임도 줄은 선다(값은 "-") — 게임마다 줄 수가 달라지지 않게(2026-11-23 사용자 "값이 없어도 항상 노출").
//
// **등급에 따라 칩의 무게를 가른다**(2026-09-21): 전에는 셋이 같은 회색 칩이라
// "스팀덱 검증됨" 과 "스팀덱 미지원" 이 화면에서 똑같이 생겼다. 덱을 가진 사람이 이 화면에서
// 찾는 것은 등급 문자열이 아니라 "사도 되나" 한 글자다. 되는 쪽만 브랜드 면과 기기 그림을 주고,
// 안 되는 쪽은 사실만 남기고 물러난다 — 미지원을 빨강으로 칠하지 않는 이유는 그게 결함이 아니라
// 그냥 기기가 다르다는 뜻이어서다.
import { FactEmpty, FactRow } from "@/components/ui/fact-row";
import { FACT_ROW_LABEL, OS_FAMILY_LABEL } from "@/lib/games/messages";
import type { PlatformDto } from "@/server/services/games";

type Props = { platforms: Pick<PlatformDto, "nativeWindows" | "nativeMac" | "nativeLinux">[] };

/**
 * 운영체제 줄 — 네이티브로 도는 OS(윈도우, 맥, 리눅스). 값은 늘 서고 모르면 "-"(ui/fact-row).
 * 스팀덱 등급은 PC 가격 카드의 "지원" 줄로 옮겼다(2026-11-23 사용자, platform-prices/tile 의 withDeck)
 */
export function PcSupportBadges({ platforms }: Props) {
  // 한 스토어라도 있다고 하면 있는 것(lib/hardware/native 와 같은 규칙)
  const os = [
    platforms.some((p) => p.nativeWindows === true) ? OS_FAMILY_LABEL.windows : null,
    platforms.some((p) => p.nativeMac === true) ? OS_FAMILY_LABEL.mac : null,
    platforms.some((p) => p.nativeLinux === true) ? OS_FAMILY_LABEL.linux : null,
  ].filter((v) => v !== null);
  return <FactRow label={FACT_ROW_LABEL.os}>{os.length > 0 ? <span className="font-semibold">{os.join(", ")}</span> : <FactEmpty />}</FactRow>;
}
