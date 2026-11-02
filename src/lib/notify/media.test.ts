import { describe, expect, it } from "vitest";
import { renderEmail } from "./email";
import { hasMedia, isNotifyMediaPath, isNotifyMediaUrl, splitNotice } from "./media";
import { checkTags, renderNotice } from "./template";

const IMG = "https://abc.public.blob.vercel-storage.com/notify/image-x1.jpg";
const VID = "https://abc.public.blob.vercel-storage.com/notify/video-x2.mp4";
const POS = "https://abc.public.blob.vercel-storage.com/notify/poster-x3.jpg";

describe("미디어 주소, 경로", () => {
  it("우리 저장소 notify/ 아래만", () => {
    expect(isNotifyMediaUrl(IMG)).toBe(true);
    expect(isNotifyMediaUrl("https://evil.example/notify/a.jpg")).toBe(false);
    expect(isNotifyMediaUrl("https://abc.public.blob.vercel-storage.com/posts/a.jpg")).toBe(false);
    expect(isNotifyMediaPath("notify/image.jpg")).toBe(true);
    expect(isNotifyMediaPath("notify/../x.jpg")).toBe(false);
    expect(isNotifyMediaPath("notify/a/b.jpg")).toBe(false);
  });
});

describe("renderNotice 의 미디어", () => {
  it("우리 주소면 태그로 남고 남의 주소면 글자가 된다", () => {
    expect(renderNotice(`<img src="${IMG}">`, {})).toBe(`<img src="${IMG}">`);
    expect(renderNotice('<img src="https://evil.example/x.jpg">', {})).toBe('&lt;img src="https://evil.example/x.jpg"&gt;');
    expect(renderNotice(`<video src="${VID}" poster="https://evil.example/p.jpg">`, {})).toContain("&lt;video");
  });
  it("미디어 태그는 짝을 세지 않는다", () => {
    expect(checkTags(`<b>a</b><img src="${IMG}"><video src="${VID}">`)).toBeNull();
  });
});

describe("splitNotice", () => {
  it("글, 이미지, 글, 영상 순서로 나누고 빈 글은 버린다", () => {
    const html = renderNotice(`<b>첫 줄</b>\n<img src="${IMG}">\n가운데 글\n<video src="${VID}" poster="${POS}">\n`, {});
    expect(splitNotice(html)).toEqual([
      { kind: "text", html: "<b>첫 줄</b>" },
      { kind: "image", src: IMG },
      { kind: "text", html: "가운데 글" },
      { kind: "video", src: VID, poster: POS },
    ]);
    expect(hasMedia(html)).toBe(true);
    expect(hasMedia("<b>글</b>")).toBe(false);
  });
});

describe("메일의 미디어", () => {
  it("이미지는 그 자리에, 영상은 첫 장면 그림 + 링크로", () => {
    const r = renderEmail(`앞\n<img src="${IMG}">\n<video src="${VID}" poster="${POS}">`, {});
    expect(r.html).toContain(`<img style="display:block;max-width:100%`);
    expect(r.html).toContain(`<a style="color:#2563eb;text-decoration:underline" href="${VID}"><img style=`);
    expect(r.html).not.toContain("<video");
    expect(r.text).toBe(`앞\n이미지 (${IMG})\n영상 (${VID})`);
  });
});
