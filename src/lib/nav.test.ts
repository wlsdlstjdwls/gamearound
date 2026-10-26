import { describe, expect, it } from "vitest";
import { resolveNav, trailKind, trailLeaf } from "@/lib/nav";

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

  it("라운지 전체 글은 라운지 홈을 켠다(목업 subOf lga)", () => {
    expect(resolveNav("/lounge/all", q("page=2")).sub?.label).toBe("라운지 홈");
    expect(trailKind("/lounge/all", resolveNav("/lounge/all", q()).sub)).toBe("sub");
    // 라운지 글 상세는 여전히 칸을 켜지 않는다
    expect(resolveNav("/lounge/p/abc", q()).sub).toBeNull();
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

describe("게임 게시판 상세, 글쓰기의 소속", () => {
  it("글 상세는 제 게시판 칸을 켜고 경로 끝 낱말은 게시글", () => {
    const r = resolveNav("/board/guides/p/abc", q());
    expect(r.sub?.label).toBe("공략");
    expect(trailLeaf("/board/guides/p/abc")).toBe("게시글");
    expect(trailKind("/board/guides/p/abc", r.sub)).toBe("leaf");
  });

  it("상세보다 깊은 경로와 목록 자체는 게시글이 아니다", () => {
    expect(trailLeaf("/board/guides/p/abc/edit")).toBeNull();
    expect(trailLeaf("/board/guides/p/")).toBeNull();
    expect(trailLeaf("/board/guides")).toBeNull();
  });

  it("글쓰기는 고른 카테고리의 칸을 켠다", () => {
    expect(resolveNav("/board/write", q("category=promo")).sub?.label).toBe("홍보");
    expect(resolveNav("/board/write", q()).sub).toBeNull();
    expect(trailLeaf("/board/write")).toBe("글쓰기");
  });

  it("전체 글은 게시판 홈을 켠다", () => {
    expect(resolveNav("/board/all", q()).sub?.label).toBe("게시판 홈");
    expect(trailKind("/board/all", resolveNav("/board/all", q()).sub)).toBe("sub");
  });
});
