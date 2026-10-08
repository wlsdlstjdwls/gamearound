/* eslint-disable @next/next/no-img-element -- ImageResponse(satori)는 next/image 를 쓰지 못한다. 여기 <img> 는 화면이 아니라 PNG 안으로 들어간다 */
// 파비콘. 16, 32 두 벌을 낸다 — 둘 다 보라 판(tile)이다. 투명 바탕의 도트 손전등은 탭 바탕색에 묻힌다.
// 크기별로 따로 그린 축약형은 없다: 12칸 격자라 16px 에서도 칸이 한 픽셀 남짓으로 살아남는다.
// favicon.ico 는 이 라우트를 못 읽는 구형 브라우저 몫이고, scripts/generate-icons.ts 가 같은 소스로 만든다.
import { ImageResponse } from "next/og";
import { brandSymbolDataUri } from "@/lib/brand";

export const contentType = "image/png";

type IconSpec = { id: string; size: number };

const ICONS: readonly IconSpec[] = [
  { id: "16", size: 16 },
  { id: "32", size: 32 },
];

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType,
  }));
}

// id 는 **Promise** 다(Next 16 breaking change — 문서: 02-guides/upgrading/version-16.md 의
// "Async parameters for icon, and open-graph Image"). 15 까지는 문자열이었다.
// 문자열로 알고 비교하면 find 가 영영 못 찾고 뒤의 기본값만 나간다 — 그래서 /icon/16 과 /icon/32 가
// **같은 32px 파일**이었다(2026-09-23 실측: md5 동일).
// 조용히 죽는 자리다. 500 이 안 뜨고 200 으로 엉뚱한 크기가 나간다.
export default async function Icon({ id }: { id: Promise<string> }) {
  const key = await id;
  const spec = ICONS.find((icon) => icon.id === key) ?? ICONS[ICONS.length - 1];
  return new ImageResponse(
    (
      <img
        width={spec.size}
        height={spec.size}
        src={brandSymbolDataUri({ variant: "tile", size: spec.size })}
        alt=""
      />
    ),
    { width: spec.size, height: spec.size },
  );
}
