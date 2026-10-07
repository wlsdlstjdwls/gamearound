// 한국닌텐도 뉴스 목록과 특전 글을 사실로 옮기는 순수 함수들. 네트워크, DB 를 모른다.
//
// 특전 글의 틀(2026-10-07, 특전 글 여섯 건 실측):
//   소제목(h3, 글에 따라 h1) "에코백" | 이미지 | 문단 "…에서 구입 시 증정" | ※ 조건 | 다음 소제목 …
// 판매처 표는 따로 없다. 그래서 "소제목 다음에 '구입 시 증정' 문단이 오면 그 소제목이 특전 하나" 로 읽는다 —
// 소제목 태그(h1, h3)에 기대지 않는 이유는 스타폭스 글이 특전 이름을 h1 로 썼기 때문이다.
// "Nintendo Store 한정 아트카드" 처럼 판매처 문단 없이 홍보 문장만 있는 특전은 뽑지 않는다 — 문장을 옮기지 않기로 했다(schema-preorder 머리 주석).
import { decodeHtmlEntities } from "@/lib/html-entities";
import {
  BONUS_TITLE_CONTEXT,
  BONUS_TITLE_PATTERN,
  DOWNLOAD_HEADING,
  DOWNLOAD_PERIOD,
  DOWNLOAD_RETAILER,
  KR_GAME_NSUID,
  NON_BONUS_HEADING,
  NOTE_MARK,
  RETAIL_SECTION_END,
  RETAIL_SECTION_START,
  RETAILER_MARK,
  RETAILER_PLAIN_MAX,
  RETAILER_PLAIN_REJECT,
  RETAILER_TAIL,
} from "./constants";
import { extractFlight, readJsonAfter, resolveRef } from "./flight";

export type NewsListItem = { slug: string; title: string; publishedAt: string; external: boolean };

export type ParsedBonus = {
  edition: "package" | "download";
  name: string;
  retailers: string | null;
  notes: string[];
  imageUrl: string | null;
  /** YYYY-MM-DD */
  endsOn: string | null;
};

export type ParsedArticle = { nsuids: string[]; bonuses: ParsedBonus[] };

const LIST_ITEM =
  /"title":("(?:[^"\\]|\\.)*"),"displayDate":"([^"]+)","sortDate":"[^"]*","slug":"([^"]+)","link":(null|"(?:[^"\\]|\\.)*")/g;

/** 목록 한 쪽의 글들. 바깥 링크 글(link 가 있는 것)은 우리 글 주소로 열리지 않아 external 로 표시한다 */
export function parseNewsList(html: string): NewsListItem[] {
  const flight = extractFlight(html);
  const seen = new Set<string>();
  const out: NewsListItem[] = [];
  for (const m of flight.matchAll(LIST_ITEM)) {
    if (seen.has(m[3])) continue;
    seen.add(m[3]);
    out.push({ slug: m[3], title: (JSON.parse(m[1]) as string).trim(), publishedAt: m[2], external: m[4] !== "null" });
  }
  return out;
}

/** 제목만 보고 예약 특전 글인지 */
export function isBonusTitle(title: string): boolean {
  return BONUS_TITLE_PATTERN.test(title) && BONUS_TITLE_CONTEXT.test(title);
}

type Block = { kind: "heading" | "text"; text: string } | { kind: "image"; url: string };

const TAGGED = /<(h[1-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g;

/**
 * 화면 문구에 가운뎃점을 쓰지 않는다(규약 §4). 판매처 원문은 "G마켓·옥션·롯데ON" 처럼 가운뎃점으로 나열해서
 * 우리 규칙대로 쉼표로 바꾼다 — 나열이라는 뜻은 같다.
 */
function cleanText(html: string): string {
  return decodeHtmlEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s*[·・]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

type BodyItem = { tinyMce?: unknown; image1?: { url?: unknown } | null; image2?: { url?: unknown } | null };

function imageUrl(v: { url?: unknown } | null | undefined): string | null {
  return typeof v?.url === "string" ? v.url : null;
}

/**
 * 본문 모듈을 순서대로 펼친 덩어리 줄과, 본문 원문(번호 줍기용). 문단 하나에 ※ 줄이 여럿 붙어 있어도 덩어리는 태그 단위다.
 * 원문을 본문으로만 좁히는 이유: 페이지 전체에는 다른 게임 링크(추천, 바닥글)가 섞여 엉뚱한 번호를 줍는다.
 */
function readBody(flight: string): { blocks: Block[]; raw: string } {
  const body = readJsonAfter(flight, '"bodyCollection":') as { items?: BodyItem[] } | null;
  const blocks: Block[] = [];
  const raw: string[] = [JSON.stringify(body ?? "")];
  for (const it of body?.items ?? []) {
    if (typeof it.tinyMce === "string") {
      const html = resolveRef(flight, it.tinyMce);
      raw.push(html);
      for (const m of html.matchAll(TAGGED)) {
        const text = cleanText(m[2]);
        if (text) blocks.push({ kind: m[1].startsWith("h") ? "heading" : "text", text });
      }
    }
    for (const img of [it.image1, it.image2]) {
      const url = imageUrl(img);
      if (url) blocks.push({ kind: "image", url });
    }
  }
  return { blocks, raw: raw.join(" ") };
}

/** 소제목 하나와 그 밑 덩어리들. inRetail 은 "판매처별 조기 구입 특전" 마디 안인가 */
type Segment = { heading: string; texts: string[]; images: string[]; inRetail: boolean };

function segments(blocks: Block[]): Segment[] {
  const out: Segment[] = [];
  let cur: Segment | null = null;
  let inRetail = false;
  for (const b of blocks) {
    if (b.kind === "heading") {
      if (RETAIL_SECTION_START.test(b.text)) inRetail = true;
      else if (RETAIL_SECTION_END.test(b.text)) inRetail = false;
      cur = { heading: b.text, texts: [], images: [], inRetail };
      out.push(cur);
    } else if (cur) {
      if (b.kind === "image") cur.images.push(b.url);
      else cur.texts.push(b.text);
    }
  }
  return out;
}

/** 특전 이름에서 게임 제목 『…』 를 걷는다 — 다운로드판 마디 제목이 "『X』 다운로드 버전 조기 구입 특전" 꼴이다 */
function stripGameTitle(s: string): string {
  return s.replace(/『[^』]*』/g, "").replace(/\s+/g, " ").trim();
}

/** 판매처 문단의 끝 자리. "구입 시 증정" 문단이 있으면 거기, 없으면 마디 안에서 판매처 모양인 첫 문단 */
function retailerEnd(seg: Segment): number {
  const marked = seg.texts.findIndex((t) => RETAILER_MARK.test(t));
  if (marked >= 0) return marked;
  if (!seg.inRetail || seg.images.length === 0 || RETAIL_SECTION_START.test(seg.heading)) return -1;
  return seg.texts.findIndex((t) => !NOTE_MARK.test(t) && t.length <= RETAILER_PLAIN_MAX && !RETAILER_PLAIN_REJECT.test(t));
}

function packageBonus(seg: Segment): ParsedBonus | null {
  if (NON_BONUS_HEADING.test(seg.heading)) return null;
  const i = retailerEnd(seg);
  if (i < 0) return null;
  // 판매처는 증정 문단까지의 문단을 잇는다 — 오프라인, 온라인을 두 문단으로 나눠 쓴 글이 많다
  const retailers = seg.texts
    .slice(0, i + 1)
    .filter((t) => !NOTE_MARK.test(t))
    .join(" ")
    .replace(RETAILER_TAIL, "")
    .replace(/,\s*$/, "")
    .trim();
  return {
    edition: "package",
    name: seg.heading,
    retailers: retailers || null,
    notes: seg.texts.filter((t) => NOTE_MARK.test(t)).map((t) => t.replace(NOTE_MARK, "")),
    imageUrl: seg.images[0] ?? null,
    endsOn: null,
  };
}

function downloadBonus(seg: Segment): ParsedBonus | null {
  if (!DOWNLOAD_HEADING.test(seg.heading)) return null;
  const period = seg.texts.map((t) => DOWNLOAD_PERIOD.exec(t)).find(Boolean);
  if (!period) return null;
  const [, y, mo, d] = period;
  return {
    edition: "download",
    name: stripGameTitle(seg.heading),
    retailers: DOWNLOAD_RETAILER,
    notes: seg.texts.filter((t) => NOTE_MARK.test(t)).map((t) => t.replace(NOTE_MARK, "")),
    imageUrl: seg.images[0] ?? null,
    endsOn: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`,
  };
}

/** 특전 글 하나. 특전을 못 뽑았으면 bonuses 가 비고, 부르는 쪽이 그 글을 review 로 남긴다 */
export function parseBonusArticle(html: string): ParsedArticle {
  const { blocks, raw } = readBody(extractFlight(html));
  const bonuses = segments(blocks)
    .map((s) => packageBonus(s) ?? downloadBonus(s))
    .filter((b): b is ParsedBonus => b !== null);
  // 본편 번호는 소프트웨어 목록 모듈과 본문 스토어 링크 둘 다에서 줍는다 — 목록이 빈 글이 있다(리듬 천국, 요시)
  const nsuids = [...new Set(raw.match(KR_GAME_NSUID) ?? [])];
  return { nsuids, bonuses };
}
