// 글자가 한 자씩 찍히는 제목(2026-10-30 사용자: "타이핑 효과나 모션 그래픽 효과도"). 인증 화면 왼쪽 큰 제목이 쓴다.
//
// JS 타이머로 글자를 늘리지 않는다(AGENTS §6) — 글자마다 늦춤만 다른 같은 CSS 애니메이션(globals.css 의 .type-char)이다.
// 그래서 서버가 다 그려 보내고, 하이드레이션을 기다리지 않고 바로 찍히기 시작한다.
// 낭독기는 글자 조각을 읽지 않는다 — 조각은 aria-hidden 이고, 제목 전체는 sr-only 한 벌로 한 번만 읽힌다.
// 줄은 block span 으로 가른다(<br/> 는 접근성 이름에서 낱말을 붙인다 — auth-card 머리 주석의 4번).
import { cn } from "@/lib/cn";
import { TYPE_START_MS, TYPE_STEP_MS } from "@/lib/motion";

export function TypingTitle({ lines, className }: { lines: readonly string[]; className?: string }) {
  let i = 0;
  const delayOf = () => TYPE_START_MS + i++ * TYPE_STEP_MS;
  return (
    <h1 className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden>
        {lines.map((line, li) => (
          <span key={li} className="block">
            {Array.from(line).map((ch, ci) => (
              <span key={ci} className="type-char" style={{ "--type-delay": `${delayOf()}ms` } as React.CSSProperties}>
                {ch}
              </span>
            ))}
            {/* 커서는 마지막 줄 끝에만 — 다 찍힌 뒤 몇 번 깜빡이고 사라진다 */}
            {li === lines.length - 1 && <span className={cn("type-caret")} style={{ "--type-delay": `${delayOf()}ms` } as React.CSSProperties} />}
          </span>
        ))}
      </span>
    </h1>
  );
}
