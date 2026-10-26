"use client";
// 게시판 이용 안내 시트(목업 bgd 모달). 라운지 보조 메뉴 맨 아래 단추와 라운지 홈 오른쪽 칸의 "라운지 이용 가이드" 링크가 같은 시트를 연다.
// 여는 자리마다 모양이 달라(메뉴 줄, 글자 링크) 단추 모양은 부르는 쪽이 정한다(variant).
// 문구는 lib/lounge/messages 에 둔다 — 이 파일은 "use client" 라 서버 컴포넌트가 여기서 문자열을 가져가면 안 된다(AGENTS 6장).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { BOARD_GUIDE_MESSAGES as G, LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";

const TRIGGER: Record<"menu" | "link", string> = {
  // 보조 메뉴 판 바닥 줄 — 메뉴 칸과 같은 높이, 오른쪽 꺾쇠(목업 .sdg)
  menu: "tap mt-1 flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border-t border-line-soft px-3 pt-1 text-[13px] text-mut transition-colors hover:bg-surface-2 hover:text-ink",
  link: "tap inline-flex items-center gap-0.5 text-[13px] font-semibold text-acc hover:underline",
};

export function BoardGuide({ label, variant }: { label: string; variant: "menu" | "link" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TRIGGER[variant]}>
        <span>{label}</span>
        <ChevronLeftIcon size={14} className={cn("rotate-180", variant === "link" && "-mr-1")} />
      </button>
      <Sheet title={G.title} open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-ink-2">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {G.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5 border-t border-line-soft pt-4">
            <p className="text-[14px] font-bold text-ink">{G.loungeHead}</p>
            <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-[13.5px] text-mut">
              {L.guide.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </div>
          <Button fullWidth onClick={() => setOpen(false)}>
            {G.confirm}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
