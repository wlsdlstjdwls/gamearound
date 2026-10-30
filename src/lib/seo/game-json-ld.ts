// 게임 상세의 구조화 데이터(schema.org VideoGame + AggregateOffer).
//
// 가격은 한국 행, 기준 통화(원화) 값만 싣는다. 외화 행을 섞으면 lowPrice 가 "6.99" 처럼 원화 단위로 읽혀
// 검색 결과에 7원짜리 게임이 뜬다 — 화면이 최저가를 고르는 규칙(sameCurrency)과 같은 이유다.
// 값이 하나도 없으면 offers 를 아예 빼고 게임 정보만 낸다. 빈 offers 는 구글 검사에서 오류로 잡힌다.
import { DISPLAY_CURRENCY, priceDecimal } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import type { Currency, Platform, Region } from "@/server/db/schema";

/** 한국 행 — 화면 가격 비교와 같은 기준 지역 */
const JSON_LD_REGION: Region = "KR";

export type GameJsonLdInput = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  releaseDate: string | null;
  genres: readonly string[];
  developer: string | null;
  publisher: string | null;
  platforms: readonly { platform: Platform; region: Region; currentPrice: number | null; currency: Currency }[];
};

export function buildGameJsonLd(g: GameJsonLdInput): Record<string, unknown> {
  const priced = g.platforms.filter((p) => p.region === JSON_LD_REGION && p.currency === DISPLAY_CURRENCY && p.currentPrice !== null);
  const prices = priced.map((p) => p.currentPrice as number);
  const gamePlatform = [...new Set(g.platforms.map((p) => PLATFORM_LABEL[p.platform] ?? p.platform))];
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: g.title,
    url: g.url,
    ...(g.description ? { description: g.description } : {}),
    ...(g.image ? { image: g.image } : {}),
    ...(g.releaseDate ? { datePublished: g.releaseDate.slice(0, 10) } : {}),
    ...(g.genres.length > 0 ? { genre: [...g.genres] } : {}),
    ...(g.developer ? { author: { "@type": "Organization", name: g.developer } } : {}),
    ...(g.publisher ? { publisher: { "@type": "Organization", name: g.publisher } } : {}),
    ...(gamePlatform.length > 0 ? { gamePlatform } : {}),
    ...(prices.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: DISPLAY_CURRENCY,
            lowPrice: priceDecimal(Math.min(...prices), DISPLAY_CURRENCY),
            highPrice: priceDecimal(Math.max(...prices), DISPLAY_CURRENCY),
            offerCount: prices.length,
          },
        }
      : {}),
  };
}

/** <script type="application/ld+json"> 본문. "<" 를 풀어 두지 않으면 제목에 든 "</script>" 가 태그를 닫는다(Next JSON-LD 안내) */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
