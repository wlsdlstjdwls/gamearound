"use client";
// 접어 둔 조각을 펴는 "+N" 버튼(2026-09-30, 사용자: "3개 플랫폼 이상일 때는 더보기 버튼 같은걸로").
//
// 조각은 서버가 그려 children 으로 넘긴다 — 이 파일은 "폈나" 하나만 들고 있다.
// 누르면 버튼 자리에 조각이 선다(접기는 두지 않는다). 카드에서 다시 접을 일이 없고,
// 접기 버튼이 남으면 펼친 줄 끝에 누를 것이 하나 더 생겨 배지 줄이 한 번 더 접힌다.
//
// 카드 전체를 덮는 링크(game-card 의 제목 링크 ::after) 위에서 눌려야 하므로 relative z-10 이고,
// 누름이 링크로 새지 않게 preventDefault 한다.
import { useState } from "react";
import { cn } from "@/lib/cn";

export function MoreToggle({ count, label, className, children }: { count: number; label: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={false}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
      className={cn("press relative z-10 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-semibold leading-none", className)}
    >
      +{count}
    </button>
  );
}
