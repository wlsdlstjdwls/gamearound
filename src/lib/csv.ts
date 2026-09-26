// CSV 한 덩어리를 칸의 2차원 배열로 푼다 — RFC 4180 의 따옴표 규칙까지. 순수 함수라 테스트로 고정한다.
//
// 라이브러리를 들이지 않은 이유: 매장 재고 파일 하나를 읽는 자리뿐이고, 따옴표 안 쉼표, 줄바꿈, "" 이스케이프,
// 엑셀의 BOM 넷만 맞으면 된다. 의존성 하나를 늘리는 값보다 이 60줄이 싸다.

/** 엑셀이 UTF-8 CSV 앞에 붙이는 표식. 첫 머리글 이름에 붙어 "상품명" 을 못 찾게 만든다 */
const BOM = "\uFEFF";

export function parseCsv(text: string): string[][] {
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        // 따옴표 안의 "" 는 따옴표 한 글자다
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // \r\n 을 한 줄바꿈으로 센다
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // 마지막 줄에 줄바꿈이 없어도 그 줄을 버리지 않는다
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // 칸이 전부 빈 줄(엑셀이 끝에 남기는 ",,,,") 은 줄이 아니다
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** 칸 하나를 CSV 에 적을 꼴로. 쉼표, 따옴표, 줄바꿈이 들었을 때만 감싼다 */
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** 줄들을 CSV 한 덩어리로. 엑셀이 한글을 깨지 않게 BOM 을 붙인다 */
export function toCsv(rows: string[][]): string {
  return BOM + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
