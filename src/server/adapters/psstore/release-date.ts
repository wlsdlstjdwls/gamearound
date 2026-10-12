// PlayStation 콘셉트의 출시일 한 칸을 우리 date 값으로 바꾼다.
//
// 응답 모양: releaseDate = { type, value }. value 는 UTC 시각이고 type 이 그 값의 정확도다(2026-10-12 실측, 표본 24건).
//   DAY_MONTH_YEAR — 날짜까지 확정. 대부분이 이것이다.
//   MONTH_YEAR     — 달까지만. value 는 그 달 말일이다(2023-08-31).
//   YEAR           — 해까지만. value 는 그해 12-31 이다. 붉은사막(10002363)은 3월에 나온 게임인데 이 값 때문에
//                    12월 출시예정에 떴다. 날짜가 아니라 "언젠가" 라서 버린다.
// 달 정확도는 남긴다 — 출시예정 화면이 달로 묶어서 그 달 칸에는 맞게 선다.
import { DISPLAY_TIME_ZONE } from "@/lib/format";

/** 날짜로 받아 줄 정확도. 목록에 없는 type 이 새로 오면 날짜로 믿지 않는다 */
const PSSTORE_DATED_RELEASE_TYPES: ReadonlySet<string> = new Set(["DAY_MONTH_YEAR", "MONTH_YEAR"]);

// en-CA 는 "YYYY-MM-DD" 로 찍는다 — date 컬럼 글자 모양 그대로다
const KST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * value 는 앞 10글자를 자르면 안 된다. 한국 스토어는 한국 자정을 UTC 로 적어 "2022-07-27T15:00:00Z" 로 주는데
 * 잘라 쓰면 하루 이른 07-27 이 된다. 한국 시간으로 옮긴 날짜를 쓴다.
 */
export function psstoreReleaseDate(raw: { type?: string | null; value?: string | null } | null | undefined): string | null {
  if (!raw?.value || !raw.type || !PSSTORE_DATED_RELEASE_TYPES.has(raw.type)) return null;
  const at = new Date(raw.value);
  return Number.isNaN(at.getTime()) ? null : KST_DATE.format(at);
}
