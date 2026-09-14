/* eslint-disable @next/next/no-img-element -- ImageResponse(satori)는 next/image 를 쓰지 못한다. 여기 <img> 는 화면이 아니라 PNG 안으로 들어간다 */
// 파비콘. 16, 32 두 벌을 낸다 — 16px 에서는 방향키와 버튼 4개가 한 덩어리로 뭉쳐서
// 그 크기 전용 축약형(점 두 개)을 따로 그린다. 색도 16px 에서만 채도를 올린다(lib/brand.ts 참조).
// favicon.ico 는 이 라우트를 못 읽는 구형 브라우저 몫이고, scripts/generate-icons.ts 가 같은 소스로 만든다.
import { ImageResponse } from "next/og";
import { BRAND_COLOR, brandSymbolDataUri, type BrandSymbolVariant } from "@/lib/brand";

export const contentType = "image/png";

type IconSpec = { id: string; size: number; variant: BrandSymbolVariant; accent: string };

const ICONS: readonly IconSpec[] = [
  { id: "16", size: 16, variant: "mini", accent: BRAND_COLOR.accentMicro },
  { id: "32", size: 32, variant: "full", accent: BRAND_COLOR.accent },
];

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType,
  }));
}

export default function Icon({ id }: { id: string }) {
  const spec = ICONS.find((icon) => icon.id === id) ?? ICONS[ICONS.length - 1];
  return new ImageResponse(
    (
      <img
        width={spec.size}
        height={spec.size}
        src={brandSymbolDataUri({ variant: spec.variant, accent: spec.accent, size: spec.size })}
        alt=""
      />
    ),
    { width: spec.size, height: spec.size },
  );
}
