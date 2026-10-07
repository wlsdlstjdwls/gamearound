// Next App Router 가 HTML 에 실어 보내는 RSC 데이터(self.__next_f.push)를 꺼내는 순수 함수들.
//
// 한국닌텐도 뉴스는 목록도 본문도 별도 API 가 없어 이 데이터가 유일한 정형 출처다(constants 머리 주석).
// 형식이 Next 내부 구현이라 그쪽 배포 하나로 바뀔 수 있다 — 깨지면 파서가 빈 결과를 내고,
// 수집은 그 글을 review 로 남겨 관리자 화면에 사유가 뜬다(sync/preorder-bonuses).

const PUSH = /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;

/** HTML 안의 push 조각을 순서대로 이어 붙인 RSC 텍스트 */
export function extractFlight(html: string): string {
  const parts: string[] = [];
  for (const m of html.matchAll(PUSH)) {
    try {
      const arr = JSON.parse(m[1]) as unknown[];
      if (typeof arr[1] === "string") parts.push(arr[1]);
    } catch {
      // 조각 하나가 깨져도 나머지로 읽는다 — 본문 대부분은 다른 조각에 있다
    }
  }
  return parts.join("");
}

/**
 * `"$1b"` 같은 참조를 실제 문자열로. 긴 본문은 값 자리에 참조만 두고 `1b:T<16진 길이>,<본문>` 줄에 따로 싣는다.
 * 길이는 **UTF-8 바이트 수**라 글자 수로 자르면 한글 본문이 세 배로 넘친다.
 * 참조가 아니면 그대로 돌려주고, 찾지 못하면 빈 문자열이다.
 */
export function resolveRef(flight: string, value: string): string {
  const ref = /^\$([0-9a-f]+)$/.exec(value);
  if (!ref) return value;
  const head = new RegExp(`(?:^|[^0-9a-z])${ref[1]}:T([0-9a-f]+),`).exec(flight);
  if (!head) return "";
  const start = head.index + head[0].length;
  const bytes = Buffer.from(flight.slice(start), "utf8").subarray(0, parseInt(head[1], 16));
  return bytes.toString("utf8");
}

/**
 * `key` 뒤에 오는 JSON 값 하나를 읽는다. RSC 텍스트는 JSON 조각이 이어진 줄들이라 통째로 JSON.parse 할 수 없다 —
 * 값의 시작에서 괄호 짝을 세어 끝을 찾는다(문자열 안의 괄호는 세지 않는다).
 */
export function readJsonAfter(flight: string, key: string): unknown {
  const at = flight.indexOf(key);
  if (at < 0) return null;
  const start = at + key.length;
  const open = flight[start];
  if (open !== "{" && open !== "[") return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < flight.length; i++) {
    const c = flight[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(flight.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
