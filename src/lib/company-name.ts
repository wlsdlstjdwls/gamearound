// 회사명 정규화 — 같은 회사가 스토어마다 다른 문자열로 오는 문제를 흡수한다.
// 실측(2026-09-14): 엘든 링에서 steam 은 "FromSoftware, Inc.", 스타워즈 아웃로에서 xbox 는 "MASSIVE ENTERTAINMENT",
// "UBISOFT" 처럼 전부 대문자로 준다. 정규화하지 않으면 회사 하나가 서너 개로 쪼개진다.
// 순수 함수만 둔다 — DB, 네트워크를 모른다.

/**
 * 법인 형태 접미어. 회사의 정체성이 아니라 등기 형태라서 떼어낸다.
 * 떼어낸 뒤에도 이름이 남는 경우에만 적용한다 — "Inc" 만 있는 회사명을 빈 문자열로 만들지 않기 위해.
 */
const LEGAL_SUFFIXES = [
  "incorporated", "inc", "corporation", "corp", "company", "co ltd", "co", "limited", "ltd",
  "llc", "lld", "plc", "gmbh", "ag", "sa", "sas", "sarl", "srl", "spa", "bv", "nv", "ab", "as", "oy",
  "kk", "kabushiki kaisha", "pty", "pte", "sdn bhd", "aps", "aps as", "ou", "doo",
  "주식회사", "유한회사", "사단법인",
];

/** 공백 없이 이름에 바로 붙는 접두 법인 표기(한국어, 일본어는 띄어쓰기가 없을 수 있다) */
const GLUED_PREFIXES = ["주식회사", "유한회사", "株式会社", "有限会社"];
/** 반드시 공백으로 끊기는 접두어. "The Behemoth" 의 The 는 떼고 "Theme Park" 의 The 는 건드리면 안 된다 */
const SPACED_PREFIXES = ["the"];

/**
 * 스토어가 한 칸에 여러 회사를 몰아넣는 구분자.
 * 닌텐도 장르 파서와 달리 여기서는 가운뎃점을 쓰지 않으므로 후보에 넣지 않는다.
 */
const HARD_SEPARATORS = /\s*(?:\/|,|;|\|)\s*/g;
/**
 * `&`, `and` 는 구분자이기도 하고 이름의 일부이기도 하다.
 * 2026-10-06 실측: "Magnin & Associates"(게임 43), "Image & Form Games", "Mountain and Sea Studio",
 * "Two and a Half Studios" 가 쪼개져 "Magnin", "Associates" 같은 없는 회사가 검수 큐 상위를 먹었다.
 * 진짜 두 회사("Infinity Ward and Sledgehammer Games")는 양쪽이 다 두 낱말 이상이라, 그때만 쪼갠다.
 * 한 낱말 회사끼리의 조합("Maxis & Blind Squirrel")은 통째로 남는다 — 없는 회사를 만드는 쪽보다 덜 해롭다.
 */
const SOFT_SEPARATORS = /\s*(?:&|\band\b)\s*/gi;

/**
 * 스토어가 HTML 엔티티를 풀지 않고 준다(실측: "CRAFTS &amp; MEISTER Co., Ltd.", "Petr &quot;Glubo&quot; Sykora").
 * 안 풀면 "amp" 라는 회사 조각이 생긴다.
 */
const NAMED_ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] !== "#") return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function stripMarks(input: string): string {
  return decodeEntities(input).replace(/[™®©]/g, "");
}

/**
 * 표시용 정리 — 원문의 대소문자는 살리되 군더더기만 턴다.
 * xbox 처럼 전부 대문자로 주는 소스는 그대로 두면 화면이 소리치므로 호출부에서 골라 쓴다.
 */
export function cleanCompanyName(raw: string): string {
  return stripMarks(raw).replace(/\s+/g, " ").trim();
}

/**
 * 매칭 키. 소문자 + 법인 접미어, 구두점 제거.
 * 이 값이 company_aliases.alias_norm 에 들어가고 unique 제약이 걸린다.
 * 빈 문자열이 나오면 매칭하지 않는다 — 호출부가 빈 값을 걸러야 한다.
 */
export function normalizeCompanyName(raw: string): string {
  let t = stripMarks(raw)
    .normalize("NFKC")
    .toLowerCase()
    // 마침표와 아포스트로피는 공백이 아니라 삭제한다 — "S.A." 가 "s a" 로 흩어지면 접미어 목록이 못 잡는다
    .replace(/[.'’]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";

  for (const prefix of GLUED_PREFIXES) {
    if (t.startsWith(prefix)) {
      const rest = t.slice(prefix.length).trim();
      if (rest) {
        t = rest;
        break;
      }
    }
  }
  for (const prefix of SPACED_PREFIXES) {
    if (t.startsWith(prefix + " ")) {
      const rest = t.slice(prefix.length + 1).trim();
      if (rest) t = rest;
      break;
    }
  }
  // 접미어는 여러 개가 겹칠 수 있다("Bandai Namco Studios Inc Ltd" 같은 표기 흔들림)
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (t.endsWith(" " + suffix)) {
        const rest = t.slice(0, -(suffix.length + 1)).trim();
        if (rest) {
          t = rest;
          changed = true;
          break;
        }
      }
    }
  }
  return t.replace(/\s+/g, " ").trim();
}

/**
 * 한 칸에 몰아넣은 회사명을 쪼갠다. steam 의 publishers 는 배열로 오지만
 * nintendo, xbox 는 문자열 하나에 "A / B" 로 넣어 준다.
 * 쪼갠 조각이 1글자면 원문이 이름의 일부였을 가능성이 커서 통째로 되돌린다.
 */
export function splitCompanyNames(raw: string): string[] {
  const cleaned = cleanCompanyName(raw);
  if (!cleaned) return [];
  const parts = cleaned.split(HARD_SEPARATORS).flatMap(splitSoft).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [cleaned];
  if (parts.some((p) => p.length < 2)) return [cleaned];
  // "FromSoftware, Inc." 의 쉼표는 회사 구분자가 아니라 법인 형태 앞의 구두점이다(steam 실측).
  // 조각 하나가 법인 접미어뿐이면 쪼갠 것이 틀렸다는 뜻이라 통째로 되돌린다.
  if (parts.some(isLegalSuffixOnly)) return [cleaned];
  // 표기만 다른 같은 회사("Ubisoft / UBISOFT")는 하나로 접는다
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = normalizeCompanyName(p) || p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** `&`, `and` 는 양쪽 조각이 모두 두 낱말 이상일 때만 구분자로 본다(SOFT_SEPARATORS 참고) */
function splitSoft(piece: string): string[] {
  const parts = piece.split(SOFT_SEPARATORS).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [piece];
  return parts.every((p) => p.split(/\s+/).length >= 2) ? parts : [piece];
}

/**
 * 쪼개기를 되돌리는 판정에만 쓰는 법인 표기. "GmbH & Co. KG" 의 "Co. KG" 조각을 잡는다.
 * LEGAL_SUFFIXES 에 넣지 않는 이유: 정규화 키가 바뀌면 이미 쌓인 company_aliases 가 안 맞는다.
 */
const LEGAL_SUFFIX_SET = new Set([...LEGAL_SUFFIXES, "co kg", "kg"]);

/** 이 조각이 법인 형태 표기뿐인가 ("Inc.", "Co., Ltd") */
function isLegalSuffixOnly(part: string): boolean {
  const t = stripMarks(part)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 0 && LEGAL_SUFFIX_SET.has(t);
}
