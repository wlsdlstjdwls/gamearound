import { describe, expect, it } from "vitest";
import { resolveNav, trailKind } from "@/lib/nav";

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

describe("trailKind", () => {
  it("하위 칸 그 자체에 선다", () => expect(trailKind("/hall-of-fame", resolveNav("/hall-of-fame", q()).sub)).toBe("sub"));
  it("칸 아래 상세(인디 글)는 세우지 않는다 — 제 되돌아가기 링크가 있다", () => expect(trailKind("/indie/some-game", resolveNav("/indie/some-game", q()).sub)).toBeNull());
  it("내 게임 등록은 끝 낱말을 붙여 선다", () => expect(trailKind("/indie/new", resolveNav("/indie/new", q()).sub)).toBe("leaf"));
  it("계정 화면은 되돌아가기만", () => expect(trailKind("/alerts", resolveNav("/alerts", q()).sub)).toBe("back"));
  it("홈은 아무것도 없다", () => expect(trailKind("/", resolveNav("/", q()).sub)).toBeNull());
});
