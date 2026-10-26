import { describe, expect, it } from "vitest";
import { resolveNav } from "@/lib/nav";

const q = (s = "") => new URLSearchParams(s);

describe("resolveNav", () => {
  it("목록은 전체 게임, sale=1 이면 할인 게임", () => {
    expect(resolveNav("/games", q()).sub?.label).toBe("전체 게임");
    expect(resolveNav("/games", q("sale=1&sort=price")).sub?.label).toBe("할인 게임");
  });

  it("게임 상세는 메뉴만 켜고 칸은 켜지 않는다", () => {
    const r = resolveNav("/games/elden-ring", q());
    expect(r.section?.key).toBe("explore");
    expect(r.sub).toBeNull();
  });

  it("긴 경로가 이긴다: /indie/mine 은 등록현황", () => {
    expect(resolveNav("/indie/mine", q()).sub?.label).toBe("등록현황");
    expect(resolveNav("/indie/some-game", q()).sub?.label).toBe("내가 만든 게임");
  });

  it("하위 칸 밖 소속 경로와 메뉴 밖 화면", () => {
    expect(resolveNav("/search", q("q=a")).section?.key).toBe("explore");
    expect(resolveNav("/board/reviews", q()).sub?.label).toBe("리뷰");
    expect(resolveNav("/board/p/abc", q()).sub).toBeNull();
    expect(resolveNav("/board/p/abc", q()).section?.key).toBe("board");
    expect(resolveNav("/", q()).section).toBeNull();
    expect(resolveNav("/settings", q()).section).toBeNull();
  });
});
