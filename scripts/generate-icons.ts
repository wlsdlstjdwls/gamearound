// 정적 아이콘 파일 생성 — 심볼을 고쳤을 때 한 번 돌린다.
//   pnpm icons
//
// app/icon.tsx, app/apple-icon.tsx 는 Next 가 알아서 만들어 주지만 두 자리는 실제 파일이어야 한다:
//   - favicon.ico : /favicon.ico 를 직접 찾아가는 구형 브라우저, RSS 리더, 일부 크롤러 몫
//   - public/icon-*.png : manifest 와 Service Worker 푸시 알림이 URL 로 참조한다(번들 밖이라 import 불가)
// 어느 쪽도 lib/brand.ts 와 같은 좌표를 쓰므로, 심볼을 고치면 여기서 다시 뽑아야 한다.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLOR, brandSymbolDataUri, MASKABLE_SAFE_RATIO, type BrandSymbolVariant } from "@/lib/brand";

type IconSpec = {
  size: number;
  variant: BrandSymbolVariant;
  accent: string;
  /** 없으면 투명 배경 */
  background?: string;
  /** 배경 대비 심볼 비율 */
  inset?: number;
};

/** 파비콘: 16 은 축약형 + 채도 보정, 32 는 정식 */
const FAVICON_SPECS: readonly IconSpec[] = [
  { size: 16, variant: "mini", accent: BRAND_COLOR.accentMicro },
  { size: 32, variant: "full", accent: BRAND_COLOR.accent },
];

/** PWA, 푸시 알림용. 홈 화면에 놓이므로 투명이 아니라 잉크 배경을 깐다 */
const PWA_ICONS: readonly (IconSpec & { file: string })[] = [
  { file: "icon-192.png", size: 192, variant: "full", accent: BRAND_COLOR.accentOnInk, background: BRAND_COLOR.ink },
  { file: "icon-512.png", size: 512, variant: "full", accent: BRAND_COLOR.accentOnInk, background: BRAND_COLOR.ink },
  {
    file: "icon-maskable-512.png",
    size: 512,
    variant: "full",
    accent: BRAND_COLOR.accentOnInk,
    background: BRAND_COLOR.ink,
    inset: MASKABLE_SAFE_RATIO,
  },
];

async function renderPng({ size, variant, accent, background, inset }: IconSpec): Promise<Buffer> {
  const src = brandSymbolDataUri({
    variant,
    accent,
    background,
    inset,
    size,
    body: background ? BRAND_COLOR.bg : BRAND_COLOR.ink,
  });
  // JSX 없이 엘리먼트 모양만 넘긴다 — 이 스크립트를 위해 파일 확장자를 .tsx 로 바꿀 이유가 없다.
  const element = { type: "img", props: { width: size, height: size, src } } as never;
  const response = new ImageResponse(element, { width: size, height: size });
  return Buffer.from(await response.arrayBuffer());
}

/** ICO 컨테이너 바이트 수 */
const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

/**
 * PNG 여러 장을 ICO 하나로 묶는다.
 * ICO 는 원래 BMP 컨테이너지만 Vista 이후 PNG 를 그대로 품을 수 있어서, 다시 인코딩하지 않는다.
 */
function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(ICO_HEADER_BYTES);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = ICO_HEADER_BYTES + ICO_ENTRY_BYTES * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(ICO_ENTRY_BYTES);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 256 은 0 으로 적는 게 규격이다
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // 팔레트 없음
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  const root = process.cwd();

  const favicons = await Promise.all(
    FAVICON_SPECS.map(async (spec) => ({ size: spec.size, png: await renderPng(spec) })),
  );
  const icoPath = path.join(root, "src", "app", "favicon.ico");
  await writeFile(icoPath, packIco(favicons));
  console.log(`favicon.ico (${FAVICON_SPECS.map((s) => s.size).join(", ")})`);

  for (const icon of PWA_ICONS) {
    const png = await renderPng(icon);
    await writeFile(path.join(root, "public", icon.file), png);
    console.log(`${icon.file} (${png.length.toLocaleString()} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
