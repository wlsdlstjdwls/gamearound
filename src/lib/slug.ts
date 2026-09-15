// 순수 유틸: slug 생성, 제목 정규화, 유사도 (§4.2 매칭)

/**
 * 악센트 제거용 NFKD 는 한글 음절도 자모(U+1100~)로 분해한다. 그 상태에서 [^a-z0-9가-힣] 로 거르면
 * 한국어 제목이 통째로 빈 문자열이 된다 → 서로 다른 한국어 제목이 유사도 1.0 으로 auto 매칭되고,
 * slug 는 전부 "game" 으로 충돌한다. 분해된 자모를 NFC 로 도로 합친 뒤에 걸러야 한다.
 *
 * NFKD 는 전각도 반각으로 되돌린다("マリオカート８" → "8", "Ｒ－ＴＹＰＥ" → "R-TYPE").
 * 일본 스토어가 전각, 반각을 섞어 쓰므로 이 단계가 곧 일본어 제목 비교의 전제다.
 */
function stripDiacritics(input: string): string {
  return input.replace(/[™®©]/g, "").normalize("NFKD").replace(/[̀-ͯ]/g, "").normalize("NFC");
}

/**
 * 버리지 않을 글자 — 로마자, 숫자에 더해 **글자를 쓰는 언어**:
 * 한글(가-힣), 가나(ぁ-ゖ ァ-ヺ 장음 ー), 한자(一-鿿).
 *
 * 가나, 한자를 넣은 이유(2026-09-14): 일본 eShop 을 붙이면서 일본어 제목이 들어오기 시작했는데,
 * 이 글자들을 버리면 제목에서 라틴 조각만 남아 뜻을 잃는다 —
 * "ロマンシング サガ3" → "3", "ゼルダ無双 厄災の黙示録 DX" → "dx", "非凡仙途" → "game".
 * 뜻을 잃는 것보다 나쁜 건 겹치기 쉬워진다는 점이다. slug 는 주소라 나중에 못 바꾼다.
 *
 * slug 와 제목 정규화가 **같은 집합**을 쓴다. 한쪽만 살리면 주소는 뜻을 지키는데 매칭은
 * 빈 제목끼리 붙는 엇갈림이 생긴다(일본 제목이 전부 "" 로 정규화돼 서로 유사도 1.0 이던 상태).
 */
const SCRIPT_CHARS = "a-z0-9가-힣ぁ-ゖァ-ヺー一-鿿";
const SLUG_DROP = new RegExp(`[^${SCRIPT_CHARS}]+`, "g");
// 공백은 제목 정규화에서만 남긴다(낱말 경계). 템플릿 리터럴은 \s 를 s 로 삼키므로 문자열로 잇는다
const TITLE_DROP = new RegExp("[^" + SCRIPT_CHARS + "\\s]", "g");

export function slugify(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(SLUG_DROP, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "game";
}

/** slug 충돌 시 접미어 부착 */
export function slugWithSuffix(base: string, suffix: string | number): string {
  return `${base}-${suffix}`;
}

/**
 * 에디션 접미어 — 긴 것부터 둔다. "game of the year edition" 이 "edition" 보다 먼저 걸려야
 * "game of the year" 가 제목에 남지 않는다.
 */
const EDITION_SUFFIXES = [
  "game of the year edition", "goty edition", "goty", "definitive edition", "deluxe edition",
  "ultimate edition", "complete edition", "gold edition", "premium edition", "standard edition",
  "digital deluxe", "remastered", "remaster", "director's cut", "directors cut", "anniversary edition",
  "collector's edition", "collectors edition", "enhanced edition", "special edition",
];

/**
 * 일본 스토어가 붙이는 판매 단위 표시. 라틴 목록과 달리 **앞 공백을 요구하지 않는다** —
 * 일본어는 낱말을 띄우지 않아 "ポケットモンスター スカーレットダウンロード版" 처럼 붙어 온다.
 * 이걸 떼지 않으면 같은 게임의 판매 단위가 본편과 유사도 0.68 에 그쳐(2026-09-14 실측)
 * auto 도 pending 도 못 되고 새 게임으로 등록된다 — 일본 안에서 같은 게임이 두 벌 생긴다.
 *
 * 체험판은 일부러 넣지 않는다. 본편에 흡수하면 무료 데모 가격이 본편 가격을 덮는다.
 */
const JP_EDITION_SUFFIXES = [
  "ダウンロード版", "パッケージ版", "通常版", "完全版", "廉価版", "特別版", "限定版",
  "デラックス版", "豪華版", "ベスト版", "アルティメットエディション", "デラックスエディション",
  "スタンダードエディション", "コンプリートエディション", "アニバーサリーエディション",
];

/**
 * 제목 뒤에 붙는 실행 플랫폼 표시. Xbox 카탈로그는 같은 게임의 PC 판을 "(Windows)" 로 구분해
 * 별개 SKU 로 내보낸다 — 우리에게는 같은 게임이므로 매칭 전에 지운다.
 */
const PLATFORM_MARKERS = /\s*\((?:windows|pc|xbox one|xbox series x\|s|xbox series x\/s|nintendo switch|switch)\)/gi;

/**
 * 구분자 뒤에 에디션 이름이 오는 형태를 지운다:
 *   "... 4 - Vault Edition", "...: Ultimate Edition", "... – 지옥불 에디션"
 * 구분자를 경계로 삼는 이유: 정규화로 구두점을 지운 뒤에는 어디까지가 에디션 이름인지 알 수 없다.
 * 에디션 이름은 두 낱말까지만 본다 — 더 넓히면 "Halo: Combat Evolved Anniversary Edition" 이 "Halo" 로 깎인다
 * (그 형태는 아래 접미어 목록이 "anniversary edition" 만 떼어 제대로 처리한다).
 */
const EDITION_TAIL = /\s[-–—:]\s(?:\S+\s){0,2}(?:edition|에디션)\s*$/i;

/** 구분자 없이 붙는 꼬리("Vault Edition", "볼트 에디션") — 에디션 낱말과 그 앞 한 낱말까지 지운다 */
const LOOSE_EDITION_TAIL = /\s(?:\S+\s)?(?:edition|에디션)$/;

/** 꼬리를 떼되 통째로 사라지면 원본을 지킨다 — 빈 제목은 아무하고나 붙는다 */
function stripJapaneseEditions(t: string): string {
  for (let cut = true; cut; ) {
    cut = false;
    for (const suf of JP_EDITION_SUFFIXES) {
      if (!t.endsWith(suf)) continue;
      const head = t.slice(0, -suf.length).trim();
      if (!head) continue;
      t = head;
      cut = true;
      break;
    }
  }
  return t;
}

/** 소문자, 특수문자 제거, 플랫폼 표시와 에디션 접미어 제거, 공백 정리 */
export function normalizeTitle(title: string): string {
  // 구두점을 지우기 전에 에디션 꼬리부터 떼어낸다 — 구분자가 사라지면 경계를 못 찾는다
  let head = stripDiacritics(title).replace(PLATFORM_MARKERS, "");
  while (EDITION_TAIL.test(head)) head = head.replace(EDITION_TAIL, "");

  const t = stripJapaneseEditions(
    head
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(TITLE_DROP, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  for (const suf of EDITION_SUFFIXES) {
    if (t.endsWith(" " + suf)) return t.slice(0, -(suf.length + 1)).trim();
  }
  // 목록에 없는 에디션 이름(볼트, 지옥불, Infernal...)까지 걷어낸다.
  // 낱말 하나만 지우는 이유: 더 지우면 "Halo: The Master Chief Collection" 같은 정상 제목을 깎아낸다.
  // 남는 것이 한 낱말뿐이면 지우지 않는다 — 흔한 낱말 하나는 엉뚱한 게임과 붙는다("Vault Edition" → "vault")
  const loose = t.replace(LOOSE_EDITION_TAIL, "").trim();
  return loose.includes(" ") ? loose : t;
}

/**
 * 검색 질의 정규화 — games.title_en_norm / title_ko_norm 생성 컬럼과 같은 규칙이어야 한다.
 * SQL 쪽: lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g')).
 * C.UTF-8 의 [:alnum:] 은 유니코드 문자, 숫자이므로 JS 에서는 \p{L}\p{N} 로 맞춘다.
 * 공백, 구두점, ™®© 가 사라지므로 "엘든 링" 과 "엘든링", "ELDEN RING:" 이 같은 키가 된다.
 */
export function normalizeForSearch(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * 로마 숫자 낱말 → 아라비아 숫자. 스토어마다 같은 속편을 다르게 적는다 —
 * Steam 은 "Dragon's Dogma 2", HLTB 는 "Dragon's Dogma II" 로 쓴다(2026-09-15 실측 유사도 0.71,
 * 사람이 봐야 하는 검수 큐 36건 중 6건이 이 차이 하나였다).
 *
 * **낱말 전체가 로마 숫자일 때만** 바꾼다. "mwii", "v2", "3d" 처럼 글자에 붙은 것은 시리즈 번호가 아니다.
 * 20 까지만 두는 이유: 그 위의 속편은 없고, 목록이 길어질수록 평범한 낱말(li, mix...)과 겹칠 위험만 는다.
 *
 * 이 접기를 normalizeTitle 이 아니라 matchKey 에만 두는 이유: normalizeTitle 의 결과가
 * 그대로 스토어 검색 질의로 나간다(match.ts searchBestCandidate). "V Rising" 을 "5 rising" 으로
 * 물으면 아무것도 안 나온다. 접기는 비교할 때만 필요하다.
 */
const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20,
};

/**
 * 같은 게임의 재출시 표시. 뒤에 붙을 때만 뗀다 —
 * "Sonic 3D Blast" 의 3D 는 제목의 일부지만 "Rogue Squadron 3D" 의 3D 는 판본 표시다.
 * EDITION_SUFFIXES 에 넣지 않는 이유: 저 목록은 normalizeTitle 이 쓰고, 그 결과는 검색 질의로 나간다.
 * 스토어 제목이 실제로 "Stronghold HD" 라면 그 이름 그대로 물어야 찾는다.
 */
const VERSION_TAGS = new Set(["hd", "3d", "dx"]);

/**
 * 낱말 경계를 공백이 아니라 "로마자, 숫자가 아닌 것" 으로 잡는다.
 * 일본어 제목은 낱말을 띄우지 않아 "ファイナルファンタジーVIIリメイク" 처럼 붙어 온다 —
 * 공백으로 끊으면 이쪽 VII 만 못 접어서 띄어 쓴 같은 제목과 0.64 로 갈라진다(2026-09-15 회귀).
 * 반대로 "mwii", "v2" 는 앞뒤가 로마자, 숫자라 그대로 남는다.
 */
const ROMAN_PATTERN = new RegExp(
  `(?<![a-z0-9])(${Object.keys(ROMAN_NUMERALS).sort((a, b) => b.length - a.length).join("|")})(?![a-z0-9])`,
  "g",
);

/** 같은 경계 규칙으로 읽는 시리즈 번호 자리 */
const SERIES_NUMBER_PATTERN = /(?<![a-z])\d+(?![a-z])/g;

/** 비교 직전 단계: 뒤에 붙은 판본 표시를 떼고, 로마 숫자를 아라비아 숫자로 접는다 */
function foldForCompare(normalized: string): string {
  const words = normalized.split(" ").filter(Boolean);
  while (words.length > 1 && VERSION_TAGS.has(words[words.length - 1])) words.pop();
  return words.join(" ").replace(ROMAN_PATTERN, (w) => String(ROMAN_NUMERALS[w]));
}

/**
 * 제목에 박힌 시리즈 번호들. 낱말 하나가 통째로 숫자(또는 로마 숫자)일 때만 센다.
 * 번호가 하나도 없으면 1편으로 본다 — "Darkest Dungeon" 과 "Darkest Dungeon II" 를 가르는 축이 이것이다.
 */
export function seriesNumbers(title: string): Set<number> {
  const found = new Set<number>();
  for (const m of foldForCompare(normalizeTitle(title)).matchAll(SERIES_NUMBER_PATTERN)) found.add(Number(m[0]));
  return found.size > 0 ? found : new Set([1]);
}

/**
 * 시리즈 번호가 어긋나는가 — 어긋나면 유사도가 아무리 높아도 다른 게임이다.
 *
 * 왜 필요한가(2026-09-15): 유사도 0.7~0.9 구간은 **속편이 사는 구간**이다. 실측 표본에서
 * "Darkest Dungeon" 대 "Darkest Dungeon II" 가 0.78, "Hearts of Iron IV" 대 "Hearts of Iron" 이 0.75,
 * "The Sinking City Remastered" 대 "The Sinking City 2" 가 0.82 였다. 번호를 안 보고 유사도만 쓰면
 * 2편 가격이 1편 페이지에 박힌다 — 되돌리기 어려운 오염이다.
 *
 * 알면서 감수하는 손해: 우리 제목에만 번호가 붙은 같은 게임도 함께 걸린다
 * (실측 "Deus Ex 2: Invisible War" 대 "Deus Ex: Invisible War"). 이쪽은 매핑이 없어 값이 비는 것으로
 * 끝나고 NONE_RETRY_DAYS 뒤 다시 시도하지만, 반대 실수는 틀린 값을 화면에 띄운다. 안전한 쪽으로 튼다.
 *
 * 연도를 예외로 두지 않는다 — "Cyberpunk 2077" 과 "Football Manager 2024" 를 가르는 규칙이 없다.
 */
export function seriesConflict(a: string, b: string): boolean {
  const sa = seriesNumbers(a);
  const sb = seriesNumbers(b);
  if (sa.size !== sb.size) return true;
  for (const n of sa) if (!sb.has(n)) return true;
  return false;
}

/**
 * 유사도 비교용 키 — 정규화한 제목에서 공백까지 지운다.
 *
 * 띄어쓰기는 스토어마다 제멋대로다("몬스터 헌터 라이즈" / "몬스터헌터라이즈",
 * "ゼルダの伝説 ブレス オブ ザ ワイルド" / "ゼルダの伝説ブレスオブザワイルド").
 * 공백을 신호로 두면 같은 게임이 0.31~0.36 으로 떨어져 남남이 된다.
 *
 * 지워도 안전한 이유(2026-09-14 실측, 아래 표본은 slug.test.ts 에 고정해 뒀다):
 * 낱말이 붙으면 경계 trigram 이 사라져 **서로 다른 게임의 유사도는 오히려 내려간다**
 * (Portal / Portal 2 0.78 → 0.67, 풍화설월 / 무쌍 풍화설월 0.71 → 0.60).
 * 같은 게임 최저 0.87, 다른 게임 최고 0.68 로 벌어져 임계값 0.9 / 0.7 을 그대로 둔다.
 */
function matchKey(title: string): string {
  return foldForCompare(normalizeTitle(title)).replace(/\s+/g, "");
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** pg_trgm 방식과 유사한 trigram Jaccard 유사도 (0~1) */
export function trigramSimilarity(a: string, b: string): number {
  const ka = matchKey(a);
  const kb = matchKey(b);
  // 빈 키는 0. trigrams("") 는 패딩 때문에 원소가 1개라 빈 것끼리 1.0 이 나온다 —
  // 그대로 두면 글자를 하나도 못 남긴 제목들(기호뿐인 제목)이 서로 auto 매칭돼 다른 게임이 합쳐진다.
  if (!ka || !kb) return 0;
  const ta = trigrams(ka);
  const tb = trigrams(kb);
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}
