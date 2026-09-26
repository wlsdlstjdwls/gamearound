// 판매 줄 사진 규칙 테스트 — 순수 함수만(AGENTS §8).
import { describe, expect, it } from "vitest";
import { fitWithin, isOwnPhotoPath, photoPathPrefix, photoUploadPayloadSchema } from "./photo";

const SHOP = "0f8fad5b-d9cb-469f-a165-70867728950e";
const LISTING = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OTHER = "16fd2706-8baf-433b-82eb-8c7fada847da";

describe("isOwnPhotoPath", () => {
  it("이 매장, 이 판매 줄 아래의 파일 하나면 통과한다", () => {
    expect(isOwnPhotoPath(`${photoPathPrefix(SHOP, LISTING)}a1b2.webp`, SHOP, LISTING)).toBe(true);
  });

  it("다른 판매 줄, 다른 매장은 막는다", () => {
    expect(isOwnPhotoPath(`${photoPathPrefix(SHOP, OTHER)}a.webp`, SHOP, LISTING)).toBe(false);
    expect(isOwnPhotoPath(`${photoPathPrefix(OTHER, LISTING)}a.webp`, SHOP, LISTING)).toBe(false);
  });

  it("접두만 있거나 하위 폴더, .. 는 막는다", () => {
    const p = photoPathPrefix(SHOP, LISTING);
    expect(isOwnPhotoPath(p, SHOP, LISTING)).toBe(false);
    expect(isOwnPhotoPath(`${p}x/a.webp`, SHOP, LISTING)).toBe(false);
    expect(isOwnPhotoPath(`${p}..a.webp`, SHOP, LISTING)).toBe(false);
  });
});

describe("fitWithin", () => {
  it("긴 변을 맞춰 비율대로 줄인다", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("작은 사진은 키우지 않는다", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("photoUploadPayloadSchema", () => {
  it("판매 줄 id 가 uuid 가 아니면 거절한다", () => {
    expect(photoUploadPayloadSchema.safeParse({ shopSlug: "a", listingId: "x" }).success).toBe(false);
  });
});
