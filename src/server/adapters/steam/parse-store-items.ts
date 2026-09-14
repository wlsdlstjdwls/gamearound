// GetItems 응답 파서 — 배치 조회 경로. 가격, 할인 기간, 에셋, 멀티플레이 추론이 여기서 나온다.
import { AdapterError, type StoreSnapshot } from "../types";
import { storeItemsSchema, type StoreItem } from "./schemas";
import { PLAYER_CATEGORY, STEAM_APP_TYPE_DLC, STEAM_ASSET_BASE_URL, STEAM_GENRE_TAG_IDS, STEAM_STORE_APP_URL } from "./constants";
import { steamDiscountLabel } from "./parse-discount";

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

function isUsableItem(item: StoreItem): boolean {
  return item.appid !== undefined && item.success !== 0 && item.visible !== false && (item.item_type ?? 0) === 0;
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
    const parentAppid = parent === undefined || parent === 0 ? null : String(parent);
    const discount = item.best_purchase_option?.active_discounts?.[0];
    const { listPrice, currentPrice, discountPct } = priceOf(item);
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
      // 두 신호를 모두 본다 — appdetails 경로와 같은 규칙이다(type 이 게임인데 본편만 가리키는 확장팩이 있다)
      contentType: item.type === STEAM_APP_TYPE_DLC || parentAppid !== null ? "dlc" : "game",
      parentExternalId: parentAppid,
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
