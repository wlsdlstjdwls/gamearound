/* eslint-disable @next/next/no-img-element -- ImageResponse(satori)는 next/image 를 쓰지 못한다. 여기 <img> 는 화면이 아니라 PNG 안으로 들어간다 */
// 기본 SNS 공유 이미지. 자기 opengraph-image 를 가지지 않은 모든 화면이 이걸 쓴다.
// 게임 상세만 가격이 박힌 전용 이미지를 따로 만든다(games/[slug]/opengraph-image.tsx).
import { ImageResponse } from "next/og";
import { BRAND_COLOR, brandSymbolDataUri } from "@/lib/brand";
import { PLATFORM_LABEL } from "@/lib/format";
import { loadOgFonts } from "@/lib/og/font";
import { OG_CONTENT_TYPE, OG_FONT_FAMILY, OG_PADDING, OG_SAFE_WIDTH, OG_SIZE } from "@/lib/og/constants";
import { SITE } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = SITE.description;

/** 어떤 플랫폼을 다루는지 한눈에 보이게 하는 칩. 대표 4개만 — 더 넣으면 줄이 넘친다 */
const CHIP_PLATFORMS = ["steam", "ps5", "xbox", "switch"] as const;

/** 워드마크 옆 심볼 크기 */
const SYMBOL_SIZE = 58;

export default async function OpengraphImage() {
  const chips = CHIP_PLATFORMS.map((key) => PLATFORM_LABEL[key]);
  const fonts = await loadOgFonts(SITE.name, SITE.headline, SITE.tagline, ...chips);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BRAND_COLOR.bg,
          color: BRAND_COLOR.ink,
          padding: `${OG_PADDING.y}px ${OG_PADDING.x}px`,
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img width={SYMBOL_SIZE} height={SYMBOL_SIZE} src={brandSymbolDataUri({ size: SYMBOL_SIZE })} alt="" />
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "0.03em" }}>{SITE.name}</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            maxWidth: OG_SAFE_WIDTH,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: "-0.035em",
          }}
        >
          {SITE.headline}
        </div>

        <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: BRAND_COLOR.muted, marginTop: 18 }}>
          {SITE.tagline}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
          {chips.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 500,
                color: BRAND_COLOR.ink,
                background: BRAND_COLOR.surface,
                border: `1px solid ${BRAND_COLOR.line}`,
                borderRadius: 10,
                padding: "9px 18px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
