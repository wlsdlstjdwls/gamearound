"use client";
// 관리자 화면 본문 부품의 휴대폰 꼴(2026-10-30, 사용자 "모바일 구조에 맞게 변형"). 넓은 화면 꼴은 screen/layout 이고, 그쪽이 휴대폰이면 이것을 부른다.
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { MobileDetailContext } from "@/components/admin/screen/mobile-detail";
import { MobileToolButtons } from "@/components/admin/screen/mobile-tools";

/**
 * 휴대폰 조회조건 — 접어서 시작한다. 칸 둘셋이 한 줄씩 서면 첫 화면의 절반이 조건이라 목록이 아래로 밀렸다.
 * 휴대폰에서는 거의 기본 조건으로 보고, 바꿀 때만 편다. 접어도 칸은 그대로 살아 있다(hidden) — 걸어 둔 값이 남는다.
 */
export function MobileSearchBand({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section aria-label={label} className="rounded-xl border border-line bg-surface-2">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="press flex min-h-11 w-full items-center gap-1.5 px-3 text-[13.5px] font-bold text-ink">
        <ChevronDownIcon size={15} className={cn("text-dim transition-transform duration-base", !open && "-rotate-90")} />
        {label}
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-2 border-t border-line px-3 pb-3 pt-2.5">
        {children}
      </div>
    </section>
  );
}

/**
 * 휴대폰 목록+상세. 목록만 세우고 상세는 카드를 누를 때 바닥 시트로 올린다 — 위아래로 쌓으면 상세가 긴 목록 끝에 붙어
 * 고른 카드의 상세를 보려면 목록을 끝까지 내려야 했다. 툴바 저장은 시트 머리에도 세운다 — 시트가 바닥 툴바 띠를 덮는다(screen/mobile-tools)
 */
export function MobileMasterDetail({ list, detail, detailTitle, detailActions }: { list: React.ReactNode; detail: React.ReactNode; detailTitle?: React.ReactNode; detailActions?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileDetailContext value={() => setOpen(true)}>
      <div className="min-w-0">{list}</div>
      <Sheet
        title={typeof detailTitle === "string" && detailTitle ? detailTitle : SM.detail}
        open={open}
        onOpenChange={setOpen}
        actions={
          <>
            {detailActions}
            <MobileToolButtons compact />
          </>
        }
      >
        <div className="flex flex-col gap-2.5 pb-2">{detail}</div>
      </Sheet>
    </MobileDetailContext>
  );
}
