"use client";
// 남는 높이만큼 펴는 글 — 부모가 준 높이에 들어가는 줄 수까지 보여 주고, 그래도 넘칠 때만 말줄임과 말풍선을 단다.
//
// 왜 Clamp(줄 수 고정)가 아닌가(2026-11-11 사용자 "영역 충분한데 생략할 필요 없을 듯, 넘어갈 것 같으면 생략"):
// 상세 히어로의 설명은 옆 두 기둥(커버, 평점) 높이만큼 자리가 있는데 세 줄에서 잘라 아래가 비었다.
// 몇 줄이 들어가는지는 화면 폭과 옆 기둥 높이가 정해서 상수로 못 박을 수 없다 — 그래서 상자 높이를 재서 줄 수를 정한다.
//
// 쓰는 쪽 약속: 바깥 상자에 남는 높이를 준다(flex-1 min-h-0 처럼). fit 이 꺼진 폭(좁은 화면, 한 기둥)에서는 남는 높이라는
// 것이 없어 minLines 로 자른다. 줄 높이는 계산된 line-height 를 읽는다 — 글자 크기, 행간을 바꿔도 따로 고칠 값이 없다.
import { useEffect, useRef, useState } from "react";
import { useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export function FitClamp({
  children,
  minLines,
  fitQuery,
  className,
  boxClassName,
}: {
  children: string;
  /** 자리가 모자라도 이만큼은 보인다. fit 이 꺼진 폭에서는 이 줄 수로 자른다 */
  minLines: number;
  /** 이 미디어 질의가 맞을 때만 남는 높이까지 편다(예: 기둥이 나란히 서는 폭) */
  fitQuery: string;
  className?: string;
  boxClassName?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(minLines);
  const [clipped, setClipped] = useState(false);
  const { triggerProps, tooltip } = useTooltip<HTMLParagraphElement>(children, clipped);
  const { ref: textRef } = triggerProps;

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const media = window.matchMedia(fitQuery);
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 1;
      const next = media.matches ? Math.max(minLines, Math.floor(box.clientHeight / lineHeight)) : minLines;
      setLines(next);
      // 줄 수를 바꾼 뒤의 모양으로 잘림을 본다 — 다음 프레임에 잰다
      requestAnimationFrame(() => setClipped(text.scrollHeight > text.clientHeight + 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    media.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", measure);
    };
  }, [fitQuery, minLines, textRef, children]);

  return (
    <div ref={boxRef} className={boxClassName}>
      <p {...triggerProps} className={cn("overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]", className)} style={{ WebkitLineClamp: lines }}>
        {children}
      </p>
      {tooltip}
    </div>
  );
}
