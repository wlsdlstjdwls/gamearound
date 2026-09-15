// GOG 변경 기록(HTML) → PatchNote[]. 패치 기록 수집의 GOG 쪽 파서다.
//
// 왜 제목만 읽나: GOG 는 패치를 글 단위로 주지 않는다. products?expand=changelog 가 돌려주는 것은
// 변경 기록 전체가 붙은 HTML 한 덩어리다. 그 안에서 우리가 남길 수 있는 것은 "언제 고쳤나" 뿐이고,
// 그 정보는 제목 줄(h1~h6)에 들어 있다("Patch 2.31 Sep 11th 2025"). 본문은 담지 않는다(§10 저작권).
//
// 날짜가 없는 제목은 버린다. 그것들은 패치가 아니라 패치 안의 소제목이다
// (2026-09-15 실측: 사이버펑크 2077 의 "Vehicles", "Photo Mode", 위쳐 3 의 "Online Features").
import { load } from "cheerio";
import type { PatchNote } from "../types";
import { patchVersionFromTitle } from "@/lib/patch-version";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "2023-03-13" */
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
// 서수 꼬리(st/nd/rd/th)가 대문자로도 온다("MARCH 13TH, 2023") — 두 정규식 모두 대소문자를 가리지 않는다
/** "Sep 11th 2025", "MARCH 13TH, 2023", "August 3rd 2023" */
const MONTH_FIRST = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i;
/** "13 November 2024", "7 December 2021" */
const DAY_FIRST = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/i;

/** 제목이 길어도 표에는 한 줄만 들어간다 — 그보다 긴 꼬리는 잘라 저장 자체를 줄인다 */
const TITLE_MAX = 200;

function monthOf(word: string): number | null {
  return MONTHS[word.slice(0, 3).toLowerCase()] ?? null;
}

/** 유효한 날짜면 UTC 자정 Date. GOG 는 시각을 주지 않으므로 날짜까지만 믿는다 */
function utcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // 2월 31일 같은 값은 Date 가 조용히 넘겨 버린다 — 넘어갔으면 날짜가 아니었던 것이다
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/** 제목 줄에서 날짜를 읽는다. 세 형식 모두 실제 GOG 변경 기록에서 관측한 것이다 */
export function changelogDate(title: string): Date | null {
  const iso = title.match(ISO_DATE);
  if (iso) return utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const mf = title.match(MONTH_FIRST);
  if (mf) {
    const month = monthOf(mf[1]);
    if (month) return utcDate(Number(mf[3]), month, Number(mf[2]));
  }

  const df = title.match(DAY_FIRST);
  if (df) {
    const month = monthOf(df[2]);
    if (month) return utcDate(Number(df[3]), month, Number(df[1]));
  }
  return null;
}

/**
 * 변경 기록 HTML → 패치 기록. 날짜가 든 제목만 남기고 최신순으로 돌려준다.
 *
 * 글 단위 id 가 없어 외부 ID 는 "날짜(+버전)" 으로 만든다. 같은 날 두 번 고친 기록은 버전으로 갈리고,
 * 버전까지 같으면 같은 패치로 본다 — 한 패치를 여러 제목으로 쪼개 적은 경우라 행을 늘릴 이유가 없다.
 */
export function parseGogChangelog(html: string | null | undefined): PatchNote[] {
  if (!html) return [];
  const $ = load(html);
  const out: PatchNote[] = [];
  const seen = new Set<string>();

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;
    const date = changelogDate(title);
    if (!date) return;
    const version = patchVersionFromTitle(title);
    const externalId = version ? `${date.toISOString().slice(0, 10)}#${version}` : date.toISOString().slice(0, 10);
    if (seen.has(externalId)) return;
    seen.add(externalId);
    out.push({
      externalId,
      title: title.slice(0, TITLE_MAX),
      version,
      // 글 단위 주소가 없다. 화면은 이 행을 링크 없이 보여 준다
      url: null,
      publishedAt: date.toISOString(),
    });
  });

  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
