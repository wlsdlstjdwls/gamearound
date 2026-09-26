// 올리기 전 사진 줄이기 — 브라우저 전용(canvas). 서버에서 부르면 안 된다.
//
// 휴대폰 원본(4000px 대, 3~8MB)을 그대로 올리면 매장 와이파이에서 한 장에 수 초가 걸리고 손님 화면도 무겁다.
// 긴 변을 PHOTO_MAX_EDGE 로 맞추고 webp 로 굽는다. 구형 사파리는 canvas 가 webp 를 못 구워 png 를 내놓는데,
// 그러면 jpeg 로 다시 굽는다(png 는 사진에서 몇 배 크다).
//
// createImageBitmap 의 imageOrientation 을 쓰는 이유: 휴대폰 사진은 픽셀은 눕혀 두고 EXIF 로 세운다.
// 그 값을 안 따르면 세로로 찍은 카트리지가 누워서 올라간다.
import { PHOTO_MAX_EDGE, PHOTO_QUALITY } from "./constants";
import { fitWithin } from "./photo";

export type ResizedPhoto = { blob: Blob; width: number; height: number; ext: "webp" | "jpg" };

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
}

export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, width, height, ext: "webp" };
  const jpeg = await toBlob(canvas, "image/jpeg");
  if (!jpeg) throw new Error("encode");
  return { blob: jpeg, width, height, ext: "jpg" };
}
