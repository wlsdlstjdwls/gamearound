"use client";
// 명예의 전당에 들어오면 이번 달 1위 판이 화면 전체로 펼쳐졌다가, 같은 판 자리로 접혀 들어가는 인트로
// (2026-10-28 사용자: "1위 게임이 전체화면으로 쫙 나오고 줄어들면서 지금 화면으로 노출").
//
// 결정과 이유:
// - 움직임은 판 자리에서 시작한다(같은 날 사용자 "애니메이션 없이 전체화면이 됐다가 줄어든다, 부자연스럽다").
//   전에는 덮개가 흐려 들어오기만 해서 화면이 갑자기 가려진 것으로 읽혔다. 지금은 1위 판 모양 창이 화면 전체로 펼쳐지고,
//   이름을 읽을 만큼 머문 뒤, 같은 판 자리로 접혀 들어가 덮개를 흐려 진짜 판으로 넘긴다.
// - 창은 clip-path 로만 움직인다. 그림을 scale 로 줄이면 화면과 판 비율이 달라 찌그러진다.
//   그림은 전체 시간 동안 아주 조금(1.08 배에서 1 배로) 당겨 들어와 멈춘 사진이 아니라 다가가는 느낌을 준다.
// - 서버 HTML 에는 덮개가 없다(첫 상태 idle). JS 가 붙은 뒤 시작하니 JS 없는 환경, 검색 로봇은 평소 화면만 본다.
// - 세션당 한 번(sessionStorage)이 원래 규칙이다(같은 날 사용자 "처음 한 번만이 맞다").
//   지금은 시험 중이라 ALWAYS_PLAY 로 매번 튼다(같은 날 사용자 "테스트 중이니 항상 뜨게"). **오픈 전에 false 로 되돌린다.**
// - 누르기, 휠, 터치, 키 입력이면 바로 끝낸다. 줄이기 설정(prefers-reduced-motion)이면 아예 안 튼다.
// - 시간과 곡선은 globals.css 토큰(--duration-fame-*, --ease-fame)에서 읽는다. WAAPI 는 ms 숫자가 필요해서다.
import { useEffect, useRef, useState } from "react";
import { TrophyIcon } from "@/components/ui/icons";

/** 시험 기간 동안 매번 튼다(머리 주석). 오픈 전에 false */
const ALWAYS_PLAY = true;
/** 세션에 한 번만 튼다는 표시 */
const SEEN_KEY = "fame-intro-seen";
/** 토큰을 못 읽었을 때 쓰는 값(ms). globals.css 의 값과 같다 */
const FALLBACK_EXPAND_MS = 650;
const FALLBACK_HOLD_MS = 800;
const FALLBACK_SHRINK_MS = 700;
/** 접힌 뒤 덮개를 걷는 시간. 판 자리 그림과 덮개 그림의 자르는 위치가 조금 달라 겹쳐 흐려 넘긴다 */
const FALLBACK_HANDOFF_MS = 220;
/** 그림이 당겨 들어오는 시작 배율. 더 크면 낮은 해상도의 인디 그림이 뭉개져 보인다 */
const IMAGE_PUSH_SCALE = 1.08;

function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // 저장소를 못 쓰면 매번 틀 수도 있으니 아예 틀지 않는다
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 저장 실패는 다음에 한 번 더 트는 정도의 일이다
  }
}

/** 판 자리를 창 모양(inset)으로. 판이 화면 밖(아래)에 있어도 창이 화면 안에서 끝나게 자른다 */
function cardClip(target: HTMLElement): string {
  const r = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const radius = getComputedStyle(target).borderTopLeftRadius || "0px";
  const top = Math.max(0, Math.min(r.top, vh - 1));
  const bottom = Math.max(0, vh - Math.max(Math.min(r.bottom, vh), top + 1));
  return `inset(${top}px ${Math.max(0, vw - r.right)}px ${bottom}px ${Math.max(0, r.left)}px round ${radius})`;
}

const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";

export function FameIntro({ src, title, badge, targetId }: { src: string; title: string; badge: string; targetId: string }) {
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const layer = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ALWAYS_PLAY && alreadySeen()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 다음 프레임에 켠다 — 첫 그림(서버 HTML)이 한 번 칠해진 뒤 판이 펼쳐진다.
    // 표시는 켤 때 남긴다. 효과 안에서 바로 남기면 개발 모드의 두 번 실행(StrictMode)이 첫 실행을 걷은 뒤 "이미 봤다" 로 읽어 안 튼다
    const raf = requestAnimationFrame(() => {
      markSeen();
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
    const expand = tokenMs("--duration-fame-expand", FALLBACK_EXPAND_MS);
    const hold = tokenMs("--duration-fame-hold", FALLBACK_HOLD_MS);
    const shrink = tokenMs("--duration-fame-shrink", FALLBACK_SHRINK_MS);
    const handoff = tokenMs("--duration-base", FALLBACK_HANDOFF_MS);
    const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-fame").trim() || "ease-in-out";
    const total = expand + hold + shrink;

    // 판이 이미 받아 둔 그림(최적화 주소, currentSrc)을 그대로 빌린다. 원본 주소를 새로 받으면 큰 화면에서
    // 펼쳐지는 동안 그림이 아직 없어 검은 판만 커졌다(2026-10-28 실측, 1280 첫 방문)
    const shown = target.querySelector("img")?.currentSrc;
    if (img.current && shown) img.current.src = shown;

    const anims: Animation[] = [];
    let fadeOut: Animation | null = null;
    // 1) 판 자리에서 화면 전체로. 창을 먼저 판 모양으로 건 뒤에 보이게 한다 — 창 없이 한 프레임 전체가 덮이면 번쩍인다
    const from = cardClip(target);
    el.style.clipPath = from;
    el.style.opacity = "1";
    anims.push(el.animate([{ clipPath: from }, { clipPath: FULL_CLIP }], { duration: expand, easing: ease, fill: "forwards" }));
    if (img.current) {
      anims.push(img.current.animate([{ transform: `scale(${IMAGE_PUSH_SCALE})` }, { transform: "scale(1)" }], { duration: total, easing: "linear", fill: "forwards" }));
    }
    // 글은 펼쳐지는 끝 무렵 떠올랐다가, 접히기 시작하면 먼저 사라진다
    if (text.current) {
      anims.push(
        text.current.animate(
          [
            { opacity: 0, transform: "translateY(20px)", offset: 0 },
            { opacity: 0, transform: "translateY(20px)", offset: (expand * 0.6) / total },
            { opacity: 1, transform: "none", offset: (expand + hold * 0.3) / total },
            { opacity: 1, transform: "none", offset: (expand + hold) / total },
            { opacity: 0, transform: "translateY(-10px)", offset: (expand + hold + shrink * 0.35) / total },
            { opacity: 0, transform: "translateY(-10px)", offset: 1 },
          ],
          { duration: total, easing: "ease-out", fill: "forwards" },
        ),
      );
    }
    // 2) 머문 뒤 3) 판 자리로 접혀 들어가고, 덮개를 흐려 진짜 판으로 넘긴다.
    // 접힐 자리는 그때 다시 잰다 — 머무는 동안 그림이나 글꼴이 늦게 와 판이 움직일 수 있다
    const startShrink = window.setTimeout(() => {
      const close = el.animate([{ clipPath: FULL_CLIP }, { clipPath: cardClip(target) }], { duration: shrink, easing: ease, fill: "forwards" });
      anims.push(close);
      close.onfinish = () => {
        fadeOut = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: handoff, easing: "ease-out", fill: "forwards" });
        fadeOut.onfinish = () => setPhase("done");
      };
    }, expand + hold);

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
      {/* 판의 그림과 같은 주소라 이미 받아 둔 것을 바로 쓴다. 흐려 들어오는 FadeImage 는 펼쳐지는 동안 그림을 비워 보였다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt="" decoding="sync" className="absolute inset-0 size-full object-cover will-change-transform" />
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
