"use client";
// 명예의 전당에 들어오면 이번 달 1위 대표 그림이 화면을 덮었다가, 1위 판 자리로 줄어들며 안착하는 인트로
// (2026-10-28 사용자: "1위 게임이 전체화면으로 쫙 나오고 줄어들면서 지금 화면으로 노출").
//
// 결정과 이유:
// - 줄어드는 것은 transform 이 아니라 clip-path 다. 화면 비율과 판 비율이 달라 scale 로 줄이면 그림이 찌그러진다.
//   그림은 화면 전체에 object-cover 로 깔아 두고 보이는 창만 판 자리로 좁힌 뒤, 마지막에 덮개를 흐려 진짜 판으로 넘긴다.
// - 서버 HTML 에는 덮개가 없다(첫 상태 idle). JS 가 붙은 뒤 시작하니 JS 없는 환경, 검색 로봇은 평소 화면만 본다.
//   덮개는 빠르게 나타나게(fade-in) 해서 "화면이 떴다가 갑자기 가려지는" 느낌을 줄인다.
// - 명예의 전당에 **들어올 때마다** 튼다(2026-10-28 사용자 "1위 왜 전체화면 안 되냐" — 처음엔 세션당 한 번이라 두 번째부터 안 떴다).
//   같은 화면 안에서 달을 넘길 때는 다시 틀지 않는다: 표시는 모듈 변수에 두고, 화면을 떠날 때(FameIntroVisit 이 내려갈 때) 지운다.
//   달을 넘겨도 경로가 같아 페이지는 내려가지 않으니 표시가 남는다.
// - 누르기, 휠, 터치, 키 입력이면 바로 끝낸다. 줄이기 설정(prefers-reduced-motion)이면 아예 안 튼다.
// - 시간은 globals.css 토큰(--duration-fame-hold, --duration-fame-shrink)에서 읽는다. WAAPI 는 ms 숫자가 필요해서다.
import { useEffect, useRef, useState } from "react";
import { FadeImage } from "@/components/ui/fade-image";
import { TrophyIcon } from "@/components/ui/icons";

/** 토큰을 못 읽었을 때 쓰는 값(ms). globals.css 의 값과 같다 */
const FALLBACK_HOLD_MS = 800;
const FALLBACK_SHRINK_MS = 700;
/** 줄어든 뒤 덮개를 걷는 시간. 판 자리 그림과 덮개 그림의 자르는 위치가 조금 달라 겹쳐 흐려 넘긴다 */
const FALLBACK_HANDOFF_MS = 220;

function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

/** 이번 방문에서 이미 틀었나. 화면을 떠나면 FameIntroVisit 이 지운다 */
let playedThisVisit = false;

/** 명예의 전당 화면에 한 번 둔다. 화면을 떠날 때 표시를 지워 다음에 들어오면 다시 튼다 */
export function FameIntroVisit() {
  useEffect(
    () => () => {
      playedThisVisit = false;
    },
    [],
  );
  return null;
}

export function FameIntro({ src, title, badge, targetId }: { src: string; title: string; badge: string; targetId: string }) {
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const layer = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playedThisVisit) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 다음 프레임에 켠다 — 첫 그림(서버 HTML)이 한 번 칠해진 뒤 덮개가 흐려 들어온다.
    // 표시는 켤 때 남긴다. 효과 안에서 바로 남기면 개발 모드의 두 번 실행(StrictMode)이 첫 실행을 걷은 뒤 "이미 틀었다" 로 읽어 안 튼다
    const raf = requestAnimationFrame(() => {
      playedThisVisit = true;
      setPhase("play");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const el = layer.current;
    const target = document.getElementById(targetId);
    if (!el || !target) {
      const raf = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(raf);
    }
    const hold = tokenMs("--duration-fame-hold", FALLBACK_HOLD_MS);
    const shrink = tokenMs("--duration-fame-shrink", FALLBACK_SHRINK_MS);
    const handoff = tokenMs("--duration-base", FALLBACK_HANDOFF_MS);
    const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-out-emph").trim() || "ease-out";

    // 판 자리는 줄어들기 시작할 때 잰다. 머무는 동안 그림이나 글꼴이 늦게 와 판이 움직일 수 있다
    const targetClip = () => {
      const r = target.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const radius = getComputedStyle(target).borderTopLeftRadius || "0px";
      // 판이 화면 밖(아래)에 있어도 창이 화면 안에서 끝나게 자른다
      const top = Math.max(0, Math.min(r.top, vh));
      const bottom = Math.max(0, vh - Math.min(r.bottom, vh));
      return `inset(${top}px ${Math.max(0, vw - r.right)}px ${bottom}px ${Math.max(0, r.left)}px round ${radius})`;
    };

    const anims: Animation[] = [];
    anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: handoff, easing: "ease-out", fill: "forwards" }));
    if (text.current) {
      anims.push(
        text.current.animate(
          [
            { opacity: 0, transform: "translateY(16px)" },
            { opacity: 1, transform: "none", offset: 0.35 },
            { opacity: 1, transform: "none", offset: 0.8 },
            { opacity: 0, transform: "translateY(-8px)" },
          ],
          { duration: hold + shrink / 3, easing: ease, fill: "forwards" },
        ),
      );
    }
    let fadeOut: Animation | null = null;
    const startShrink = window.setTimeout(() => {
      const clip = el.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: targetClip() }], { duration: shrink, easing: ease, fill: "forwards" });
      anims.push(clip);
      clip.onfinish = () => {
        fadeOut = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: handoff, easing: "ease-out", fill: "forwards" });
        fadeOut.onfinish = () => setPhase("done");
      };
    }, hold);

    // 사용자가 무엇이든 하면 바로 끝낸다 — 인트로가 화면을 붙들면 안 된다
    const skip = () => {
      window.clearTimeout(startShrink);
      for (const a of anims) a.cancel();
      fadeOut?.cancel();
      setPhase("done");
    };
    const opts = { passive: true, capture: true } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchstart", skip, opts);
    window.addEventListener("keydown", skip, opts);
    return () => {
      window.removeEventListener("pointerdown", skip, opts);
      window.removeEventListener("wheel", skip, opts);
      window.removeEventListener("touchstart", skip, opts);
      window.removeEventListener("keydown", skip, opts);
      window.clearTimeout(startShrink);
      for (const a of anims) a.cancel();
      fadeOut?.cancel();
    };
  }, [phase, targetId]);

  if (phase !== "play") return null;
  return (
    <div ref={layer} aria-hidden className="fixed inset-0 z-[70] overflow-hidden bg-ink text-on-ink" style={{ opacity: 0 }}>
      <FadeImage src={src} alt="" fill priority sizes="100vw" className="object-cover" />
      {/* 글자 자리만 아래에서 어둡게 받친다 — 그림은 가리지 않는다 */}
      <span className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--ink) 90%, transparent), color-mix(in oklab, var(--ink) 65%, transparent) 45%, transparent)" }} />
      <div ref={text} className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-[14vh] text-center" style={{ opacity: 0 }}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-acc px-3.5 py-1.5 text-[14px] font-bold text-on-ink">
          <TrophyIcon size={16} strokeWidth={2.2} />
          {badge}
        </span>
        <span className="text-[34px] font-black leading-tight tracking-[-0.03em] [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] sm:text-[56px]">{title}</span>
      </div>
    </div>
  );
}
