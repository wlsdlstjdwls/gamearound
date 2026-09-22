// 나라 국기 한 장. ISO 3166-1 alpha-2 코드를 받아 인라인 SVG 로 그린다.
//
// **왜 이모지(🇰🇷)가 아닌가**: 윈도우는 지역 표시 문자를 국기로 그리지 않는다 — Segoe UI Emoji 에
// 국기 글리프가 아예 없어서 "KR" 두 글자 상자가 뜬다. 우리 화면을 보는 사람 다수가 윈도우 크롬이라
// 그 자리는 깨진 칸으로 읽힌다. 맥과 안드로이드에서만 맞는 표시를 기본으로 둘 수 없다.
//
// 아이콘 패키지를 들이지 않는다는 ui/icons 의 원칙에서 여기만 예외인 이유: 국기는 33개 나라가
// 실제로 쓰이고(수집된 회사 기준), 그 도형들을 손으로 그리면 옳은지 검증할 방법이 없다.
// 서버 컴포넌트에서만 쓰므로 브라우저로 내려가는 것은 실제로 그린 국기 한 장뿐이다.
import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/cn";

/** 글자 옆에 서는 크기. 본문 13.5px 옆에서 대문자 높이와 눈높이가 맞는 값이다 */
const SIZE = "h-[11px] w-[16px]";

export function Flag({ code, className }: { code: string; className?: string }) {
  const Svg = (Flags as Record<string, ((p: { className?: string }) => React.JSX.Element) | undefined>)[code.toUpperCase()];
  // 모르는 코드는 조용히 비운다 — 빈 네모를 세우면 "국기를 못 불러왔다" 로 읽히는데,
  // 나라 이름은 어차피 바로 옆에 글자로 서 있어서 잃는 정보가 없다
  if (!Svg) return null;
  // 테두리를 한 겹 덧대는 이유: 흰 바탕 국기(일본, 폴란드)가 흰 배경에서 윤곽을 잃는다
  return <Svg className={cn(SIZE, "shrink-0 rounded-[2px] ring-1 ring-inset ring-line", className)} />;
}
