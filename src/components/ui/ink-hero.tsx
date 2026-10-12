// 어두운 머리 판 — 랜딩 화면 맨 위에서 "이 화면이 무엇이고 왜 하면 좋은지" 를 한 판에 세운다.
//
// 인디 목록(indie/list-hero)과 입점 랜딩(/business)이 같이 쓴다. 두 곳이 판 모양과 버튼 모양을
// 따로 들고 있으면 한쪽만 고쳐져 어긋난다(AGENTS §3). 빛 번짐 색만 화면마다 다르다 —
// 인디는 숲빛 초록, 입점은 브랜드 보라 한 색이다.
import { cn } from "@/lib/cn";

/** 판 위의 주 버튼 — 흰 알약. 어두운 면 위라 buttonClass 의 primary(먹색)는 안 보인다 */
export const INK_CTA =
  "press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full bg-on-ink px-5 text-[14px] font-bold text-ink";

/** 판 위의 보조 버튼 — 면 없이 글자만 */
export const INK_CTA_GHOST =
  "press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full px-4 text-[13.5px] font-semibold opacity-80 hover:opacity-100";

/** 빛 번짐 두 점. 왼쪽 위는 늘 브랜드 보라라 오른쪽 아래 한 색만 고른다 */
const GLOW = {
  forest: "var(--ok)",
  brand: "var(--acc-on-ink)",
} as const;

export type InkHeroGlow = keyof typeof GLOW;

export function InkHero({
  label,
  glow = "brand",
  className,
  children,
}: {
  /** 판의 이름 — 화면 읽기 도구가 이 구역을 무엇이라 부를지 */
  label: string;
  glow?: InkHeroGlow;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-on-ink sm:px-8 sm:py-8",
        className,
      )}
    >
      {/* 장식이라 읽는 도구에서 숨긴다 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(60% 90% at 0% 0%, color-mix(in oklab, var(--acc-on-ink) 45%, transparent), transparent 70%), radial-gradient(50% 80% at 100% 100%, color-mix(in oklab, ${GLOW[glow]} 35%, transparent), transparent 70%)`,
        }}
      />
      {children}
    </section>
  );
}

/** 판 머리 셋 — 작은 이름표, 큰 제목, 한두 줄 설명. h1 이다: 이 판이 선 화면에는 다른 제목을 두지 않는다 */
export function InkHeroHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]">
        <span aria-hidden className="size-2 rounded-full bg-acc-on-ink" />
        {eyebrow}
      </p>
      <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] sm:text-[36px]">{title}</h1>
      <p className="max-w-[460px] text-[13.5px] leading-[1.6] opacity-75">{lead}</p>
    </div>
  );
}
