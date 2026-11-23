"use client";
// 남는 높이만큼 펴는 글 — 부모가 준 높이에 들어가는 줄 수까지 보여 주고, 그래도 넘칠 때만 말줄임과 말풍선을 단다.
//
// 왜 Clamp(줄 수 고정)가 아닌가(2026-11-11 사용자 "영역 충분한데 생략할 필요 없을 듯, 넘어갈 것 같으면 생략"):
// 상세 히어로의 설명은 옆 두 기둥(커버, 평점) 높이만큼 자리가 있는데 세 줄에서 잘라 아래가 비었다.
// 몇 줄이 들어가는지는 화면 폭과 옆 기둥 높이가 정해서 상수로 못 박을 수 없다 — 그래서 상자 높이를 재서 줄 수를 정한다.
//
// 쓰는 쪽 약속: 바깥 상자에 남는 높이를 준다(flex-1 min-h-0 처럼). fit 이 꺼진 폭(좁은 화면, 한 기둥)에서는 남는 높이라는
// 것이 없어 minLines 로 자른다. 줄 높이는 계산된 line-height 를 읽는다 — 글자 크기, 행간을 바꿔도 따로 고칠 값이 없다.
//
// more 를 주면(2026-11-23 사용자 "설명 생략한 거 좋은데 뒤에 더보기 버튼, 팝업으로") 잘렸을 때 "더보기" 단추가 서고
// 전체 글은 시트(데스크톱 가운데 팝업, 모바일 바닥 시트)로 연다. 그때는 말풍선을 걷는다 — 긴 설명 전체가 마우스를 따라 뜨는 말풍선은 읽을 거리가 아니다.
// 단추는 보이는 마지막 줄 맨 오른쪽에 글 위로 겹쳐 선다(같은 날 "3번째 줄 맨 오른쪽에") — 왼쪽으로 바탕색이 번져 가려진 글 끝이 자연스럽게 사라진다.
// 줄을 따로 먹지 않으니 상자 높이 계산이 그대로다.
// 단추는 잘렸을 때만 선다(같은 날 사용자 "생략할 게 없는데 더보기는 왜 나오냐"). 넓은 화면에서 왼쪽 기둥이 길어 설명이 다 들어가면 단추가 없다.
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { toBlocks } from "@/lib/paragraphs";

/** 더보기 단추 글자 */
const MORE_LABEL = "더보기";

export function FitClamp({
  children,
  minLines,
  fitQuery,
  className,
  boxClassName,
  more,
}: {
  children: string;
  /** 자리가 모자라도 이만큼은 보인다. fit 이 꺼진 폭에서는 이 줄 수로 자른다 */
  minLines: number;
  /** 이 미디어 질의가 맞을 때만 남는 높이까지 편다(예: 기둥이 나란히 서는 폭) */
  fitQuery: string;
  className?: string;
  boxClassName?: string;
  /** 주면 잘렸을 때 "더보기" 단추와 전체 글 팝업을 단다. 값은 팝업 제목이다 */
  more?: { title: string };
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(minLines);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);
  const { triggerProps, tooltip } = useTooltip<HTMLParagraphElement>(children, clipped && !more);
  const { ref: textRef } = triggerProps;

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const media = window.matchMedia(fitQuery);
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 1;
      setLines(media.matches ? Math.max(minLines, Math.floor(box.clientHeight / lineHeight)) : minLines);
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
      <div className="relative w-fit max-w-full">
        <p {...triggerProps} className={cn("overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]", className)} style={{ WebkitLineClamp: lines }}>
          {children}
        </p>
        {more && clipped && (
          // 글과 같은 줄 높이로 마지막 줄 위에 선다. 왼쪽 2.5em 은 바탕색으로 번지는 면 — 글이 단추 밑으로 잘려 들어가는 자리를 가린다
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-inset absolute bottom-0 right-0 bg-[linear-gradient(to_right,transparent,var(--bg)_2.5em)] pl-[3em] text-[14px] font-semibold leading-[1.6] text-ink-2 underline decoration-ink-2/50 underline-offset-4 transition-colors duration-fast hover:text-ink hover:decoration-ink"
          >
            {MORE_LABEL}
          </button>
        )}
      </div>
      {tooltip}
      {more && clipped && (
        <Sheet title={more.title} open={open} onOpenChange={setOpen}>
          {/* 소제목과 문단으로 나누고(lib/paragraphs), 한 줄 길이를 줄여 읽는 눈이 덜 헤매게 한다(2026-11-23 사용자 "팝업 가독성").
              break-keep: 한국어 낱말이 줄 끝에서 둘로 쪼개지지 않게 */}
          {/* 따로 스크롤 상자를 두지 않는다 — 시트 본문이 이미 굴러가는 상자라, 안에 하나 더 두면 휠이 어느 상자에 걸리는지가 손 위치에 따라 갈려
              "휠로 스크롤이 안 된다" 가 났다(2026-11-23 사용자). 높이는 최소 높이로 고정해 짧은 글도 같은 크기의 팝업이 서고(같은 날 "높이 늘려서 고정"),
              그보다 길면 시트 본문이 굴러간다. 최소 높이는 팝업 상한(80vh)에서 머리와 여백을 뺀 값을 넘지 않는다 — 넘으면 글이 짧아도 스크롤이 생겼다(같은 날 사용자) */}
          <div className="flex min-h-[min(calc(80vh-7.5rem),680px)] max-w-[34em] flex-col gap-4 pb-2 pt-3 text-[15.5px] leading-[1.85] tracking-[-0.01em] text-ink-2 break-keep">
            {toBlocks(children).map((b, i) =>
              b.kind === "heading" ? (
                <h3 key={i} className="-mb-2 pt-1 text-[16px] font-extrabold leading-[1.5] text-ink first:pt-0">
                  {b.text}
                </h3>
              ) : b.kind === "marked" ? (
                // 줄바꿈 없는 옛 데이터의 표식 문단 — 소제목 끝을 모르니 표식(♦) 글자를 그대로 둔 문단이다. 마름모 그림으로 바꿨다가 "특수문자가 잘린다" 로 읽혔다(2026-11-23)
                <p key={i}>{b.text}</p>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
