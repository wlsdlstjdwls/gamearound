// 뉴스 RSS 어댑터 — 설계서 §4.1. RSS 2.0 / Atom 을 fast-xml-parser 로 파싱.
// §10 저작권: 제목 + 링크 + 공식 썸네일만 추출, 본문은 저장하지 않는다.
import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import { AdapterError, type NewsAdapter, type NewsItem, type SearchCandidate } from "./types";
import { createHttpClient } from "./http";

/**
 * 피드 목록(§11-4 확정, 2026-09-11 응답 확인). externalId = name.
 * 공식 RSS 를 공개한 매체만 넣는다(§10: 제목, 링크, 공식 썸네일만 저장). 응답이 끊기면 sync_logs 에 partial 로 남으니 거기서 정리.
 * 제외: VG247(최신 항목 3개월 전), Polygon(피드 응답 실패), 인벤, 디스이즈게임, 게임포커스(404), Xbox Wire(403).
 */
export const RSS_FEEDS: ReadonlyArray<{ name: string; url: string }> = [
  { name: "PC Gamer", url: "https://www.pcgamer.com/rss/" },
  { name: "Eurogamer", url: "https://www.eurogamer.net/feed" },
  { name: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed" },
  { name: "GameSpot", url: "https://www.gamespot.com/feeds/news/" },
  { name: "IGN", url: "https://www.ign.com/rss/articles/feed?tags=games" },
  { name: "Kotaku", url: "https://kotaku.com/feed" },
  { name: "GamesIndustry.biz", url: "https://www.gamesindustry.biz/feed" },
  { name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest" },
  { name: "PlayStation Blog", url: "https://blog.playstation.com/feed/" },
  { name: "Steam 뉴스", url: "https://store.steampowered.com/feeds/news/" },
  { name: "게임메카", url: "https://www.gamemeca.com/rss.php" },
  { name: "루리웹 뉴스", url: "https://bbs.ruliweb.com/news/rss" },
];

const http = createHttpClient({
  source: "rss",
  label: "RSS",
  headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
});

// ---- XML 파서 설정 ----
const ARRAY_PATHS = new Set(["rss.channel.item", "feed.entry", "feed.entry.link", "rss.channel.item.enclosure", "rss.channel.item.media:content"]);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (_name, jpath) => ARRAY_PATHS.has(typeof jpath === "string" ? jpath : jpath.toString()),
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
});

type Node = Record<string, unknown>;

function isNode(v: unknown): v is Node {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 문자열 / {#text} / 배열 첫 요소 → 문자열 */
function text(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (isNode(v)) {
    const t = v["#text"];
    if (typeof t === "string") return t.trim() || null;
    if (typeof t === "number") return String(t);
  }
  return null;
}

function attr(v: unknown, name: string): string | null {
  if (Array.isArray(v)) {
    for (const item of v) {
      const a = attr(item, name);
      if (a) return a;
    }
    return null;
  }
  if (!isNode(v)) return null;
  const a = v[`@_${name}`];
  return typeof a === "string" && a.trim() ? a.trim() : null;
}

function firstImgSrc(html: string | null): string | null {
  if (!html || !html.includes("<img")) return null;
  const src = load(html)("img").first().attr("src");
  return src?.trim() || null;
}

function toIso(dateStr: string | null, fallback: Date): string {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback.toISOString();
}

/** 이미지 타입인 enclosure/media:content 만 채택 */
function imageUrlFrom(v: unknown): string | null {
  const list = Array.isArray(v) ? v : v === undefined ? [] : [v];
  for (const item of list) {
    const url = attr(item, "url");
    if (!url) continue;
    const type = attr(item, "type") ?? "";
    const medium = attr(item, "medium") ?? "";
    if (type.startsWith("image/") || medium === "image" || (!type && !medium)) return url;
  }
  return null;
}

/** 썸네일 우선순위: media:thumbnail → media:content(image) → enclosure(image) → description/content 첫 <img> */
function pickThumbnail(item: Node): string | undefined {
  const candidates = [
    attr(item["media:thumbnail"], "url"),
    imageUrlFrom(item["media:content"]),
    imageUrlFrom(item["enclosure"]),
    firstImgSrc(text(item["content:encoded"])),
    firstImgSrc(text(item["description"])),
    firstImgSrc(text(item["content"])),
    firstImgSrc(text(item["summary"])),
  ];
  return candidates.find((c): c is string => Boolean(c));
}

function parseRssItems(channel: Node, sourceName: string, now: Date): NewsItem[] {
  const items = Array.isArray(channel.item) ? channel.item : [];
  const out: NewsItem[] = [];
  for (const raw of items) {
    if (!isNode(raw)) continue;
    const title = text(raw.title);
    const url = text(raw.link) ?? attr(raw.link, "href") ?? text(raw.guid);
    if (!title || !url || !/^https?:\/\//.test(url)) continue;
    const publishedAt = toIso(text(raw.pubDate) ?? text(raw["dc:date"]), now);
    const thumbnailUrl = pickThumbnail(raw);
    out.push({ title, url, sourceName, publishedAt, ...(thumbnailUrl ? { thumbnailUrl } : {}) });
  }
  return out;
}

function atomLink(entry: Node): string | null {
  const links = Array.isArray(entry.link) ? entry.link : entry.link === undefined ? [] : [entry.link];
  const alternate = links.find((l) => (attr(l, "rel") ?? "alternate") === "alternate");
  return attr(alternate ?? links[0], "href");
}

function parseAtomEntries(feed: Node, sourceName: string, now: Date): NewsItem[] {
  const entries = Array.isArray(feed.entry) ? feed.entry : [];
  const out: NewsItem[] = [];
  for (const raw of entries) {
    if (!isNode(raw)) continue;
    const title = text(raw.title);
    const url = atomLink(raw);
    if (!title || !url || !/^https?:\/\//.test(url)) continue;
    const publishedAt = toIso(text(raw.published) ?? text(raw.updated), now);
    const thumbnailUrl = pickThumbnail(raw);
    out.push({ title, url, sourceName, publishedAt, ...(thumbnailUrl ? { thumbnailUrl } : {}) });
  }
  return out;
}

/** RSS 2.0 또는 Atom XML → NewsItem[]. 날짜가 없거나 깨진 항목은 now 로 대체 */
export function parseFeed(xml: string, sourceName: string, now: Date = new Date()): NewsItem[] {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (e) {
    throw new AdapterError(`RSS XML 파싱 실패 (${sourceName}): ${e instanceof Error ? e.message : String(e)}`, "rss", false);
  }
  if (!isNode(doc)) throw new AdapterError(`RSS 문서 형식 오류 (${sourceName})`, "rss", false);
  const rss = doc.rss;
  if (isNode(rss) && isNode(rss.channel)) return parseRssItems(rss.channel, sourceName, now);
  const feed = doc.feed;
  if (isNode(feed)) return parseAtomEntries(feed, sourceName, now);
  // RSS 1.0(RDF) 은 item 이 최상위에 옴
  const rdf = doc["rdf:RDF"];
  if (isNode(rdf)) return parseRssItems({ item: Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [] }, sourceName, now);
  throw new AdapterError(`지원하지 않는 피드 형식 (${sourceName})`, "rss", false);
}

export function findFeed(name: string): { name: string; url: string } | undefined {
  return RSS_FEEDS.find((f) => f.name === name);
}

// ---- 네트워크 ----

export const rssAdapter: NewsAdapter = {
  source: "rss",
  minIntervalMs: 1000,

  /** 뉴스는 매칭 대상이 아님 */
  async search(): Promise<SearchCandidate[]> {
    return [];
  },

  /** externalId = RSS_FEEDS[].name */
  async fetch(feedName: string): Promise<NewsItem[]> {
    const feed = findFeed(feedName);
    if (!feed) throw new AdapterError(`알 수 없는 피드: ${feedName}`, "rss", false);
    return parseFeed(await http.text(feed.url, { context: feed.name }), feed.name);
  },
};
