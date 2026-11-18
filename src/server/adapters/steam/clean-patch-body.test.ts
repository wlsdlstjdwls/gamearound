import { describe, expect, it } from "vitest";
import { cleanSteamPatchBody } from "./clean-patch-body";

describe("cleanSteamPatchBody", () => {
  it("제목, 목록, 문단을 단순 글로 바꾼다", () => {
    const raw = "[h2]Fixes[/h2][list][*]Fixed crash on load[*]Improved [b]FPS[/b][/list][p]Thanks for playing![/p]";
    expect(cleanSteamPatchBody(raw)).toBe("## Fixes\n\n- Fixed crash on load\n- Improved FPS\n\nThanks for playing!");
  });

  it("그림, 영상, 스팀 그림 주소는 버린다", () => {
    const raw = "[img]{STEAM_CLAN_IMAGE}/1/abc.png[/img]Hello[previewyoutube=xyz;full][/previewyoutube]\n{STEAM_CLAN_IMAGE}/2/def.jpg\nWorld";
    expect(cleanSteamPatchBody(raw)).toBe("Hello\n\nWorld");
  });

  it("링크는 글만 남긴다", () => {
    expect(cleanSteamPatchBody("See [url=https://example.com]the forum[/url] for more")).toBe("See the forum for more");
  });

  it("HTML 도 같은 꼴로 바꾸고 엔티티를 푼다", () => {
    const raw = "<h3>New &amp; Improved</h3><ul><li>One</li><li>Two &lt;3</li></ul><p>Bye<br>now</p><img src=x>";
    expect(cleanSteamPatchBody(raw)).toBe("## New & Improved\n\n- One\n- Two <3\n\nBye\nnow");
  });

  it("새 편집기의 목록 칸 안 문단도 한 목록으로 붙인다", () => {
    const raw = "[list][*][p]A[/p][*][p]B[/p][*][p]C[/p][/list]";
    expect(cleanSteamPatchBody(raw)).toBe("- A\n- B\n- C");
  });

  it("빈 줄이 셋 이상이면 하나로 줄이고, 빈 목록 줄은 버린다", () => {
    expect(cleanSteamPatchBody("A\n\n\n\n[list][*][/list]B")).toBe("A\n\nB");
  });

  it("남은 꾸밈 태그와 표 칸을 걷는다", () => {
    const raw = "[quote=Dev]Hi[/quote][table][tr][td]Map[/td][td]Dust[/td][/tr][/table]";
    expect(cleanSteamPatchBody(raw)).toBe("Hi\n\nMap | Dust");
  });

  it("빈 본문은 빈 문자열이다", () => {
    expect(cleanSteamPatchBody("  [img]x[/img]  ")).toBe("");
  });
});
