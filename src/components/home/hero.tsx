// 홈 히어로(기획서 v2.0 S-01 "서비스 한 줄 소개와 전역 검색 진입", 목업 v66 홈 첫 판).
//
// 2026-10-02 에 홈 머리 약속을 걷었다가(사용자: "이건 빼라") 기획서 v2.0 이 다시 세웠다. 그때 걷은 것은 숫자 셋과
// 알림 입구가 붙은 무거운 판이었다 — 여기는 문장 둘과 검색칸 하나뿐이다.
//
// 검색칸은 머리띠 검색과 같은 /search 로 가는 평범한 GET 폼이다. 자동완성은 머리띠 칸이 맡는다 —
// 같은 자동완성을 둘 띄우면 화면에 같은 목록이 두 번 펼쳐질 수 있다. 폼이라 JS 없이도 된다.
// 움직임은 손전등 빛 하나다(2026-10-26 모션 회차): 바탕을 천천히 훑는 빛과, 강조 글자를 한 번 스치는 빛.
// 목업의 글로우와 사선 빛줄기는 쓰지 않는다(기획서 2.5 "과한 네온, 글로우는 쓰지 않는다"). 바탕에 브랜드색을 옅게만 깐다.
import { SearchIcon } from "@/components/ui/icons";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { ROUTES } from "@/lib/routes";

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-surface px-5 py-10 text-center shadow-2 sm:px-8 sm:py-14"
    >
      {/* 옅은 브랜드 빛 두 겹. 면이 아니라 바탕이라 글자 대비를 건드리지 않는다 */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(45% 70% at 86% 10%, color-mix(in oklab, var(--acc) 14%, transparent), transparent 70%), radial-gradient(40% 60% at 8% 80%, color-mix(in oklab, var(--acc) 9%, transparent), transparent 70%)",
        }}
      />
      {/* 손전등 빛 웅덩이가 바탕을 천천히 오간다(globals.css .hero-beam) */}
      <span aria-hidden className="hero-beam" />
      <h1 id="home-hero-heading" className="text-[30px] font-extrabold leading-[1.18] tracking-[-0.035em] text-ink sm:text-[44px]">
        {M.heroLead} <span className="glint-text">{M.heroAccent}</span>
      </h1>
      <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.6] text-mut sm:text-[17px]">{M.heroBody}</p>

      <form action={ROUTES.search} role="search" className="mx-auto mt-7 flex max-w-[560px] items-center gap-2 rounded-2xl bg-bg p-1.5 pl-4 shadow-hair focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]">
        <SearchIcon size={19} className="shrink-0 text-dim" />
        <label htmlFor="home-hero-q" className="sr-only">
          {M.heroSearchLabel}
        </label>
        {/* 16px: iOS 가 입력칸을 누를 때 화면을 확대하지 않는 최소 글자 크기 */}
        <input
          id="home-hero-q"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={M.heroSearchPlaceholder}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim"
        />
        <button type="submit" className="press h-11 shrink-0 rounded-xl bg-acc px-5 text-[14.5px] font-semibold text-on-ink hover:bg-acc-hover">
          {M.heroSearchCta}
        </button>
      </form>
    </section>
  );
}
