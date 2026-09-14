/* eslint-disable @next/next/no-img-element -- ImageResponse(satori)는 next/image 를 쓰지 못한다. 여기 <img> 는 화면이 아니라 PNG 안으로 들어간다 */
// 게임 상세 전용 SNS 공유 이미지.
// 커버만 보내면 "이 게임 페이지" 라는 사실밖에 전달되지 않는다. 공유의 이유는 대개 가격이므로
// 최저가, 원가, 할인율을 썸네일 안에서 읽히게 박는다. 가격이 바뀌면 이미지도 따라 바뀐다.
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { BRAND_COLOR, brandSymbolDataUri } from "@/lib/brand";
import { formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { loadOgFonts } from "@/lib/og/font";
import { loadOgImage } from "@/lib/og/image";
import { OG_CONTENT_TYPE, OG_FONT_FAMILY, OG_PADDING, OG_SIZE } from "@/lib/og/constants";
import { SITE } from "@/lib/site";
import { bestScore, cheapestPlatform, displayTitle, getGameBySlugCached } from "@/server/services/games";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** 커버 자리. 3:4 비율은 상세 화면의 커버와 같다 */
const COVER = { width: 300, height: 400 } as const;
const SYMBOL_SIZE = 34;

export const alt = `${SITE.name} 최저가`;

type Props = { params: Promise<{ slug: string }> };

export default async function GameOpengraphImage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  const title = displayTitle(game);
  const best = cheapestPlatform(game.platforms);
  const score = bestScore(game.platforms);

  const price = best ? formatKrw(best.currentPrice) : "가격 정보 없음";
  const listPrice = best && best.discountPct && best.listPrice ? formatKrw(best.listPrice) : null;
  const discount = best ? formatDiscount(best.discountPct) : "";
  const meta = [
    best ? `${PLATFORM_LABEL[best.platform] ?? best.platform} 최저가` : null,
    score ? `평점 ${score.value}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const cover = await loadOgImage(game.coverUrl);
  const fonts = await loadOgFonts(SITE.name, title, price, listPrice, discount, meta);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          background: BRAND_COLOR.bg,
          color: BRAND_COLOR.ink,
          padding: `${OG_PADDING.y}px ${OG_PADDING.x}px`,
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        {cover ? (
          <img
            width={COVER.width}
            height={COVER.height}
            src={cover}
            alt=""
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: COVER.width,
              height: COVER.height,
              display: "flex",
              borderRadius: 12,
              background: BRAND_COLOR.line,
            }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.035em" }}>
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 26 }}>
            <span style={{ fontSize: 78, fontWeight: 700, letterSpacing: "-0.035em", color: BRAND_COLOR.accent }}>
              {price}
            </span>
            {listPrice && (
              <span style={{ fontSize: 28, fontWeight: 500, color: BRAND_COLOR.faint, textDecoration: "line-through" }}>
                {listPrice}
              </span>
            )}
            {discount && (
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: BRAND_COLOR.bg,
                  background: BRAND_COLOR.accent,
                  borderRadius: 9,
                  padding: "7px 15px",
                }}
              >
                {discount}
              </span>
            )}
          </div>

          {meta && (
            <div style={{ display: "flex", fontSize: 25, fontWeight: 500, marginTop: 20, color: BRAND_COLOR.muted }}>
              {meta}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 40 }}>
            <img width={SYMBOL_SIZE} height={SYMBOL_SIZE} src={brandSymbolDataUri({ size: SYMBOL_SIZE })} alt="" />
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.035em" }}>{SITE.name}</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
