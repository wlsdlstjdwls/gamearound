// 관리자 화면 툴바의 "엑셀"(components/admin/screen) 이 내려받는 CSV 를 만든다.
//
// 진짜 xlsx 가 아니라 CSV 인 이유: 백오피스의 엑셀 단추가 하는 일은 "지금 보는 목록을 표 프로그램에서 열기" 다.
// 엑셀은 CSV 를 그대로 열고, 라이브러리를 들이지 않아도 된다. 한글이 깨지지 않게 맨 앞에 BOM 을 붙인다 —
// 엑셀은 BOM 이 없는 UTF-8 CSV 를 시스템 코드 페이지(한국어 윈도우는 CP949)로 읽는다.
//
// 값에 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 안의 따옴표는 둘로 적는다(RFC 4180).
// 맨 앞이 = + - @ 인 값은 엑셀이 수식으로 실행한다 — 사용자가 올린 글 제목이 그대로 들어가는 자리라 앞에 ' 를 붙여 글자로 묶는다.

const BOM = "﻿";
const NEEDS_QUOTE = /[",\r\n]/;
const FORMULA_LEAD = /^[=+\-@]/;

export function csvCell(raw: string): string {
  const v = FORMULA_LEAD.test(raw) ? `'${raw}` : raw;
  return NEEDS_QUOTE.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 머리 줄과 몸 줄을 CSV 한 덩어리로. 줄바꿈은 엑셀이 기대하는 CRLF */
export function toCsv(head: readonly string[], rows: readonly (readonly string[])[]): string {
  return BOM + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** 내려받을 파일 이름. 화면 이름 + 한국 날짜 시각(예: 결제환불관리_20261029-2310.csv). 파일 이름에 못 쓰는 글자는 뺀다 */
export function csvFileName(screen: string, now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  const stamp = `${kst.slice(0, 10).replace(/-/g, "")}-${kst.slice(11, 16).replace(":", "")}`;
  return `${screen.replace(/[\\/:*?"<>|\s]/g, "")}_${stamp}.csv`;
}
