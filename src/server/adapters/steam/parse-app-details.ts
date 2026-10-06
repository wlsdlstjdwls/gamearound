// appdetails 응답 파서 — 단건 조회 경로(GetItems 가 실패하거나 배치가 아닌 경우).
import { AdapterError, type RequirementSnapshot, type RequirementsResult, type StoreSnapshot } from "../types";
import { steamKoreanOf } from "./parse-languages";
import { parseRequirements } from "./parse-requirements";
import { appDetailsResponseSchema, type SteamAppData } from "./schemas";
import { STEAM_STORE_APP_URL } from "./constants";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Steam 출시일 문자열 → YYYY-MM-DD. "2020년 12월 10일", "10 Dec, 2020", "Dec 10, 2020", "2020-12-10" 지원. 불명확하면 null */
export function parseSteamDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null;

  let m = s.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    return mon ? build(Number(m[3]), mon, Number(m[1])) : null;
  }
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    return mon ? build(Number(m[3]), mon, Number(m[2])) : null;
  }
  return null;
}

/** Steam categories 로 멀티플레이 정보 추론 (§11-7: 카테고리 태그만 사용, 인원수는 알 수 없음) */
export function inferMultiplayer(categories: Array<{ description: string }> | undefined): NonNullable<StoreSnapshot["meta"]>["multiplayer"] {
  const descs = (categories ?? []).map((c) => c.description.toLowerCase());
  const has = (kw: string) => descs.some((d) => d.includes(kw));
  const solo = has("single-player");
  const coop = has("co-op");
  const pvp = has("pvp");
  const multi = has("multi-player") || has("mmo") || coop || pvp;
  if (!solo && !multi) return undefined;
  return { solo, coop, pvp };
}

/** appdetails 의 platforms → 네이티브 지원 세 값. 응답에 없으면 전부 undefined(기존 값을 안 덮는다) */
function nativeOsOf(
  p: { windows?: boolean; mac?: boolean; linux?: boolean } | undefined,
): Pick<StoreSnapshot, "nativeWindows" | "nativeMac" | "nativeLinux"> {
  if (!p) return {};
  return { nativeWindows: p.windows ?? false, nativeMac: p.mac ?? false, nativeLinux: p.linux ?? false };
}

function centsToKrw(cents: number): number {
  return Math.round(cents / 100);
}

function extractAppData(raw: unknown, appid: string): SteamAppData | null {
  const parsed = appDetailsResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`appdetails 응답 형식 오류 (appid=${appid}): ${parsed.error.message}`, "steam", false);
  const entry = parsed.data[appid];
  if (!entry || !entry.success || !entry.data) return null;
  return entry.data;
}

/**
 * appdetails 응답(koreana) + 선택적으로 english 응답 → StoreSnapshot.
 * - 가격: price_overview.initial/final(센트) → KRW 정수. 무료 게임은 0, 미판매/미출시는 null
 * - titleKo: koreana name (영문 name과 같으면 null → UI는 titleEn 사용)
 */
export function parseAppDetails(rawKo: unknown, appid: string, rawEn?: unknown): StoreSnapshot {
  const ko = extractAppData(rawKo, appid);
  if (!ko) throw new AdapterError(`appid ${appid} 를 찾을 수 없거나 success=false`, "steam", false);
  const en = rawEn === undefined ? null : extractAppData(rawEn, appid);

  let listPrice: number | null = null;
  let currentPrice: number | null = null;
  let discountPct: number | null = null;
  if (ko.price_overview) {
    listPrice = centsToKrw(ko.price_overview.initial);
    currentPrice = centsToKrw(ko.price_overview.final);
    discountPct = ko.price_overview.discount_percent ?? (listPrice > 0 ? Math.round((1 - currentPrice / listPrice) * 100) : 0);
  } else if (ko.is_free) {
    listPrice = 0;
    currentPrice = 0;
    discountPct = 0;
  }

  const titleEn = (en?.name ?? ko.name).trim();
  const titleKoRaw = ko.name.trim();
  const titleKo = titleKoRaw && titleKoRaw !== titleEn ? titleKoRaw : null;
  const releaseDate = parseSteamDate(en?.release_date?.date) ?? parseSteamDate(ko.release_date?.date);

  const parentRaw = ko.fullgame?.appid ?? en?.fullgame?.appid;
  const parentExternalId = parentRaw === undefined || parentRaw === null ? null : String(parentRaw);
  // type 이 "dlc" 이거나 본편을 가리키고 있으면 DLC 로 본다.
  // 두 신호를 모두 보는 이유: Steam 은 일부 확장팩을 type="game" 으로 두면서 fullgame 만 채워 준다.
  const isDlc = (ko.type ?? en?.type) === "dlc" || Boolean(parentExternalId);
  const dlcExternalIds = (ko.dlc ?? en?.dlc ?? []).map(String);
  const korean = steamKoreanOf(ko) ?? steamKoreanOf(en);

  return {
    platform: "steam",
    storeExternalId: appid,
    storeUrl: `${STEAM_STORE_APP_URL}/${appid}`,
    listPrice,
    currentPrice,
    discountPct,
    currentVersion: null,
    releaseDate,
    contentType: isDlc ? "dlc" : "game",
    parentExternalId,
    dlcExternalIds,
    // 본편이 DLC 목록을 줬다면 그 자체가 "추가 콘텐츠 있음"이다
    hasAddOns: isDlc ? null : dlcExternalIds.length > 0,
    // 덱 등급은 이 응답에 없다(배치 경로에만 있다 — schemas 의 platforms 주석). OS 세 개만 옮긴다
    ...nativeOsOf(ko.platforms ?? en?.platforms),
    koText: korean?.text,
    koVoice: korean?.voice,
    meta: {
      titleEn,
      titleKo,
      description: ko.short_description?.trim() || null,
      coverUrl: ko.header_image ?? null,
      developer: ko.developers?.[0] ?? null,
      publisher: ko.publishers?.[0] ?? null,
      genres: (ko.genres ?? []).map((g) => g.description.trim()).filter(Boolean),
      multiplayer: inferMultiplayer(ko.categories),
    },
  };
}

/**
 * 본편 appdetails 응답 → 그 본편이 가진 DLC appid 목록.
 * 배치 경로(GetItems)는 자식이 부모를 가리키는 방향만 주므로, 본편에서 DLC 를 찾아 들여오려면
 * 이 단건 응답이 유일한 출처다(2026-09-14 실측).
 *
 * 사운드트랙(EStoreAppType 11)도 이 배열에 섞여 온다 — 셀레스트 1092840, 할로우나이트 598190 이
 * 그렇다. 걸러내지 않는 이유: 스토어가 그 자리에서 파는 추가 콘텐츠이고, 우리가 하는 일이 가격
 * 비교라 사는 사람에게는 DLC 와 같은 상품이다. 번들은 appid 가 아니라 packageid, bundleid 라
 * 이 배열에 아예 없다 — 이 경로로는 들어오지 않는다.
 *
 * 응답이 success=false 면 빈 배열이다. 목록이 없다는 사실과 게임이 없다는 사실을 여기서 가르지
 * 않는다 — 호출부는 둘 다 "이번에는 새 DLC 없음" 으로 똑같이 다루면 된다.
 */
export function parseDlcIds(raw: unknown, appid: string): string[] {
  const data = extractAppData(raw, appid);
  return (data?.dlc ?? []).map(String);
}

/**
 * appdetails(english) 응답 → 사양 스냅샷 목록. 실제 해석은 parse-requirements 가 한다 —
 * 여기서는 응답 껍데기를 벗겨 넘기기만 한다.
 *
 * 응답이 success=false 면 빈 배열이다. 사양이 없는 게임과 구분하지 않는다 —
 * 호출부는 둘 다 "이번에는 받은 사양 없음" 으로 똑같이 다루면 된다(parseDlcIds 와 같은 규칙).
 */
export function parseAppRequirements(raw: unknown, appid: string): RequirementSnapshot[] {
  const data = extractAppData(raw, appid);
  return data ? parseRequirements(data) : [];
}

/**
 * 사양 요청 한 번의 답 전체 — 사양과 한국어 지원. 같은 응답에 둘 다 실려 오므로 한 번에 꺼낸다
 * (types 의 RequirementsResult 주석). 언어는 요청이 english 라 "Korean" 으로 온다.
 */
export function parseAppRequirementsResult(raw: unknown, appid: string): RequirementsResult {
  const data = extractAppData(raw, appid);
  if (!data) return { requirements: [] };
  return { requirements: parseRequirements(data), korean: steamKoreanOf(data) };
}

/**
 * discount_description 토큰 → 한국어 행사명.
 * Steam 은 language=koreana 로 물어도 "#discount_desc_preset_weekend" 같은 토큰을 준다(2026-09-14 확인).
 * 모르는 토큰은 계절 키워드로 한 번 더 시도하고, 그래도 모르면 null(가짜 이름을 만들지 않는다).
 */
