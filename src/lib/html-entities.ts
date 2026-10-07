// HTML 엔티티 풀기 — 외부 피드가 준 글자를 화면에 그대로 세울 때 쓴다.
//
// 왜 필요한가(2026-10-02 실측): 게임메카 RSS 는 제목을 **두 번** 인코딩해 보낸다(`&amp;#039;`).
// XML 파서가 한 겹을 벗기면 `&#039;` 가 남고, 그게 그대로 저장돼 홈에 `&#039;셀린&#039;` 으로 떴다.
// 다른 11개 매체는 0건이라 파서 설정이 아니라 이 매체의 버릇이다.
//
// 화면에서 dangerouslySetInnerHTML 로 푸는 길은 막는다 — 제목에 태그가 섞여 오면 그대로 실행된다.
// 여기서는 글자 치환만 한다. 모르는 이름 엔티티는 손대지 않고 둔다(지우면 원문에 있던 낱말이 사라진다).

const NAMED: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  // 한국닌텐도 뉴스 본문(2026-10-07): "Pok&eacute;mon", 판매처 나열 "G마켓&middot;옥션"
  eacute: "é",
  middot: "·",
};

/**
 * 몇 겹까지 벗기나. 두 겹(`&amp;#039;`)이 실측 최대다. 끝없이 돌리면 원문이 정말로
 * `&amp;` 라는 글자를 말하려던 경우까지 먹으므로 상한을 둔다
 */
const MAX_PASSES = 3;

const ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z]+);/gi;

function decodeOnce(s: string): string {
  return s.replace(ENTITY, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      // 제어 문자, 범위 밖 값은 글자로 만들지 않는다 — 원문 그대로 둔다
      return Number.isFinite(code) && code >= 0x20 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

/** 엔티티를 글자로 바꾼다. 겹쳐 인코딩된 것도 상한까지 벗긴다 */
export function decodeHtmlEntities(s: string): string {
  let out = s;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}
