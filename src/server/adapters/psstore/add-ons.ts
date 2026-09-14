// 콘셉트 페이지 HTML 에서 추가 콘텐츠(DLC) 상품 id 를 걷어낸다.
//
// parse.ts 와 나눠 둔 이유: 저쪽은 GraphQL JSON 을 zod 로 읽고, 여기는 서버 렌더링된 HTML 안에 박힌
// Apollo 캐시를 읽는다. 깨지는 방식도 다르다 — 저쪽은 스키마가 바뀌면, 여기는 마크업이 바뀌면 깨진다.
// 경로와 모양의 근거는 constants.ts 의 "추가 콘텐츠(DLC) 목록" 주석에 있다.
import { AdapterError } from "../types";
import { PSSTORE_NON_DLC_CLASSIFICATIONS } from "./constants";

/** 애드온 구간을 여는 표지. 이 div 의 data-initial 이 같은 페이지 안 script 의 id 를 가리킨다 */
const ADD_ONS_MFE = 'data-mfe-name="addOns"';
const DATA_INITIAL = /data-initial="([^"]+)"/;

interface AddOnProduct {
  id?: unknown;
  storeDisplayClassification?: unknown;
}

/**
 * 애드온 구간의 JSON 을 꺼낸다. 없으면 null — "추가 콘텐츠가 없는 게임" 은 오류가 아니다.
 *
 * script 를 id 로 찾는다. "바로 앞의 script" 로 잡으면 마크업에 script 가 하나만 끼어들어도
 * 조용히 엉뚱한 블록을 읽는다 — 그때는 빈손이 되지 파싱 오류가 나지 않아서 알아채기 어렵다.
 */
function addOnsCache(html: string): Record<string, unknown> | null {
  const at = html.indexOf(ADD_ONS_MFE);
  if (at < 0) return null;

  const initial = DATA_INITIAL.exec(html.slice(at, at + 500))?.[1];
  if (!initial) return null;

  const idAt = html.indexOf(`id="${initial}"`);
  if (idAt < 0) return null;
  const open = html.indexOf(">", idAt);
  const close = html.indexOf("</script>", open);
  if (open < 0 || close < 0) return null;

  try {
    const parsed: unknown = JSON.parse(html.slice(open + 1, close));
    const cache = (parsed as { cache?: unknown })?.cache;
    return cache && typeof cache === "object" ? (cache as Record<string, unknown>) : null;
  } catch {
    // 마크업은 찾았는데 JSON 이 깨진 것은 스토어 변경 신호다. 조용히 빈손으로 두면
    // "DLC 없는 게임" 과 구분이 안 되고, 카탈로그 전체가 0건이 될 때까지 아무도 모른다.
    throw new AdapterError("PlayStation 추가 콘텐츠 JSON 파싱 실패 — 페이지 구조 변경 의심", "psstore", false);
  }
}

/**
 * 콘셉트 페이지 HTML → DLC 상품 id 목록.
 * 순서는 페이지에 온 순서를 지킨다(스토어가 정한 노출 순서). 상한은 호출부가 건다.
 */
export function parsePsstoreAddOnIds(html: string): string[] {
  const cache = addOnsCache(html);
  if (!cache) return [];

  const root = cache["ROOT_QUERY"] as Record<string, unknown> | undefined;
  // 질의 키에 인자가 통째로 박혀 있다(`addOnProductsRetrieve({"conceptId":...})`).
  // 인자를 그대로 조립해 맞추면 pageArgs 가 바뀔 때마다 깨지므로 접두사로 찾는다.
  const key = root && Object.keys(root).find((k) => k.startsWith("addOnProductsRetrieve"));
  const refs = key ? (root![key] as { addOnProducts?: Array<{ __ref?: unknown }> })?.addOnProducts : undefined;
  if (!Array.isArray(refs)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    if (typeof ref?.__ref !== "string") continue;
    const product = cache[ref.__ref] as AddOnProduct | undefined;
    const id = product?.id;
    if (typeof id !== "string" || !id) continue;
    const cls = product?.storeDisplayClassification;
    if (typeof cls === "string" && PSSTORE_NON_DLC_CLASSIFICATIONS.has(cls)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
