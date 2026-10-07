// PlayStation 검색 응답 파서. 검색은 매칭 단계에서만 쓰여 parse.ts(발견, 수집)와 떼어 둔다.
import { z } from "zod";
import { PSSTORE_FULL_GAME_CLASSIFICATION, PSSTORE_PORTRAIT_ROLE, PSSTORE_PORTRAIT_WIDTH } from "./constants";
import { psstoreCleanTitle } from "./language";
import { mediaSchema, psstoreCoverUrl, psstoreImageUrl, psstoreFail } from "./parse";

const searchSchema = z.object({
  data: z.object({
    universalSearch: z.object({
      results: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().nullish(),
            storeDisplayClassification: z.string().nullish(),
            media: z.array(mediaSchema).nullish(),
          }),
        )
        .nullish(),
    }),
  }),
});

export interface PsstoreSearchHit {
  productId: string;
  title: string | null;
  /** 본편 상품(FULL_GAME)일 때만 채운다. DLC 상품의 그림을 본편 콘셉트에 얹지 않으려고 */
  coverUrl: string | null;
  portraitUrl: string | null;
}

/**
 * 검색 응답 → 상품 id 목록. 콘셉트 id 는 여기 없어 상세를 한 번 더 봐야 한다.
 * 그림은 여기서 들고 간다 — 콘셉트, 상품 상세 어디에도 이미지가 없어서, 매칭으로 붙은 콘셉트는
 * 이걸 버리면 커버가 영영 빈다(2026-10-07 실측: 승격한 PS 본편 13건이 그래서 목록에 없었다).
 */
export function parsePsstoreSearch(raw: unknown): PsstoreSearchHit[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) psstoreFail("검색", parsed.error);
  return (parsed.data!.data.universalSearch.results ?? []).map((r) => {
    const fullGame = r.storeDisplayClassification === PSSTORE_FULL_GAME_CLASSIFICATION;
    return {
      productId: r.id,
      title: psstoreCleanTitle(r.name),
      coverUrl: fullGame ? psstoreCoverUrl(r.media) : null,
      portraitUrl: fullGame ? psstoreImageUrl(r.media, PSSTORE_PORTRAIT_ROLE, PSSTORE_PORTRAIT_WIDTH) : null,
    };
  });
}
