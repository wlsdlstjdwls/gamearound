"use client";
// 상세 히어로가 머리띠에 가리면, 그 자리에 게임 정보를 띄운다(2026-09-22, 사용자 요청).
// 다시 히어로가 보이면 사라진다. zipgonggo 의 detail-headbar 와 같은 판이다.
//
// **스크롤 위치를 매 프레임 재지 않는다.** IntersectionObserver 하나로 판정하고, 관찰 대상은
// 히어로 자체가 아니라 그 아래 1px 센티넬이다 — 히어로가 화면보다 길어도(커버 600px + 설명)
// "가려졌나" 라는 물음이 흔들리지 않는다.
//
// **머리띠를 덮는다**(옆에 붙이거나 밑에 쌓지 않는다). 두 줄로 쌓으면 좁은 화면에서 본문이
// 시작하는 자리가 화면 절반까지 내려온다. 덮는 대신 로고를 그대로 남겨 홈으로 가는 길은 끊지 않는다 —
// 검색칸은 이 바에 없다: 지금 이 사람이 하는 일은 "이 게임을 살지 정하기" 이고, 검색은 한 번 올리면 나온다.
//
// **왼쪽은 사실, 오른쪽은 할 일이다**(2026-09-22 2차, 사용자 지정). 왼쪽에 제목과 값(정가 + 할인가),
// 그 옆에 지원 플랫폼 배지가 서고, 오른쪽 끝은 할인 알림 버튼 하나다 — 히어로의 결론 기둥이
// 위로 사라지면서 같이 사라지는 것이 그 버튼이라 여기서 대신 받는다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BrandSymbol } from "@/components/ui/logo";
import { PlatformBadges } from "@/components/platform-badges";
import { Clamp } from "@/components/ui/tooltip";
import { buttonClass } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import type { Platform } from "@/server/db/schema";

/** 머리띠 높이와 같은 값(globals.css 의 --header-h). 깎을 만큼 깎아야 "가려짐" 판정이 맞는다 */
const HEADER_H_VAR = "--header-h";
/** 토큰을 못 읽는 경우의 대비값. 좁은 화면 머리띠 높이다 */
const HEADER_H_FALLBACK = 64;

/** 뿌리를 아래로 늘이는 값. 문서 하나가 이보다 길어도 센티넬은 늘 히어로 바로 밑이라 이 안에 든다 */
const ROOT_BOTTOM_MARGIN_PX = 99999;

/** 값이 바뀔 일이 없는 구독 — "브라우저인가" 는 한 번 정해지면 끝이다 */
const subscribeNever = (): (() => void) => () => {};

function headerHeight(): number {
  if (typeof window === "undefined") return HEADER_H_FALLBACK;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(HEADER_H_VAR);
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : HEADER_H_FALLBACK;
}

export function GameHeadbar({
  title,
  price,
  listPrice,
  discountPct,
  platforms,
  alertHref,
}: {
  title: string;
  /** 이미 서식을 입힌 최저가. 통화 규칙은 lib/currency 가 갖는다 — 이 바는 글자만 받는다 */
  price: string | null;
  /** 할인 전 값. 할인이 없거나 같은 값이면 null 이고 그때는 취소선을 안 세운다 */
  listPrice: string | null;
  discountPct: number | null;
  /** 지원 플랫폼 배지. 목록 카드와 같은 컴포넌트를 쓴다 — 같은 사실을 두 모양으로 그리지 않는다 */
  platforms: Platform[];
  /** 할인 알림 주소. 무료 게임은 null 이다(히어로의 버튼과 같은 규칙 — 내려갈 자리가 없다) */
  alertHref: string | null;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  // 포털은 브라우저에만 있다(document 가 필요하다). effect 에서 setState 로 켜지 않는 이유는
  // useGuestDevice 와 같다 — 서버 그림에서 false, 브라우저에서 true 를 돌려주면 그 자체가 답이고
  // 렌더를 한 번 더 돌 필요가 없다
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // **아래쪽 여백을 크게 편다.** "안 보인다" 만으로 켜면 화면 맨 위에서도 켜진다 —
    // 센티넬은 히어로 아래에 있어 그때도 화면 밖이기 때문이다(2026-09-22 실측, 처음부터 떠 있었다).
    // 그렇다고 boundingClientRect.top 을 보는 것으로는 모자랐다: 관찰기는 **상태가 바뀔 때만** 부르는데
    // 한 번에 크게 굴리면 "아래 밖" 에서 "위 밖" 으로 곧장 넘어가 둘 다 isIntersecting=false 라 안 불린다.
    // 뿌리를 아래로 길게 늘여 두면 "아래에 있다" 가 곧 교차 상태가 되고, 교차가 끊기는 순간은
    // 위로 지나간 경우 하나뿐이다 — 물음이 다시 하나가 된다.
    const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting), {
      rootMargin: `-${headerHeight()}px 0px ${ROOT_BOTTOM_MARGIN_PX}px 0px`,
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* 흐름 안의 1px. -mt 로 자기 높이를 도로 먹어 레이아웃 간격을 바꾸지 않는다 */}
      <div ref={sentinel} className="-mt-px h-px" aria-hidden="true" />
      {mounted &&
        createPortal(
          <div
            data-on={on}
            aria-hidden={!on}
            // z-50 은 머리띠(z-40) 위다. 배경은 본문과 같은 바탕색 — 머리띠가 그렇듯 판을 두지 않는다
            className="headbar fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-line bg-bg"
          >
            <div className="mx-auto flex h-full w-full max-w-[var(--page-w)] items-center gap-3 px-5 sm:gap-4 sm:px-6">
              <Link
                href={ROUTES.home}
                aria-label={SITE.name}
                tabIndex={on ? 0 : -1}
                className="press tap inline-flex shrink-0 items-center text-ink"
              >
                <BrandSymbol size={24} />
              </Link>

              {/* 제목과 값이 위아래로 선다 — 한 줄에 몰면 값이 제목 뒤로 밀려 좁은 화면에서 먼저 잘린다 */}
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <Clamp lines={1} className="text-[14px] font-extrabold leading-tight tracking-[-0.035em] text-ink">
                  {title}
                </Clamp>
                <span className="flex min-w-0 items-center gap-2">
                  {price && (
                    <span className="flex shrink-0 items-baseline gap-1.5">
                      {/* 정가를 앞에 둔다 — 취소선이 먼저 읽혀야 그 다음 숫자가 "깎인 값" 으로 읽힌다 */}
                      {listPrice && <span className="text-[11.5px] text-dim-2 line-through">{listPrice}</span>}
                      <span className="text-[14px] font-extrabold tracking-[-0.03em] text-ink">{price}</span>
                      {discountPct ? <span className="text-[11.5px] font-bold text-acc">-{discountPct}%</span> : null}
                    </span>
                  )}
                  {/* 배지는 좁은 화면에서 접는다 — 거기서는 제목과 값이 먼저다 */}
                  <span className="hidden min-w-0 sm:flex">
                    <PlatformBadges platforms={platforms} />
                  </span>
                </span>
              </span>

              {alertHref && (
                <Link
                  href={alertHref}
                  tabIndex={on ? 0 : -1}
                  className={buttonClass({ variant: "accent", size: "sm", className: "shrink-0" })}
                >
                  할인 알림 받기
                </Link>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
