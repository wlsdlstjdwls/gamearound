"use client";
// 명예의 전당에 들어오면 이번 달 1위 판이 화면 전체로 펼쳐지고, 그 게임 그림 몇 장을 넘겨 보인 뒤, 같은 판 자리로 접혀 들어가는 인트로
// (2026-10-28 사용자: "1위 게임이 전체화면으로 쫙 나오고 줄어들면서 지금 화면으로 노출").
//
// 결정과 이유:
// - **판 자체가 커졌다 작아진다**(덮개의 위치와 크기를 움직인다). 처음엔 화면 크기 그림을 clip-path 로 잘랐는데,
//   화면 전체로 자른 그림과 판의 그림은 잘리는 자리가 달라 내려앉는 순간 그림이 한 번 튀었다(같은 날 사용자 "줄어들 때 어색하다").
//   덮개가 판과 같은 상자, 같은 object-cover 로 끝나면 마지막 프레임이 판과 똑같아진다. 모서리와 테두리 빛(box-shadow)도 판 값으로 끝낸다.
// - 접히는 끝 무렵 덮개를 흐려 진짜 판(글, 받침 그라디언트)으로 넘긴다 — 그림은 같으니 글만 떠오르는 것으로 보인다.
// - 전체 화면에서는 대표 그림으로 시작해 다른 그림 두세 장을 넘기고 대표 그림으로 돌아온다(같은 날 사용자 "유지 시간이 너무 짧다, 사진 여러 장으로").
//   대표 그림으로 끝나야 판으로 내려앉을 때 그림이 바뀌지 않는다. 아직 못 받은 그림은 건너뛴다.
// - 그림은 판이 이미 받아 둔 것(currentSrc)을 대표로 빌린다. 원본 주소를 새로 받으면 펼쳐지는 동안 검은 판만 커졌다(1280 첫 방문 실측).
// - 언제 트는지(off, 한 번, 매번)와 머무는 시간은 관리자가 정한다(lib/indie/fame-intro). 서버 HTML 에는 덮개가 없다.
// - "한 번" 은 1위 게임마다 브라우저에 한 번이다(localStorage, seenKey). 처음엔 탭(sessionStorage)마다 한 번이라
//   새 탭으로 올 때마다 또 떴다 — 10-28 사용자 "전체화면 애니메이션은 1회만". 1위가 바뀌면 새 1위를 한 번 보여 준다.
// - 누르기, 휠, 터치, 키 입력이면 바로 끝낸다. 줄이기 설정(prefers-reduced-motion)이면 아예 안 튼다.
// - 펼치고 접는 시간과 곡선은 globals.css 토큰(--duration-fame-expand, --duration-fame-shrink, --ease-fame). WAAPI 는 ms 숫자가 필요해서 읽어 온다.
import { useEffect, useRef, useState } from "react";
import { TrophyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { FameIntroSettings } from "@/lib/indie/fame-intro";

/** 마지막으로 본 1위의 seenKey(mode once). 값 하나만 둔다 — 지난 1위 목록을 쌓을 까닭이 없다 */
const SEEN_KEY = "fame-intro-seen-top";
/** 토큰을 못 읽었을 때 쓰는 값(ms). globals.css 의 값과 같다 */
const FALLBACK_EXPAND_MS = 650;
const FALLBACK_SHRINK_MS = 800;
/** 그림 한 장이 머무는 동안 당겨 들어오는 시작 배율. 더 크면 낮은 해상도의 인디 그림이 뭉개져 보인다 */
const IMAGE_PUSH_SCALE = 1.06;
/** 넘길 그림을 받느라 인트로 시작을 늦출 수 있는 한도. 넘기면 받은 것만 넘긴다 */
const PRELOAD_WAIT_MS = 1200;
/** 접히는 시간 중 마지막 이 비율 동안 덮개를 흐려 진짜 판으로 넘긴다 */
const HANDOFF_SHARE = 0.35;

function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

function alreadySeen(seenKey: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === seenKey;
  } catch {
    return true; // 저장소를 못 쓰면 매번 틀 수도 있으니 아예 틀지 않는다
  }
}

function markSeen(seenKey: string) {
  try {
    localStorage.setItem(SEEN_KEY, seenKey);
  } catch {
    // 저장 실패는 다음에 한 번 더 트는 정도의 일이다
  }
}

type Box = { top: string; left: string; width: string; height: string; borderRadius: string; boxShadow: string };

function cardBox(target: HTMLElement): Box {
  const r = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  return { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: cs.borderTopLeftRadius || "0px", boxShadow: cs.boxShadow === "none" ? "0 0 0 0 transparent" : cs.boxShadow };
}

function fullBox(card: Box): Box {
  // 그림자 모양(겹 수)을 판과 맞춰 둔다 — 겹 수가 다르면 브라우저가 사이를 못 이어 그림자가 툭 바뀐다
  return { top: "0px", left: "0px", width: `${window.innerWidth}px`, height: `${window.innerHeight}px`, borderRadius: "0px", boxShadow: card.boxShadow.replace(/rgba?\([^)]*\)|#[0-9a-f]+|var\([^)]*\)/gi, "transparent") };
}

/** seenKey: 이 1위를 가리키는 값(게임 slug). 같은 값을 이미 봤으면 mode once 에서 안 튼다 */
export function FameIntro({ src, images, title, badge, targetId, settings, seenKey }: { src: string; images: string[]; title: string; badge: string; targetId: string; settings: FameIntroSettings; seenKey: string }) {
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [slide, setSlide] = useState(0);
  const [showText, setShowText] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const { mode, holdMs } = settings;
  // 대표 그림이 첫 장. 같은 주소가 겹치면 뺀다
  const all = [src, ...images.filter((u) => u !== src)];

  useEffect(() => {
    if (mode === "off") return;
    if (mode === "once" && alreadySeen(seenKey)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 넘길 그림을 먼저 받는다(최대 PRELOAD_WAIT_MS). 펼쳐진 뒤에 받기 시작하면 넘길 차례에 아직 없어 대표 한 장으로 끝났다.
    // 기다리는 동안 화면은 평소대로 보인다. 그다음 프레임에 켠다.
    // 표시는 켤 때 남긴다. 효과 안에서 바로 남기면 개발 모드의 두 번 실행(StrictMode)이 첫 실행을 걷은 뒤 "이미 봤다" 로 읽어 안 튼다
    let cancelled = false;
    let raf = 0;
    const loads = images.map(
      (u) =>
        new Promise<void>((done) => {
          const im = new Image();
          im.onload = im.onerror = () => done();
          im.src = u;
        }),
    );
    const wait = new Promise<void>((done) => window.setTimeout(done, PRELOAD_WAIT_MS));
    void Promise.race([Promise.all(loads), wait]).then(() => {
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        markSeen(seenKey);
        setPhase("play");
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // images 는 서버가 준 값이라 화면이 사는 동안 바뀌지 않는다 — 배열 정체성 때문에 다시 돌지 않게 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (phase !== "play") return;
    const el = layer.current;
    const target = document.getElementById(targetId);
    if (!el || !target) {
      const raf = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(raf);
    }
    const expand = tokenMs("--duration-fame-expand", FALLBACK_EXPAND_MS);
    const shrink = tokenMs("--duration-fame-shrink", FALLBACK_SHRINK_MS);
    const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-fame").trim() || "ease-in-out";

    const shown = target.querySelector("img")?.currentSrc;
    if (imgs.current[0] && shown) imgs.current[0].src = shown;

    // 넘길 차례: 대표, (받아 둔) 다른 그림들, 대표. 다른 그림이 하나도 없으면 대표 한 장으로 머문다
    const ready = () => imgs.current.map((im, i) => (i > 0 && im?.complete && im.naturalWidth > 0 ? i : -1)).filter((i) => i > 0);
    const timers: number[] = [];
    const anims: Animation[] = [];
    const push = (i: number, ms: number) => {
      const im = imgs.current[i];
      if (im) anims.push(im.animate([{ transform: `scale(${IMAGE_PUSH_SCALE})` }, { transform: "scale(1)" }], { duration: ms, easing: "ease-out", fill: "forwards" }));
    };

    const card = cardBox(target);
    const full = fullBox(card);
    Object.assign(el.style, card, { opacity: "1" });
    anims.push(el.animate([card, full], { duration: expand, easing: ease, fill: "forwards" }));
    timers.push(window.setTimeout(() => setShowText(true), expand * 0.6));

    // 펼쳐지는 동안 받은 그림으로 차례를 정한다. 한 장이 머무는 시간 = 유지 시간 / 장 수
    timers.push(
      window.setTimeout(() => {
        const order = [0, ...ready(), 0];
        const steps = order.length > 2 ? order : [0];
        const each = holdMs / steps.length;
        steps.forEach((i, k) => {
          timers.push(
            window.setTimeout(() => {
              setSlide(i);
              push(i, each + 400);
            }, k * each),
          );
        });
      }, expand),
    );

    let close: Animation | null = null;
    timers.push(
      window.setTimeout(() => {
        setShowText(false);
        // 접힐 자리는 그때 다시 잰다 — 머무는 동안 그림이나 글꼴이 늦게 와 판이 움직일 수 있다
        close = el.animate([{ ...full, opacity: 1 }, { ...cardBox(target), opacity: 1, offset: 1 - HANDOFF_SHARE }, { ...cardBox(target), opacity: 0 }], {
          duration: shrink / (1 - HANDOFF_SHARE),
          easing: ease,
          fill: "forwards",
        });
        close.onfinish = () => setPhase("done");
      }, expand + holdMs),
    );

    // 사용자가 무엇이든 하면 바로 끝낸다 — 인트로가 화면을 붙들면 안 된다
    const stop = () => {
      for (const t of timers) window.clearTimeout(t);
      for (const a of anims) a.cancel();
      close?.cancel();
    };
    const skip = () => {
      stop();
      setPhase("done");
    };
    const opts = { passive: true, capture: true } as const;
    const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    for (const e of events) window.addEventListener(e, skip, opts);
    return () => {
      for (const e of events) window.removeEventListener(e, skip, opts);
      stop();
    };
  }, [phase, targetId, holdMs]);

  if (phase !== "play") return null;
  return (
    <div ref={layer} aria-hidden className="fixed z-[70] overflow-hidden bg-ink text-on-ink" style={{ opacity: 0 }}>
      {all.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={u}
          ref={(n) => {
            imgs.current[i] = n;
          }}
          src={u}
          alt=""
          decoding="async"
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-slow will-change-transform", slide === i ? "opacity-100" : "opacity-0")}
        />
      ))}
      {/* 글자 자리만 아래에서 어둡게 받친다 — 그림은 가리지 않는다. 글과 함께 들고 난다 */}
      <span
        className={cn("absolute inset-x-0 bottom-0 h-[60%] transition-opacity duration-slow", showText ? "opacity-100" : "opacity-0")}
        style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--ink) 90%, transparent), color-mix(in oklab, var(--ink) 65%, transparent) 45%, transparent)" }}
      />
      <div className={cn("absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-[14vh] text-center transition-[opacity,transform] duration-slow ease-out-emph", showText ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0")}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-acc px-3.5 py-1.5 text-[14px] font-bold text-on-ink">
          <TrophyIcon size={16} strokeWidth={2.2} />
          {badge}
        </span>
        <span className="text-[34px] font-black leading-tight tracking-[-0.03em] [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] sm:text-[56px]">{title}</span>
      </div>
    </div>
  );
}
