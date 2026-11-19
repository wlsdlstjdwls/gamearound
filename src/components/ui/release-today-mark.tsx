"use client";

// 출시 당일 표지 — 목록 카드, 목록형 카드가 같은 모양을 쓴다(2026-11-19 사용자).
//
// "오늘" 은 **보는 사람의 브라우저에서** 정한다. 목록, 홈은 캐시된 화면이라 서버에서 판정하면
// 자정을 넘긴 뒤에도 어제 출시한 게임에 표지가 남는다(캐시가 갈릴 때까지). 서버 스냅숏은 null 이라
// 서버 HTML 에는 표지가 없고, 하이드레이션 뒤에 선다 — 날짜가 다른 두 그림이 부딪치지 않는다.
// 날짜 판정은 한국 날짜(kstDateKey)다. 출시일 열쇠도 한국 날짜라 해외에서 봐도 같은 날에 선다.
// 모양은 역대 최저가와 같은 면 없는 작은 파란 글자다(2026-11-19 사용자 "역대최저가 처럼"). 처음엔 사전예약처럼 알약이었다.
import { useSyncExternalStore } from "react";
import { kstDateKey } from "@/lib/format";
import { RELEASE_TODAY_LABEL } from "@/lib/games/messages";
import { cn } from "@/lib/cn";
import { CARD_TEXT_MARK } from "@/components/ui/text-mark";

/** 날이 바뀌는 순간을 듣지 않는다 — 화면을 연 채 자정을 넘기는 일은 드물고, 다음 이동 때 다시 셈한다 */
const subscribe = () => () => {};
const todayKey = () => kstDateKey(new Date());
const serverKey = () => null;

/** 출시일(YYYY-MM-DD 로 시작하는 값)이 오늘이면 표지를 세운다 */
export function ReleaseTodayMark({ releaseDate, className }: { releaseDate: string | null | undefined; className?: string }) {
  const today = useSyncExternalStore(subscribe, todayKey, serverKey);
  if (!releaseDate || !today || releaseDate.slice(0, 10) !== today) return null;
  return <span className={cn(CARD_TEXT_MARK, className)}>{RELEASE_TODAY_LABEL}</span>;
}
