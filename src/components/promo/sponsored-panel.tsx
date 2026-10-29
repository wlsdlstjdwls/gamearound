// 유료 자리의 판(2026-10-29). 옅은 파랑 면 + 꼬리표 아이콘 머리. 홍보 게시판 고정 카드(promo-pins)에서 시작했고,
// 사용자가 그 모양을 마음에 들어 해 인디 목록 "주목할 게임" 도 같은 판에 올렸다 — 돈을 낸 자리는 어느 화면에서나 같은 얼굴이어야 알아본다.
// 카드마다의 "광고" 표시는 부르는 쪽이 단다(표시광고법). 누런색, 채운 딱지는 쓰지 않는다(10-27 화면 검수 원칙).
import { TagIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function SponsoredPanel({ id, title, className, children }: { id: string; title: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3 rounded-[var(--radius-panel)] bg-acc-soft p-3 sm:p-4", className)}>
      <h2 id={id} className="flex items-center gap-1.5 px-1 text-[14px] font-extrabold tracking-[-0.02em] text-acc">
        <TagIcon size={15} strokeWidth={2.2} />
        {title}
      </h2>
      {children}
    </section>
  );
}
