import { describe, expect, it } from "vitest";
import { newsThumbnailSrc, normalizeThumbnailUrl, sniffImageType, thumbnailSignature, thumbnailSignatureMatches } from "./thumbnail";

const SECRET = "test-secret";
const URL_A = "https://cdn.example.com/a.jpg";
const URL_B = "https://cdn.example.com/b.jpg";

describe("thumbnailSignature", () => {
  it("같은 주소는 같은 서명, 다른 주소는 다른 서명", () => {
    expect(thumbnailSignature(URL_A, SECRET)).toBe(thumbnailSignature(URL_A, SECRET));
    expect(thumbnailSignature(URL_A, SECRET)).not.toBe(thumbnailSignature(URL_B, SECRET));
  });

  it("시크릿이 없으면 서명하지 않는다", () => {
    expect(thumbnailSignature(URL_A, undefined)).toBeNull();
  });
});

describe("thumbnailSignatureMatches", () => {
  it("제 주소의 서명만 통과한다", () => {
    const sig = thumbnailSignature(URL_A, SECRET);
    expect(thumbnailSignatureMatches(URL_A, sig, SECRET)).toBe(true);
    expect(thumbnailSignatureMatches(URL_B, sig, SECRET)).toBe(false);
  });

  it("서명이 없거나 시크릿이 없으면 막는다", () => {
    expect(thumbnailSignatureMatches(URL_A, null, SECRET)).toBe(false);
    expect(thumbnailSignatureMatches(URL_A, thumbnailSignature(URL_A, SECRET), undefined)).toBe(false);
  });
});

describe("newsThumbnailSrc", () => {
  it("서명이 가능하면 우리 출처의 주소를 준다", () => {
    const src = newsThumbnailSrc(URL_A, SECRET) ?? "";
    expect(src.startsWith("/api/news/thumbnail?")).toBe(true);
    const params = new URLSearchParams(src.split("?")[1]);
    expect(params.get("u")).toBe(URL_A);
    expect(thumbnailSignatureMatches(URL_A, params.get("s"), SECRET)).toBe(true);
  });

  it("서명할 수 없으면 원본 주소를 그대로 준다 — 막지 않는 매체가 대부분이다", () => {
    expect(newsThumbnailSrc(URL_A, undefined)).toBe(URL_A);
  });

  it("우리 쪽에서도 안 열리는 호스트는 그리지 않는다", () => {
    expect(newsThumbnailSrc("https://www.videogameschronicle.com/files/a.webp", SECRET)).toBeNull();
    expect(newsThumbnailSrc("https://images.nintendolife.com/a.jpg", SECRET)).toBeNull();
  });

  it("쓸 수 없는 주소도 그리지 않는다", () => {
    expect(newsThumbnailSrc("data:image/png;base64,AAAA", SECRET)).toBeNull();
  });
});

describe("normalizeThumbnailUrl", () => {
  it("프로토콜 없는 주소는 https 로 채운다 — 루리웹 썸네일이 이 형태다", () => {
    expect(normalizeThumbnailUrl("//img.ruliweb.com/a.webp")).toBe("https://img.ruliweb.com/a.webp");
  });

  it("http, https 가 아니면 쓰지 않는다", () => {
    expect(normalizeThumbnailUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(normalizeThumbnailUrl("그냥 문자열")).toBeNull();
  });
});

describe("sniffImageType", () => {
  const bytes = (...v: number[]) => new Uint8Array([...v, ...new Array(16).fill(0)]).buffer;

  it("앞머리로 그림 형식을 알아낸다", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBe("image/gif");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66))).toBe("image/avif");
  });

  it("그림이 아니면 null — 우리 출처로 HTML 을 배달하지 않는다", () => {
    expect(sniffImageType(new TextEncoder().encode("<!doctype html>").buffer as ArrayBuffer)).toBeNull();
  });
});

describe("newsThumbnailSrc 정규화", () => {
  it("프로토콜 없는 주소도 우리 출처로 바꾼다", () => {
    const src = newsThumbnailSrc("//img.ruliweb.com/a.webp", SECRET) ?? "";
    const params = new URLSearchParams(src.split("?")[1]);
    expect(params.get("u")).toBe("https://img.ruliweb.com/a.webp");
  });
});
