import { describe, expect, it } from "vitest";
import { formatFileSize, isPostMediaPath, isPostMediaUrl, postFileType } from "@/lib/community/media";

describe("postFileType", () => {
  it("확장자로 형식을 정한다", () => {
    expect(postFileType("공략.PDF")?.contentType).toBe("application/pdf");
    expect(postFileType("save.zip")?.ext).toBe("zip");
  });
  it("실행 파일, 확장자 없는 파일은 받지 않는다", () => {
    expect(postFileType("setup.exe")).toBeNull();
    expect(postFileType("README")).toBeNull();
  });
});

describe("isPostMediaPath", () => {
  it("접두 바로 아래 파일만 허락한다", () => {
    expect(isPostMediaPath("posts/a.webp")).toBe(true);
    expect(isPostMediaPath("posts/x/a.webp")).toBe(false);
    expect(isPostMediaPath("posts/../shops/a.webp")).toBe(false);
    expect(isPostMediaPath("shops/a.webp")).toBe(false);
  });
});

describe("isPostMediaUrl", () => {
  it("우리 Blob 의 posts 경로만 참이다", () => {
    expect(isPostMediaUrl("https://k.public.blob.vercel-storage.com/posts/a.webp")).toBe(true);
    expect(isPostMediaUrl("https://k.public.blob.vercel-storage.com/shops/a.webp")).toBe(false);
    expect(isPostMediaUrl("https://evil.com.public.blob.vercel-storage.com.evil.com/posts/a.webp")).toBe(false);
    expect(isPostMediaUrl("not a url")).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("단위를 붙인다", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3.4 * 1024 * 1024)).toBe("3.4 MB");
    expect(formatFileSize(20 * 1024 * 1024)).toBe("20MB");
  });
});
