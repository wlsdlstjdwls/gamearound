// 일본 eShop 카탈로그 검색(JSON) 파서. 한국 스토어와 달리 목록 한 번에 게임 마스터까지 다 온다.
//
// 그래서 일본 어댑터에는 단건 조회 경로가 없다 — nsuid 로 되묻는 질의가 막혀 있어서
// (id_s, nsuid, q= 전부 0건. 2026-09-14 실측) 신규 게임의 근거는 이 목록이 유일하다.
// StoreAdapter.batchPricesOnly 가 "discovery" 인 이유가 이것이다.
import { z } from "zod";
import type { SearchCandidate } from "../types";
import { JP_HARD_PLATFORM, jpImageUrl, jpProductUrl } from "./constants";

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  icode: z.string().nullish(),
  hard: z.string().nullish(),
  pdate: z.string().nullish(),
  maker: z.string().nullish(),
  genre: z.array(z.string()).nullish(),
  player: z.array(z.string()).nullish(),
  // 인터넷 통신 인원. player 와 같은 "2-12" 꼴이다(2026-10-06 실측, 마리오 카트 8 디럭스). 로컬 통신(lplayer)은
  // 본체 여러 대를 잇는 방식이라 담지 않는다(한국 스토어와 같은 기준, NINTENDO_SELECTORS.playersOnline)
  // 표본이 적어 배열인지 문자열 하나인지 못 박지 못했다 — 둘 다 받는다
  nplayer: z.union([z.array(z.string()), z.string()]).nullish(),
  iurl: z.string().nullish(),
});

export const jpSearchSchema = z.object({
  result: z.object({
    total: z.number(),
    items: z.array(itemSchema),
  }),
});

/**
 * 일본 제목에서 우리 카탈로그와 맞춰 볼 이름을 뽑는다.
 *   "Hollow Knight（ホロウナイト）– Nintendo Switch 2" → "Hollow Knight"
 * 서양 게임은 일본 스토어도 원제를 앞에 두고 가나를 괄호로 덧붙인다. 그 덧붙임과 기기 표기를 떼면
 * 기존 영문 제목과 유사도가 나온다. 가타카나만 있는 제목은 뗄 것이 없어 그대로 둔다 —
 * 그런 건 제목으로 못 맞추고 작품 코드(icode)가 맡는다.
 */
export function cleanJpTitle(raw: string): string {
  const withoutHardware = raw.replace(/\s*[-–—]\s*Nintendo\s*Switch\s*2?\s*(?:Edition)?\s*$/i, "");
  const withoutKana = withoutHardware.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, (m) => (/[a-z]/i.test(m) ? m : ""));
  const cleaned = withoutKana.replace(/\s+/g, " ").trim();
  // 괄호를 떼고 나니 라틴 문자가 남지 않으면 원래 제목이 더 낫다(전부 일본어인 제목)
  return cleaned.length > 0 ? cleaned : withoutHardware.trim();
}

/** "2026-09-10 00:00:00" → "2026-09-10". 값이 이상하면 null */
export function parseJpDate(raw: string | null | undefined): string | null {
  const m = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** "1" 또는 "1-4" 같은 표기들 중 최대 인원 */
export function parseJpPlayers(values: string[] | null | undefined): number | null {
  if (!values || values.length === 0) return null;
  const nums = values.flatMap((v) => (v.match(/\d+/g) ?? []).map(Number)).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? Math.max(...nums) : null;
}

/**
 * 검색 응답 → 발견 후보. 스위치 본편이 아닌 항목(3DS, Wii U)은 질의로 이미 걸러지지만,
 * hard 를 못 읽는 항목은 여기서도 버린다 — 어느 기기 행으로 넣을지 모르는 값이다.
 */
export function parseJpSearch(raw: unknown): SearchCandidate[] {
  const { result } = jpSearchSchema.parse(raw);
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const item of result.items) {
    const platform = item.hard ? JP_HARD_PLATFORM[item.hard] : undefined;
    if (!platform || seen.has(item.id)) continue;
    seen.add(item.id);
    const players = parseJpPlayers(item.player);
    const playersOnline = parseJpPlayers(typeof item.nplayer === "string" ? [item.nplayer] : item.nplayer);
    out.push({
      externalId: item.id,
      title: cleanJpTitle(item.title),
      url: jpProductUrl(item.id),
      titleCode: item.icode ?? null,
      platform,
      releaseDate: parseJpDate(item.pdate),
      coverUrl: item.iurl ? jpImageUrl(item.iurl) : null,
      meta: {
        // 일본어 제목은 slugify 가 걸러 내 slug 가 "game-<nsuid>" 가 된다(lib/slug).
        // 읽을 수 있는 slug 를 만들려면 로마자 표기가 필요한데 검색 응답에 없다 — 지금은 감수한다.
        titleEn: cleanJpTitle(item.title),
        titleKo: null,
        coverUrl: item.iurl ? jpImageUrl(item.iurl) : null,
        publisher: item.maker ?? null,
        genres: item.genre ?? [],
        // 협동 여부는 어림하지 않는다(parse-kr 의 같은 자리 주석)
        multiplayer: players || playersOnline ? { localMax: players ?? undefined, onlineMax: playersOnline ?? undefined, solo: true } : undefined,
      },
    });
  }
  return out;
}
