// 홈 히어로(기획서 v2.0 S-01 "서비스 한 줄 소개와 전역 검색 진입", 목업 v66 홈 첫 판).
//
// 2026-10-02 에 홈 머리 약속을 걷었다가(사용자: "이건 빼라") 기획서 v2.0 이 다시 세웠다. 그때 걷은 것은 숫자 셋과
// 알림 입구가 붙은 무거운 판이었다 — 여기는 문장 둘과 검색칸 하나뿐이다.
//
// 검색칸은 머리띠 검색과 같은 /search 로 가는 평범한 GET 폼이다. 자동완성은 머리띠 칸이 맡는다 —
// 같은 자동완성을 둘 띄우면 화면에 같은 목록이 두 번 펼쳐질 수 있다. 폼이라 JS 없이도 된다.
// 움직임은 손전등 빛 하나다(2026-10-26 모션 회차): 바탕을 천천히 훑는 빛과, 강조 글자를 한 번 스치는 빛.
// 목업의 글로우와 사선 빛줄기는 쓰지 않는다(기획서 2.5 "과한 네온, 글로우는 쓰지 않는다"). 바탕에 브랜드색을 옅게만 깐다.
//
// 2026-10-27 반짝임을 더했다(사용자: "지금 밋밋하니까 모션 그래픽이나 반짝이는 효과"):
// - 작은 별 여섯이 엇갈려 반짝인다(.sparkle). 글자 둘레 바깥에만 둔다 — 글 위에서 깜빡이면 읽기를 방해한다
// - "얼마에?" 를 스치는 빛이 한 번이 아니라 몇 초마다 다시 지나간다(.glint-loop)
// - 판 가장자리에 떠 있던 가격 딱지 셋(-70%, 최저가, 출시 알림)은 같은 날 걷었다(사용자: "더럽다, 바꾸거나 빼라").
//   판이 지저분해 보이고 단추인지 장식인지 헷갈렸다. 할인, 출시 예정은 바로 아래 줄들이 이미 보여 준다
// - 검색 단추 위로 빛이 몇 초에 한 번 비스듬히 스친다(.glint-sweep)
// 전부 CSS 이고, 움직임 줄이기 설정은 전역 킬스위치가 끈다.
//
// 2026-10-28 위아래를 줄였다(사용자: "히어로가 너무 크다"). 첫 화면에서 할인 줄이 더 빨리 보이게 하려는 것이다 — 문장 둘과 검색칸은 그대로다.
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { ROUTES } from "@/lib/routes";

/**
 * 반짝이는 별 자리(판 기준 %)와 크기(px), 시작 어긋남(ms). 글자 덩어리(가운데 60%)를 비켜 가장자리에 흩는다.
 * 어긋남이 없으면 여섯이 한꺼번에 깜빡여 "깜빡이는 판" 이 된다
 */
const SPARKLES: readonly { top: string; left: string; size: number; delay: number }[] = [
  { top: "14%", left: "9%", size: 14, delay: 0 },
  { top: "68%", left: "6%", size: 10, delay: 1300 },
  { top: "22%", left: "88%", size: 16, delay: 700 },
  { top: "74%", left: "92%", size: 11, delay: 2100 },
  { top: "8%", left: "62%", size: 9, delay: 1700 },
  { top: "86%", left: "36%", size: 10, delay: 400 },
];

function Sparkle({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className={cn("sparkle absolute text-acc", className)} style={style}>
      <path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z" fill="currentColor" />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-surface px-5 py-7 text-center shadow-2 sm:px-8 sm:py-9"
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
      {SPARKLES.map((s) => (
        <Sparkle key={`${s.top}-${s.left}`} size={s.size} style={{ top: s.top, left: s.left, animationDelay: `${s.delay}ms` }} />
      ))}
      <h1 id="home-hero-heading" className="text-[30px] font-extrabold leading-[1.18] tracking-[-0.035em] text-ink sm:text-[40px]">
        {M.heroLead} <span className="glint-text glint-loop">{M.heroAccent}</span>
      </h1>
      <p className="mx-auto mt-2 max-w-[520px] break-keep text-balance text-[15px] leading-[1.6] text-mut sm:text-[17px]">{M.heroBody}</p>

      <form action={ROUTES.search} role="search" className="mx-auto mt-5 flex max-w-[560px] items-center gap-2 rounded-2xl bg-bg p-1.5 pl-4 shadow-hair focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]">
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
        <button type="submit" className="press glint-sweep relative h-11 shrink-0 overflow-hidden rounded-xl bg-acc px-5 text-[14.5px] font-semibold text-on-ink hover:bg-acc-hover">
          {M.heroSearchCta}
        </button>
      </form>
    </section>
  );
}
