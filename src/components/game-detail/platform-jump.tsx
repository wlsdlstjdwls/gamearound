"use client";
// 히어로의 플랫폼 이름 링크(목업 .plats). 누르면 그 플랫폼 가격 카드로 부드럽게 내려가고, 닿은 카드 테두리가 잠깐 빛난다(목업 .pc.fl).
//
// 맨 앵커(<a href="#...">)로는 둘 다 안 된다: 전역 scroll-behavior:smooth 는 화면 이동 때의 스크롤까지 미끄러지게 하고,
// :target 빛남은 같은 이름을 두 번 누르면 다시 돌지 않는다. 그래서 누를 때만 스크롤하고 클래스를 다시 붙인다.
// 주소의 #해시는 바꾸지 않는다 — 앱 라우터의 history 상태를 건드릴 만큼의 값이 아니다. JS 가 없으면 맨 앵커로 그대로 내려간다.
import type { ReactNode } from "react";
import { isPlainClick } from "@/components/ui/chip-nav";

/** globals.css 의 빛남 클래스. 애니메이션이 끝나면 떼서 다음 클릭에 다시 돈다 */
const FLASH_CLASS = "target-flash";

export function PlatformJump({ anchor, className, children }: { anchor: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${anchor}`}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        const target = document.getElementById(anchor);
        if (!target) return;
        e.preventDefault();
        // 움직임 줄이기 설정이면 바로 옮긴다. 빛남은 전역 킬스위치가 끈다(globals.css)
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // start 는 카드의 scroll-margin-top 을 따른다 — 목업의 center 는 휴대폰에서 키 큰 카드의 머리를 자른다
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        target.classList.remove(FLASH_CLASS);
        void target.offsetWidth; // 같은 카드를 연달아 눌러도 처음부터 다시 돌게 스타일을 한 번 흘린다
        target.classList.add(FLASH_CLASS);
        target.addEventListener("animationend", () => target.classList.remove(FLASH_CLASS), { once: true });
      }}
    >
      {children}
    </a>
  );
}
