import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_CONTENT_TYPES,
  attachmentPathPrefix,
  attachmentType,
  formatBytes,
  isImageType,
  isOwnAttachmentPath,
} from "@/lib/admin/task-attachments";

const TASK = "11111111-1111-4111-8111-111111111111";

describe("attachmentType", () => {
  it("확장자로 형식을 정한다(대소문자 무시)", () => {
    expect(attachmentType("갈무리.PNG")).toEqual({ ext: "png", contentType: "image/png" });
    expect(attachmentType("crawl.2026-10-02.log")).toEqual({ ext: "log", contentType: "text/plain" });
    expect(attachmentType("묶음.zip")).toEqual({ ext: "zip", contentType: "application/zip" });
  });

  it("받지 않는 확장자, 확장자 없는 이름, 객체 기본 속성 이름은 거른다", () => {
    expect(attachmentType("영상.mp4")).toBeNull();
    expect(attachmentType("README")).toBeNull();
    expect(attachmentType("a.constructor")).toBeNull();
    expect(attachmentType("a.toString")).toBeNull();
  });

  it("허용 목록에 중복이 없다", () => {
    expect(new Set(ATTACHMENT_CONTENT_TYPES).size).toBe(ATTACHMENT_CONTENT_TYPES.length);
    expect(ATTACHMENT_CONTENT_TYPES).toContain("text/plain");
  });
});

describe("isOwnAttachmentPath", () => {
  it("이 할 일 접두 바로 아래 파일만 받는다", () => {
    expect(isOwnAttachmentPath(`${attachmentPathPrefix(TASK)}file-abc.png`, TASK)).toBe(true);
    expect(isOwnAttachmentPath(`admin/tasks/22222222-2222-4222-8222-222222222222/file.png`, TASK)).toBe(false);
    expect(isOwnAttachmentPath(`${attachmentPathPrefix(TASK)}`, TASK)).toBe(false);
    expect(isOwnAttachmentPath(`${attachmentPathPrefix(TASK)}x/../file.png`, TASK)).toBe(false);
    expect(isOwnAttachmentPath(`shops/${TASK}/file.png`, TASK)).toBe(false);
  });
});

describe("formatBytes", () => {
  it("단위를 올린다", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(820 * 1024)).toBe("820 KB");
    expect(formatBytes(3.42 * 1024 * 1024)).toBe("3.4 MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});

describe("isImageType", () => {
  it("이미지 형식만 참이다", () => {
    expect(isImageType("image/webp")).toBe(true);
    expect(isImageType("application/pdf")).toBe(false);
  });
});
