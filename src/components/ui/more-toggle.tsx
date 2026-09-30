"use client";
// 접어 둔 조각을 띄우는 "+N" 버튼(2026-09-30, 사용자: "3개 플랫폼 이상일 때는 더보기 버튼 같은걸로").
//
// 조각은 서버가 그려 children 으로 넘긴다 — 이 파일은 "열렸나" 하나만 들고 있다.
//
// 펼침은 **떠 있는 판**이다(같은 날 사용자: "누르면 뒤에 추가되면서 줄바꿈 일어나는데... 드롭다운으로").
// 처음에는 버튼 자리에 조각을 그대로 폈는데, 배지 줄이 한 줄 더 늘어 카드 키가 자라고
// 같은 줄의 카드들과 값 높이가 어긋났다. 판은 자리를 차지하지 않고 카드 위에 겹쳐 뜬다.
//
// 닫기: 바깥 누름(mousedown + touchstart — 터치 기기는 mousedown 이 늦다), Esc, 버튼 다시 누름.
// 카드 전체를 덮는 링크(game-card 의 제목 링크 ::after) 위에서 눌려야 하므로 감싼 상자가 relative z-10 이고,
// 누름이 링크로 새지 않게 preventDefault 한다.
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function MoreToggle({
  count,
  label,
  className,
  wrapClassName,
  children,
}: {
  count: number;
  label: string;
  /** 버튼 모양 */
  className?: string;
  /**
   * 감싼 상자의 표시 방식 — 화면 폭에 따라 이 토글 자체를 숨길 때 쓴다(PlatformBadges 의 좁은/넓은 짝).
   * 주면 기본 inline-flex 를 **대신한다**. 둘을 같이 달면 스타일시트 순서상 inline-flex 가 hidden 을 이겨
   * 좁은 화면에 토글 두 개가 같이 섰다(2026-09-30 실측)
   */
  wrapClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} data-more-open={open || undefined} className={cn("relative z-10", wrapClassName ?? "inline-flex")}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn("press whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-semibold leading-none", className)}
      >
        +{count}
      </button>
      {open && (
        // 버튼 왼쪽 끝에 맞춰 아래로 뜬다. 배지 줄은 카드 왼쪽에서 시작해 버튼이 카드 가운데 안쪽에 서므로
        // 오른쪽 열 카드에서도 판이 화면 밖으로 안 나간다(배지 셋 폭 약 170px)
        <span
          id={panelId}
          className="animate-scale-in absolute left-0 top-[calc(100%+6px)] flex w-max max-w-[220px] origin-top-left flex-wrap gap-1 rounded-[var(--radius-md)] bg-surface p-2 shadow-3"
          // 판 안을 눌러도 카드 링크로 넘어가지 않는다
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
