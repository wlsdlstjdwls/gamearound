"use client";
// 휴대폰 웹의 "홈 화면에 추가" 띠(2026-10-30, fitin-app 의 "앱에서 열기" 띠를 본떴다). 우리는 스토어 앱이 없고 PWA(app/manifest)가 곧 앱이다.
//
// 쓸모: iOS 는 홈 화면에서 연 창에서만 웹푸시를 받는다 — 찜 할인 알림을 받으려면 설치가 먼저다. 안드로이드는 설치 창을 바로 띄운다.
// 어디서: 650px 이하(바닥 탭바가 서는 폭) + 홈, 찜, 가격 알림 화면. 알림을 받고 싶어지는 자리다. 모든 화면 첫 줄을 차지하지 않는다.
// 언제 안 뜨나: 이미 홈 화면에서 연 창, 설치 길이 없는 브라우저(안드로이드인데 설치 창 이벤트가 안 온 경우 — 인앱 브라우저 등),
//   닫은 뒤 7일(lib/pwa INSTALL_BANNER_SNOOZE_DAYS).
// 모양: 고정 오버레이가 아니라 머리띠 위에 흐름으로 서서 본문을 민다 — 가리지 않는다. 스크롤하면 같이 올라가고 머리띠만 붙는다.
// 저장소(localStorage)는 막혀 있을 수 있다(사파리 사생활 보호) — 그때는 "닫은 적 없음" 으로 보고, 닫기는 이 탭에서만 먹는다.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandSymbol } from "@/components/ui/logo";
import { XIcon } from "@/components/ui/icons";
import { INSTALL_MESSAGES as M } from "@/lib/messages";
import { INSTALL_BANNER_DISMISS_KEY, INSTALL_BANNER_SNOOZE_DAYS, isIos, isStandalone } from "@/lib/pwa";
import { ROUTES } from "@/lib/routes";

/** 띠가 서는 화면 — 머리말 "어디서" */
const BANNER_PATHS: readonly string[] = [ROUTES.home, ROUTES.wishlist, ROUTES.alerts];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 크롬 계열이 설치 가능할 때 쏘는 이벤트. 표준 DOM 타입에 아직 없다 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(INSTALL_BANNER_DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < INSTALL_BANNER_SNOOZE_DAYS * DAY_MS;
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const pathname = usePathname();
  // ios: 손으로 하는 안내, prompt: 설치 창을 띄울 수 있음, null: 띠 없음
  const [mode, setMode] = useState<"ios" | "prompt" | null>(null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    // iOS 판정은 마운트 뒤에만 알 수 있다(서버 렌더에는 navigator 가 없다) — 효과 안 setState 는 그래서다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIos()) setMode("ios");
    const onPrompt = (e: Event) => {
      // 크롬 기본 미니 띠를 끄고 우리 띠의 "추가" 가 같은 창을 띄운다
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode || !BANNER_PATHS.includes(pathname)) return null;

  const dismiss = () => {
    setMode(null);
    try {
      localStorage.setItem(INSTALL_BANNER_DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장 못 하면 이 탭에서만 닫힌다 — 머리말 마지막 줄
    }
  };
  const add = () => {
    if (mode === "ios" || !prompt) {
      setOpen((o) => !o);
      return;
    }
    void prompt.prompt();
    void prompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") setMode(null);
    });
  };

  return (
    <div role="region" aria-label={M.region} className="animate-fade-in border-b border-line-soft bg-surface tab:hidden">
      <div className="flex items-center gap-3 py-2 pl-4 pr-1.5">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2">
          <BrandSymbol size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <strong className="truncate text-[13.5px] font-bold text-ink">{M.title}</strong>
          <span className="truncate text-[12px] text-mut">{M.body}</span>
        </span>
        <button type="button" onClick={add} aria-expanded={mode === "ios" ? open : undefined} className="press h-8 shrink-0 rounded-full bg-acc px-4 text-[13px] font-bold text-on-ink">
          {M.add}
        </button>
        <button type="button" onClick={dismiss} aria-label={M.close} className="press tap grid size-11 shrink-0 place-items-center text-dim">
          <XIcon size={18} />
        </button>
      </div>
      {open && (
        <ol className="animate-rise flex flex-col gap-1 px-4 pb-3 pl-[64px] text-[12.5px] text-ink-2">
          {M.iosSteps.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="font-bold text-acc">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
