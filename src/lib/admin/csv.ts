// CSV 만들기 — 매장 판매목록 양식(shops/listing-csv-form)이 쓴다. 관리자 툴바 엑셀은 2026-10-30 xlsx 로 옮겼다(lib/admin/xlsx).
//
// 한글이 깨지지 않게 맨 앞에 BOM 을 붙인다 —
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
