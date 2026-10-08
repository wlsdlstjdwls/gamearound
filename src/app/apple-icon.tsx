/* eslint-disable @next/next/no-img-element -- ImageResponse(satori)는 next/image 를 쓰지 못한다. 여기 <img> 는 화면이 아니라 PNG 안으로 들어간다 */
// iOS 홈 화면 아이콘. 투명을 지원하지 않아 보라 판(tile)에 흰 손전등을 얹는다.
// iOS 가 모서리를 알아서 깎으므로 여기서 라운드를 주지 않는다 — 주면 이중으로 깎여 테두리가 남는다.
import { ImageResponse } from "next/og";
import { brandSymbolDataUri, MASKABLE_SAFE_RATIO } from "@/lib/brand";

/** Apple 권장 크기 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <img
        width={size.width}
        height={size.height}
        src={brandSymbolDataUri({
          variant: "tile",
          radius: 0,
          inset: MASKABLE_SAFE_RATIO,
          size: size.width,
        })}
        alt=""
      />
    ),
    size,
  );
}
