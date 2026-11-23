// 스팀 패치 공지 본문(BBCode, 가끔 HTML) 을 단순 글로 다듬는다 — 번역에 넣고(sync/patch-translate) 화면에 그대로 그릴 수 있는 꼴.
//
// 결과 꼴은 세 가지 줄뿐이다: 제목 줄 `## 글`, 목록 줄 `- 글`, 보통 줄. 문단은 빈 줄로 가른다.
// 화면(lib/patch/body-blocks)이 이 세 가지만 읽고 글자로 그린다 — 스토어 HTML 을 화면에 꽂지 않으려고 여기서 태그를 전부 걷는다.
//
// 버리는 것: 그림([img], <img>, {STEAM_CLAN_IMAGE} 주소), 영상([previewyoutube], [video], <iframe>), 표의 칸 구분.
// 그림 자리를 남기지 않는 이유: 번역 글자 수만 먹고 화면에서는 링크 하나 없는 빈 줄이 된다.
// 링크는 글만 남긴다([url=주소]글[/url] -> 글). 주소를 같이 남기면 DeepL 이 주소를 번역 대상으로 세어 글자만 먹는다.

/** 그림, 영상처럼 통째로 버리는 짝 태그. 안의 글도 같이 버린다 */
const DROP_PAIRED = ["img", "previewyoutube", "video", "youtube", "dynamiclink"] as const;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (m, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    })
    .replace(/&#x([0-9a-f]+);/gi, (m, n: string) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    })
    .replace(/&([a-z0-9#]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * 스팀 본문 -> 단순 글. 빈 본문이면 빈 문자열이다.
 * 순수 함수라 adapters/steam/__fixtures__ 없이도 문자열로 검증한다(clean-patch-body.test).
 */
export function cleanSteamPatchBody(raw: string): string {
  let s = raw.replace(/\r\n?/g, "\n");

  // 1. 통째로 버리는 것: 그림, 영상, 스팀 그림 주소
  for (const tag of DROP_PAIRED) {
    s = s.replace(new RegExp(`\\[${tag}(?:[=\\s][^\\]]*)?\\][\\s\\S]*?\\[\\/${tag}\\]`, "gi"), "");
    s = s.replace(new RegExp(`\\[${tag}(?:[=\\s][^\\]]*)?\\]`, "gi"), "");
  }
  s = s.replace(/<(img|iframe|video|source)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi, "");
  s = s.replace(/\{STEAM_CLAN_(?:LOC_)?IMAGE\}\S*/g, "");

  // 2. 제목: [h1]~[h6], <h1>~<h6> -> 제목 줄
  s = s.replace(/\[h[1-6]\]([\s\S]*?)\[\/h[1-6]\]/gi, (_m, t: string) => `\n\n## ${t.replace(/\s+/g, " ").trim()}\n\n`);
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, t: string) => `\n\n## ${t.replace(/\s+/g, " ").trim()}\n\n`);

  // 3. 목록: [*] 와 <li> 는 목록 줄로. 목록 머리, 꼬리는 줄바꿈
  s = s.replace(/\[\*\]/g, "\n- ");
  // 항목 닫는 짝 [/*] — 스팀 편집기가 항목마다 붙이는 꼴이 있다. 안 걷으면 글자 그대로 남아 번역문에도 실려 왔다(2026-11-23 사용자 발견, 143건 중 29건)
  s = s.replace(/\[\/\*\]/g, "");
  s = s.replace(/<li[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");
  s = s.replace(/\[\/?(?:list|olist)(?:=[^\]]*)?\]/gi, "\n\n");
  s = s.replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n\n");

  // 4. 문단, 줄바꿈, 구분선
  s = s.replace(/\[p(?:\s[^\]]*)?\]/gi, "").replace(/\[\/p\]/gi, "\n\n");
  s = s.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/\[br\]/gi, "\n");
  s = s.replace(/\[\/quote\]/gi, "\n\n");
  s = s.replace(/\[hr\](?:\[\/hr\])?/gi, "\n\n").replace(/<hr[^>]*>/gi, "\n\n");
  // 표는 줄 단위로 편다 — 칸은 파이프로 이어 읽힌다
  s = s.replace(/\[\/tr\]/gi, "\n").replace(/\[\/t[hd]\]\s*\[t[hd](?:\s[^\]]*)?\]/gi, " | ");
  s = s.replace(/<\/tr>/gi, "\n").replace(/<\/t[hd]>\s*<t[hd][^>]*>/gi, " | ");

  // 5. 링크는 글만. 글이 비면 버린다
  s = s.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1");
  s = s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // 6. 남은 꾸밈 태그는 껍데기만 걷는다([b], [i], [quote=..], [table], <span> 등)
  s = s.replace(/\[\/?[a-z][a-z0-9]*(?:[=\s][^\]]*)?\]/gi, "");
  s = s.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, "");
  s = decodeEntities(s);

  // 7. 줄 다듬기: 줄 끝 공백, 빈 목록 줄, 겹친 빈 줄
  const lines = s
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line !== "-" && line !== "##");
  const joined = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  // 새 편집기는 목록 칸 안에도 [p] 를 넣어 목록 줄 사이에 빈 줄이 생긴다 — 이어진 목록은 한 덩어리로 붙인다
  return joined.replace(/(?<=^|\n)(- [^\n]*)\n\n(?=- )/g, "$1\n").trim();
}
