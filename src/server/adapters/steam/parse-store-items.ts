// GetItems 응답 파서 — 배치 조회 경로. 가격, 할인 기간, 에셋, 멀티플레이 추론이 여기서 나온다.
import { AdapterError, type StoreSnapshot } from "../types";
import { storeItemsSchema, type StoreItem } from "./schemas";
import { PLAYER_CATEGORY, STEAM_DECK_COMPAT, STEAM_APP_TYPE_DEMO, STEAM_APP_TYPE_DLC, STEAM_APP_TYPE_MUSIC, STEAM_APP_TYPE_SOFTWARE, STEAM_ASSET_BASE_URL, STEAM_GENRE_TAG_IDS, STEAM_STORE_APP_URL } from "./constants";
import { steamDiscountLabel } from "./parse-discount";
import { steamItemKorean } from "./parse-languages";
import { ratioToScore } from "@/lib/user-score";

export function steamAssetUrl(
  assets: { asset_url_format?: string; header?: string; library_capsule?: string } | undefined,
  kind: "header" | "library_capsule" = "header",
): string | null {
  const filename = assets?.[kind];
  if (!assets?.asset_url_format || !filename) return null;
  return `${STEAM_ASSET_BASE_URL}/${assets.asset_url_format.replace("${FILENAME}", filename)}`;
}

/** GetItems 는 출시 시각을 unix 초로 준다. 날짜로 자를 때는 한국 스토어 표기와 같은 KST 기준이어야 한다 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** unix seconds → YYYY-MM-DD (KST). 0/미정은 null */
export function unixToIsoDate(sec: number | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const d = new Date(sec * 1000 + KST_OFFSET_MS);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** 문자열 센트 → KRW 정수. 빈 값/파싱 실패는 null */
function centsStrToKrw(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n / 100) : null;
}

function priceOf(item: StoreItem): { listPrice: number | null; currentPrice: number | null; discountPct: number | null } {
  const opt = item.best_purchase_option;
  const current = centsStrToKrw(opt?.final_price_in_cents);
  if (current === null) {
    // 구매 옵션이 없는 경우: 무료 게임은 0원, 그 외(미출시, 미판매)는 값 없음
    return item.is_free ? { listPrice: 0, currentPrice: 0, discountPct: 0 } : { listPrice: null, currentPrice: null, discountPct: null };
  }
  const list = centsStrToKrw(opt?.original_price_in_cents) ?? current;
  const pct = opt?.discount_pct ?? (list > 0 ? Math.round((1 - current / list) * 100) : 0);
  return { listPrice: list, currentPrice: current, discountPct: pct };
}

function multiplayerOf(item: StoreItem): NonNullable<StoreSnapshot["meta"]>["multiplayer"] {
  const ids = item.categories?.supported_player_categoryids ?? [];
  if (ids.length === 0) return undefined;
  const has = (group: readonly number[]) => group.some((id) => ids.includes(id));
  const coop = has(PLAYER_CATEGORY.coop);
  const pvp = has(PLAYER_CATEGORY.pvp);
  return { solo: has(PLAYER_CATEGORY.solo), coop, pvp };
}

/**
 * 구동 환경 — 덱 등급과 OS 네이티브 지원. 응답에 platforms 자체가 없으면 전부 undefined 라
 * 기존 값을 덮지 않는다(§7). "모름"(0)도 마찬가지로 값을 만들지 않는다.
 */
function runtimeOf(item: StoreItem): Pick<StoreSnapshot, "deckCompat" | "nativeWindows" | "nativeMac" | "nativeLinux"> {
  const p = item.platforms;
  if (!p) return {};
  return {
    deckCompat: STEAM_DECK_COMPAT[p.steam_deck_compat_category ?? 0] ?? null,
    nativeWindows: p.windows ?? false,
    nativeMac: p.mac ?? false,
    // 스팀의 리눅스 칸 이름은 steamos_linux 다 — SteamOS 와 일반 리눅스를 가르지 않는다
    nativeLinux: p.steamos_linux ?? false,
  };
}

/**
 * 유저 점수 — 긍정 리뷰 비율. 리뷰가 0건이면 비율이 의미를 잃어 값을 주지 않는다
 * (출시 직후 1건짜리 100% 를 "만점" 으로 띄우지 않기 위해서다).
 */
function userScoreOf(item: StoreItem): StoreSnapshot["userScore"] {
  const summary = item.reviews?.summary_filtered;
  const count = summary?.review_count ?? 0;
  if (count <= 0 || summary?.percent_positive === undefined) return null;
  const value = ratioToScore(summary.percent_positive);
  return value === null ? null : { value, kind: "positive_ratio", count };
}

function isUsableItem(item: StoreItem): boolean {
  return item.appid !== undefined && item.success !== 0 && item.visible !== false && (item.item_type ?? 0) === 0;
}

/** GetItems 의 type 과 부모 신호로 레코드의 성격을 정한다. 순서의 근거는 호출부 주석에 있다 */
function steamContentType(type: number | undefined, parentAppid: string | null): "game" | "dlc" | "demo" | "music" | "software" {
  if (type === STEAM_APP_TYPE_DEMO) return "demo";
  if (type === STEAM_APP_TYPE_DLC || parentAppid !== null) return "dlc";
  if (type === STEAM_APP_TYPE_MUSIC) return "music";
  if (type === STEAM_APP_TYPE_SOFTWARE) return "software";
  return "game";
}

/**
 * GetItems 응답(koreana) + 선택적으로 english 응답 → appid별 StoreSnapshot.
 * appdetails(게임당 ko/en 2회) + GetItems(할인 시 1회) 를 100개당 2회로 줄이는 배치 경로.
 * 응답에 없거나 success=0 인 appid 는 Map 에서 빠진다 — 호출부가 그 건만 실패로 처리한다.
 */
export function parseStoreItems(rawKo: unknown, rawEn?: unknown): Map<string, StoreSnapshot> {
  const parsed = storeItemsSchema.safeParse(rawKo);
  if (!parsed.success) throw new AdapterError(`GetItems 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const enNames = new Map<string, string>();
  if (rawEn !== undefined) {
    const en = storeItemsSchema.safeParse(rawEn);
    if (en.success) {
      for (const it of en.data.response.store_items) {
        if (it.appid !== undefined && it.name) enNames.set(String(it.appid), it.name.trim());
      }
    }
  }

  const out = new Map<string, StoreSnapshot>();
  for (const item of parsed.data.response.store_items) {
    if (!isUsableItem(item)) continue;
    const appid = String(item.appid);
    const nameKo = item.name?.trim() ?? "";
    const titleEn = enNames.get(appid) || nameKo;
    if (!titleEn) continue; // 제목이 없으면 게임 마스터를 만들 수 없다
    const parent = item.related_items?.parent_appid;
    // 옛 앱은 부모 칸에 제 자신을 적어 온다(2026-09-26 실측: Call of Duty 2003(2620), Civilization IV(3900), Bloodlines(2600)).
    // 그걸 부모로 읽으면 본편이 dlc 로 굳는다 — 자기 자신은 부모가 아니다
    const parentAppid = parent === undefined || parent === 0 || String(parent) === appid ? null : String(parent);
    const discount = item.best_purchase_option?.active_discounts?.[0];
    const { listPrice, currentPrice, discountPct } = priceOf(item);
    const korean = steamItemKorean(item.supported_languages);
    out.set(appid, {
      platform: "steam",
      storeExternalId: appid,
      storeUrl: `${STEAM_STORE_APP_URL}/${appid}`,
      listPrice,
      currentPrice,
      discountPct,
      discountEndsAt: discount?.discount_end_date ? new Date(discount.discount_end_date * 1000).toISOString() : null,
      discountName: steamDiscountLabel(discount?.discount_description),
      currentVersion: null,
      releaseDate: unixToIsoDate(item.release?.steam_release_date),
      // 두 신호를 모두 본다 — appdetails 경로와 같은 규칙이다(type 이 게임인데 본편만 가리키는 확장팩이 있다).
      // 체험판은 부모를 가리켜도 DLC 가 아니라 체험판이라 먼저 가른다. 사운드트랙은 그 반대다 —
      // 부모가 있으면 그 게임의 추가 콘텐츠로 서는 편이 맞고, 부모가 없을 때만 독립 상품이다
      contentType: steamContentType(item.type, parentAppid),
      parentExternalId: parentAppid,
      userScore: userScoreOf(item),
      ...runtimeOf(item),
      koText: korean?.text,
      koVoice: korean?.voice,
      // 본편의 DLC 목록은 GetItems 가 주지 않는다. 목록이 필요하면 appdetails 경로(fetch)를 써야 한다
      meta: {
        titleEn,
        titleKo: nameKo && nameKo !== titleEn ? nameKo : null,
        description: item.basic_info?.short_description?.trim() || null,
        coverUrl: steamAssetUrl(item.assets),
        portraitUrl: steamAssetUrl(item.assets, "library_capsule"),
        developer: item.basic_info?.developers?.[0]?.name ?? null,
        publisher: item.basic_info?.publishers?.[0]?.name ?? null,
        genres: item.tagids.map((id) => STEAM_GENRE_TAG_IDS[id]).filter((g): g is string => Boolean(g)),
        multiplayer: multiplayerOf(item),
      },
    });
  }
  return out;
}

/** storesearch 응답 → 검색 후보 (앱만, 번들/DLC 제외 불가 — type 필드가 "app"인 것만) */
