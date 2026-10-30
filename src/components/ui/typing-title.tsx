// 자판으로 치듯 찍히는 제목(2026-10-30 사용자: "자음 모음 타이핑 효과로"). 인증 화면 왼쪽 큰 제목이 쓴다.
//
// 글자 하나가 "ㅎ, 하, 할" 처럼 조합 순서대로 바뀐다(lib/hangul-typing). 장면들을 한 칸(inline-grid)에 겹쳐 두고
// 장면마다 보이는 때만 다른 CSS 애니메이션을 건다(globals.css 의 .type-stage) — JS 타이머가 없다(AGENTS §6).
// 칸 폭은 겹친 장면 중 가장 넓은 꼴(완성 글자)이 정해서, 찍히는 동안 줄이 흔들리지 않는다.
// 서버가 다 그려 보내므로 하이드레이션을 기다리지 않고 바로 찍힌다.
// 낭독기는 조각을 읽지 않는다 — 조각은 aria-hidden 이고, 제목 전체는 sr-only 한 벌로 한 번만 읽힌다.
// 줄은 block span 으로 가른다(<br/> 는 접근성 이름에서 낱말을 붙인다 — auth-card 머리 주석의 4번).
import { jamoStages } from "@/lib/hangul-typing";
import { TYPE_START_MS, TYPE_STEP_MS } from "@/lib/motion";

type Stage = { text: string; on: number; final: boolean };

/** 줄마다 글자마다의 장면과 켜고 끄는 때. 장면 하나가 TYPE_STEP_MS 를 쓴다 */
function schedule(lines: readonly string[]): { lines: Stage[][][]; end: number } {
  let t = TYPE_START_MS;
  const out = lines.map((line) =>
    Array.from(line).map((ch) => {
      const stages = jamoStages(ch);
      return stages.map((text, k) => {
        const on = t;
        t += TYPE_STEP_MS;
        return { text, on, final: k === stages.length - 1 };
      });
    }),
  );
  return { lines: out, end: t };
}

export function TypingTitle({ lines, className }: { lines: readonly string[]; className?: string }) {
  const plan = schedule(lines);
  return (
    <h1 className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden>
        {plan.lines.map((chars, li) => (
          <span key={li} className="block">
            {chars.map((stages, ci) => (
              <span key={ci} className="type-slot">
                {stages.map((s, k) => (
                  <span
                    key={k}
                    className="type-stage"
                    data-final={s.final ? "" : undefined}
                    style={{ "--type-on": `${s.on}ms`, "--type-step": `${TYPE_STEP_MS}ms` } as React.CSSProperties}
                  >
                    {s.text}
                  </span>
                ))}
              </span>
            ))}
            {/* 커서는 마지막 줄 끝에만 — 다 찍힌 뒤 몇 번 깜빡이고 사라진다 */}
            {li === plan.lines.length - 1 && <span className="type-caret" style={{ "--type-delay": `${plan.end}ms` } as React.CSSProperties} />}
          </span>
        ))}
      </span>
    </h1>
  );
}
