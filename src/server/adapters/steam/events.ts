// 스팀 앱별 파트너 이벤트(시즌, 콜라보, 무료 주말, 대회 등) — 게임 상세 "이벤트, 소식" 카드의 스팀 몫(sync/game-events).
// 가져오기만 한다. 무엇을 카드로 올릴지(기간이 남은 것만)도 여기서 거르고, DB 는 모른다.
//
// 응답 형식에 대한 주의(2026-11-12): 이 PC 의 망과 외부 페치 둘 다 스팀이 연결을 끊어 응답을 직접 보지 못했다.
// 필드 이름은 스팀 상점 이벤트 화면이 쓰는 공개 엔드포인트의 알려진 형식을 따랐고, 모르는 필드는 zod 가 버린다.
// 형식이 다르면 파싱이 0건으로 끝날 뿐 다른 수집을 막지 않는다 — 서울 리전 첫 회차 응답으로 확인한다.
import { z } from "zod";
import { createHttpClient } from "../http";

/** 앱 하나의 이벤트 목록. 최신순으로 count 건 */
export const STEAM_EVENTS_URL = "https://store.steampowered.com/events/ajaxgetpartnereventspageable/";
/** 한 번에 받는 이벤트 수. 기간이 남은 이벤트는 앞쪽에 몰려 있어 많이 받을 까닭이 없다 */
export const STEAM_EVENTS_COUNT = 10;
/** 이벤트 화면 주소. 공지 gid 로 연다 */
export const steamEventUrl = (appid: string, announcementGid: string): string => `https://store.steampowered.com/news/app/${appid}/view/${announcementGid}`;
/** 이벤트 그림 파일이 놓이는 곳. 파일 이름 앞에 그룹(clan) 계정 번호가 붙는다 */
export const steamEventImageUrl = (clanAccountId: string, file: string): string => `https://clan.akamai.steamstatic.com/images/${clanAccountId}/${file}`;
/** 그룹 SteamID64 에서 계정 번호를 뺄 때 쓰는 기준값(그룹 계정 유형의 SteamID 시작점) */
const CLAN_STEAMID_BASE = BigInt("103582791429521408");
/** jsondata 의 언어별 배열에서 한국어 칸. 스팀 언어 번호 0 영어, 4 한국어 */
const LANG_EN = 0;
const LANG_KO = 4;
/**
 * 패치 기록 갈래(작은 업데이트, 일반 업데이트, 큰 업데이트). 패치는 상세의 패치 마디가 따로 받으므로 카드로 올리지 않는다.
 * 번호는 스팀웍스 이벤트 종류 안내를 따랐다 — 첫 회차 응답으로 다시 확인한다(파일 머리 주석)
 */
const PATCH_EVENT_TYPES = new Set([12, 13, 14]);
/** 기간이 이보다 짧으면 공지로 본다. 공지도 시작, 끝 시각을 같게 달고 오는 일이 있다 */
const MIN_EVENT_SECONDS = 3600;

const LocalizedList = z.array(z.string().nullable()).nullish();
const JsonData = z.object({
  localized_capsule_image: LocalizedList,
  localized_title_image: LocalizedList,
  localized_subtitle: LocalizedList,
  localized_summary: LocalizedList,
});
const EventSchema = z.object({
  gid: z.string(),
  clan_steamid: z.string().nullish(),
  event_name: z.string(),
  event_type: z.number().nullish(),
  rtime32_start_time: z.number().nullish(),
  rtime32_end_time: z.number().nullish(),
  jsondata: z.string().nullish(),
  announcement_body: z.object({ gid: z.string().nullish(), headline: z.string().nullish(), posttime: z.number().nullish() }).nullish(),
});
const ResponseSchema = z.object({ events: z.array(z.unknown()).nullish() });

export type SteamEvent = {
  gid: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string;
  publishedAt: string | null;
  startsAt: string;
  endsAt: string;
};

function pick(list: Array<string | null> | null | undefined): string | null {
  const v = list?.[LANG_KO] ?? list?.[LANG_EN] ?? list?.find(Boolean) ?? null;
  return v && v.trim() ? v.trim() : null;
}

function clanAccountId(steamid: string | null | undefined): string | null {
  if (!steamid || !/^\d+$/.test(steamid)) return null;
  const id = BigInt(steamid) - CLAN_STEAMID_BASE;
  return id > BigInt(0) ? id.toString() : null;
}

const iso = (sec: number): string => new Date(sec * 1000).toISOString();

/** 응답에서 아직 끝나지 않은 진짜 이벤트만. 형식이 다른 항목은 하나씩 버린다 */
export function parseSteamEvents(raw: unknown, appid: string, now: Date): SteamEvent[] {
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return [];
  const nowSec = Math.floor(now.getTime() / 1000);
  const out: SteamEvent[] = [];
  for (const item of parsed.data.events ?? []) {
    const e = EventSchema.safeParse(item);
    if (!e.success) continue;
    const ev = e.data;
    const start = ev.rtime32_start_time ?? 0;
    const end = ev.rtime32_end_time ?? 0;
    if (PATCH_EVENT_TYPES.has(ev.event_type ?? -1)) continue;
    if (end <= nowSec || end - start < MIN_EVENT_SECONDS) continue;
    const announcementGid = ev.announcement_body?.gid;
    if (!announcementGid) continue;
    let json: z.infer<typeof JsonData> = {};
    try {
      const j = JsonData.safeParse(JSON.parse(ev.jsondata ?? "{}"));
      if (j.success) json = j.data;
    } catch {
      // jsondata 가 깨져도 제목과 기간은 쓸 수 있다
    }
    const clan = clanAccountId(ev.clan_steamid);
    const image = pick(json.localized_capsule_image) ?? pick(json.localized_title_image);
    out.push({
      gid: ev.gid,
      title: ev.event_name.trim() || ev.announcement_body?.headline?.trim() || "",
      description: pick(json.localized_subtitle) ?? pick(json.localized_summary),
      imageUrl: image && clan ? steamEventImageUrl(clan, image) : null,
      url: steamEventUrl(appid, announcementGid),
      publishedAt: ev.announcement_body?.posttime ? iso(ev.announcement_body.posttime) : null,
      startsAt: iso(start),
      endsAt: iso(end),
    });
  }
  return out.filter((e) => e.title.length > 0);
}

const http = createHttpClient({ source: "steam", label: "Steam 이벤트" });

export async function fetchSteamEvents(appid: string, now: Date): Promise<SteamEvent[]> {
  const q = new URLSearchParams({ clan_accountid: "0", appid, offset: "0", count: String(STEAM_EVENTS_COUNT), l: "koreana" });
  return parseSteamEvents(await http.json(`${STEAM_EVENTS_URL}?${q}`, { context: `events ${appid}` }), appid, now);
}
