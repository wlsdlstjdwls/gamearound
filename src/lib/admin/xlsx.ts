// 관리자 툴바 "엑셀"(components/admin/screen/head)이 내려받는 xlsx 를 만든다(2026-10-30 사용자 "엑셀 다운로드 투박, 공통화해서 이쁘게, 너무 화려하지 않게").
//
// 앞 판은 CSV 였다 — 열면 칸 너비, 머리 구분, 숫자 서식이 없어 손으로 다듬어야 했다. 지금 모양:
//   1줄 화면 이름(굵게), 2줄 내려받은 때와 건수(회색), 4줄 머리(옅은 회색 면, 굵게, 가운데), 그 아래 줄들(가는 회색 테두리).
//   머리 줄에 틀 고정(필터는 걸지 않는다, 2026-10-30 사용자), 칸 너비는 글자 길이로(한글은 두 칸), 숫자 칸은 천 단위 쉼표(소수는 둘째 자리).
// 색은 관리자 화면 토큰과 같은 결의 회색 둘만 쓴다(머리 면은 한 단 진하게, 2026-10-30 사용자) — 줄무늬, 색 머리 같은 꾸밈은 넣지 않았다.
// 시트 눈금선은 켜 둔다 — 껐더니 표 밖 칸 구분이 사라져 엑셀로 안 보였다(2026-10-30 사용자).
// 맨 앞 No 칸은 그리드와 같게 1부터 센다(withRowNumbers).
//
// 라이브러리 대신 xlsx(Office Open XML)를 직접 적는다. 묶기(zip)만 fflate 를 쓴다 — 엑셀 라이브러리는 내려받기 한 번에 쓰기엔 수백 KB 다.
// 글은 모두 inlineStr 로 넣는다: 수식으로 읽히지 않아 사용자가 올린 제목이 = 로 시작해도 실행되지 않는다(CSV 때 따로 막던 일).
import { strToU8, zipSync } from "fflate";

export type XlsxCell = string | number | null;

export type XlsxSheet = {
  title: string;
  /** 제목 아래 회색 한 줄(내려받은 때, 건수) */
  meta: string;
  head: string[];
  rows: XlsxCell[][];
};

/** 칸 너비 한계(글자 단위). 긴 글 한 칸이 화면을 다 먹지 않게 자르고, 짧은 칸도 머리 글자는 보이게 둔다 */
const COL_MIN = 6;
const COL_MAX = 60;
/** 머리 줄 위치(1부터). 1 제목, 2 덧말, 3 빈 줄 */
const HEAD_ROW = 4;

/** XML 글자 이스케이프. XML 1.0 에 못 넣는 제어 문자는 뺀다(붙여 넣은 글에 섞여 오면 파일이 안 열린다) */
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
function esc(s: string): string {
  return s.replace(XML_INVALID, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 0 -> A, 25 -> Z, 26 -> AA */
export function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** 보이는 너비(글자 단위). 한글, 한자, 전각은 두 칸 */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(ch) ? 2 : 1;
  return w;
}

export function columnWidths(head: string[], rows: XlsxCell[][]): number[] {
  return head.map((h, c) => {
    const longest = Math.max(displayWidth(h), ...rows.map((r) => displayWidth(cellText(r[c]))));
    return Math.min(COL_MAX, Math.max(COL_MIN, longest + 2));
  });
}

function cellText(v: XlsxCell): string {
  return v === null ? "" : typeof v === "number" ? v.toLocaleString("ko-KR") : v;
}

// 서식 번호(styles.xml 의 cellXfs 순서): 1 제목, 2 덧말, 3 머리, 4 글 칸, 5 정수 칸, 6 소수 칸
const S_TITLE = 1;
const S_META = 2;
const S_HEAD = 3;
const S_TEXT = 4;
const S_INT = 5;
const S_DEC = 6;

function cell(ref: string, v: XlsxCell, textStyle: number): string {
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${Number.isInteger(v) ? S_INT : S_DEC}"><v>${v}</v></c>`;
  const t = v === null ? "" : String(v);
  return `<c r="${ref}" s="${textStyle}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
}

export function sheetXml(sheet: XlsxSheet): string {
  const cols = columnWidths(sheet.head, sheet.rows);
  const rows = [
    `<row r="1" ht="24" customHeight="1">${cell("A1", sheet.title, S_TITLE)}</row>`,
    `<row r="2">${cell("A2", sheet.meta, S_META)}</row>`,
    `<row r="${HEAD_ROW}" ht="22" customHeight="1">${sheet.head.map((h, c) => cell(`${colName(c)}${HEAD_ROW}`, h, S_HEAD)).join("")}</row>`,
    ...sheet.rows.map((r, i) => {
      const n = HEAD_ROW + 1 + i;
      return `<row r="${n}" ht="18" customHeight="1">${sheet.head.map((_, c) => cell(`${colName(c)}${n}`, r[c] ?? null, S_TEXT)).join("")}</row>`;
    }),
  ];
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${HEAD_ROW}" topLeftCell="A${HEAD_ROW + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    `<cols>${cols.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows.join("")}</sheetData>` +
    `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

const FONT = `<name val="맑은 고딕"/><family val="3"/><charset val="129"/>`;
const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="4">` +
  `<font><sz val="10"/><color rgb="FF1F2430"/>${FONT}</font>` +
  `<font><b/><sz val="14"/><color rgb="FF1F2430"/>${FONT}</font>` +
  `<font><sz val="9"/><color rgb="FF7A8394"/>${FONT}</font>` +
  `<font><b/><sz val="10"/><color rgb="FF2B3240"/>${FONT}</font>` +
  `</fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFDDE3EC"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left style="thin"><color rgb="FFC5CBD6"/></left><right style="thin"><color rgb="FFC5CBD6"/></right><top style="thin"><color rgb="FFC5CBD6"/></top><bottom style="thin"><color rgb="FFC5CBD6"/></bottom><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="7">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** 시트 이름 — 엑셀은 31자, 일부 글자([]:*?/\)를 막는다 */
function sheetName(s: string): string {
  return s.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "Sheet1";
}

export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${esc(sheetName(sheet.title))}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(STYLES),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(sheet)),
  };
  return zipSync(files);
}

/** 그리드처럼 맨 앞에 No 칸(1부터)을 붙인다 */
export function withRowNumbers(head: string[], rows: XlsxCell[][], label: string): { head: string[]; rows: XlsxCell[][] } {
  return { head: [label, ...head], rows: rows.map((r, i) => [i + 1, ...r]) };
}

/** 한국 날짜(20261030) */
function kstDay(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * 내려받을 파일 이름 — 프로그램명_코드_명_날짜.xlsx(2026-10-30 사용자). 코드와 명은 그리드에서 고른 줄의 것이고, 없으면 뺀다.
 * 파일 이름에 못 쓰는 글자와 빈칸은 걷는다
 */
export function xlsxFileName(parts: { program: string; code?: string | null; name?: string | null }, now: Date): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|\s]/g, "");
  return `${[parts.program, parts.code, parts.name].filter((s): s is string => !!s && !!clean(s)).map(clean).concat(kstDay(now)).join("_")}.xlsx`;
}
