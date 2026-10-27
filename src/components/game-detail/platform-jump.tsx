"use client";
// 히어로의 플랫폼 이름 링크(목업 .plats). 누르면 그 플랫폼 가격 카드로 부드럽게 내려가고, 닿은 카드 테두리가 잠깐 빛난다(목업 .pc.fl).
//
// 맨 앵커(<a href="#...">)로는 둘 다 안 된다: 전역 scroll-behavior:smooth 는 화면 이동 때의 스크롤까지 미끄러지게 하고,
// :target 빛남은 같은 이름을 두 번 누르면 다시 돌지 않는다. 그래서 누를 때만 스크롤하고 클래스를 다시 붙인다.
// 주소의 #해시는 바꾸지 않는다 — 앱 라우터의 history 상태를 건드릴 만큼의 값이 아니다. JS 가 없으면 맨 앵커로 그대로 내려간다.
import type { ReactNode } from "react";
import { isPlainClick } from "@/components/ui/chip-nav";
import { usePlatformPick } from "@/components/game-detail/platform-pick";

/**
 * globals.css 의 빛남 표식. 애니메이션이 끝나면 떼서 다음 클릭에 다시 돈다.
 * 클래스가 아니라 속성인 이유: 이름을 누르면 그 카드를 고르기도 해서(platform-pick) 카드가 다시 그려지는데,
 * React 가 className 을 통째로 다시 써서 붙여 둔 클래스가 바로 지워졌다. React 가 그리지 않는 속성은 건드리지 않는다
 */
const FLASH_ATTR = "data-flash";
/** globals.css 의 @keyframes 이름 */
const FLASH_ANIMATION = "target-flash";

export function PlatformJump({ anchor, brand, className, children }: { anchor: string; brand?: string; className?: string; children: ReactNode }) {
  // 이름을 누르면 그 카드로 내려가며 그 플랫폼을 고른다 — 그래프와 할인 예측도 따라 바뀐다(platform-pick, 2026-10-27)
  const pick = usePlatformPick();
  return (
    <a
      href={`#${anchor}`}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        const target = document.getElementById(anchor);
        if (!target) return;
        e.preventDefault();
        if (brand) pick?.setBrand(brand);
        // 움직임 줄이기 설정이면 바로 옮긴다. 빛남은 전역 킬스위치가 끈다(globals.css)
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // start 는 카드의 scroll-margin-top 을 따른다 — 목업의 center 는 휴대폰에서 키 큰 카드의 머리를 자른다
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        target.removeAttribute(FLASH_ATTR);
        void target.offsetWidth; // 같은 카드를 연달아 눌러도 처음부터 다시 돌게 스타일을 한 번 흘린다
        target.setAttribute(FLASH_ATTR, "");
        // animationend 는 거품처럼 올라온다 — 카드 안 다른 애니메이션이 먼저 끝나도 떼지 않게 이름을 본다
        const done = (ev: AnimationEvent) => {
          if (ev.animationName !== FLASH_ANIMATION) return;
          target.removeAttribute(FLASH_ATTR);
          target.removeEventListener("animationend", done);
        };
        target.addEventListener("animationend", done);
      }}
    >
      {children}
    </a>
  );
}
