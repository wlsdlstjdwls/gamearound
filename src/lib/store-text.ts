// 스토어가 준 제목, 소개글을 화면에 올릴 꼴로 다듬는 순수 함수.
//
// 매칭 키(lib/slug normalizeTitle)와는 따로 둔다. 저쪽은 비교용으로 에디션, 구두점까지 지우지만
// 여기는 사람이 읽는 이름이라 "상품 표기"만 걷는다 — 상표 기호, 기기 꼬리, 지원 언어 괄호.
// 수집 단계(sync/game-writer)에서 한 번 거친다. 화면 20여 곳이 titleKo ?? titleEn 을 그대로 읽어서
// 화면마다 거르면 한 곳은 반드시 빠진다.

/** 상표 기호. 정식 표기에 들어 있지만 목록에서 읽기만 방해한다(2026-10-27 실측 2,763건 중 238건) */
const TRADEMARKS = /[™®©]/g;

/** "PS4™ & PS5®", "PS4 및 PS5", "PS5" 같은 기기 표기. 같은 게임이 기기마다 따로 줄을 갖는 화면이라 이름에 기기를 둘 이유가 없다 */
const PS_PLATFORMS = String.raw`PS[45](?:\s*(?:&|및|and|/)\s*PS[45])?`;
/** 제목 끝 기기 꼬리: "Sniper Elite 5 PS4 & PS5" */
const PLATFORM_TAIL = new RegExp(String.raw`\s*[-:]?\s*\(?${PS_PLATFORMS}(?:\s*(?:버전|Version))?\)?\s*$`, "i");
/** 제목 앞 기기 머리: "PS4 및 PS5용 EA SPORTS FC" */
const PLATFORM_HEAD = new RegExp(String.raw`^${PS_PLATFORMS}\s*용\s+`, "i");

/**
 * 지원 언어 괄호. PS 한국 스토어가 "(영어판/일어판)", "(중국어(간체자), 한국어)" 를 제목에 붙인다.
 * 끝 괄호는 어댑터(psstore/language)가 이미 떼지만 "Dead by Daylight (영어판/일어판) PS4 & PS5" 처럼
 * 기기 꼬리 앞에 끼면 남았다. 칸이 전부 언어 이름일 때만 뗀다 — "(디럭스판)", "(게임)" 은 이름의 일부다.
 */
const PAREN = /\s*\(((?:[^()]|\([^()]*\))*)\)/g;
const LANGUAGE_ITEM = /^[가-힣]+어(?:판)?(?:\([^()]*\))?$/;

function isLanguageList(inner: string): boolean {
  const items = inner.split(/\s*[,/]\s*/).filter(Boolean);
  return items.length > 0 && items.every((s) => LANGUAGE_ITEM.test(s));
}

/** 화면에 올릴 제목. 다 걷고 빈 문자열이 되면 원래 값을 돌려준다(이름을 잃느니 기호가 낫다) */
export function cleanStoreTitle(title: string): string;
export function cleanStoreTitle(title: string | null | undefined): string | null | undefined;
export function cleanStoreTitle(title: string | null | undefined): string | null | undefined {
  if (!title) return title;
  const cleaned = title
    .replace(TRADEMARKS, "")
    .replace(PAREN, (whole, inner: string) => (isLanguageList(inner) ? "" : whole))
    .replace(PLATFORM_HEAD, "")
    .replace(PLATFORM_TAIL, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || title.trim();
}

/** 한글이 하나도 없고 한자, 가나가 이만큼 넘으면 중국어, 일본어 원문으로 본다. 영어 원문은 읽을 수 있어 남긴다 */
const CJK_CHARS = /[぀-ヿ一-鿿]/g;
const CJK_MIN_SHARE = 0.3;

/**
 * 화면에 올릴 소개글. 한국 스토어인데도 번체 중국어 소개를 주는 상품이 있다
 * (콜 오브 듀티 콘셉트, 2026-10-27 확인). 못 읽는 글을 보여 주느니 비워 두고 다른 스토어 값을 기다린다.
 */
export function usableDescription(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  if (/[가-힣]/.test(text)) return text;
  const cjk = text.match(CJK_CHARS)?.length ?? 0;
  return cjk / text.length >= CJK_MIN_SHARE ? null : text;
}
