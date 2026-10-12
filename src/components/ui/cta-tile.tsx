// 목록 격자 끝의 "나도 올려 보세요" 칸 — 점선 테두리 + 더하기 동그라미.
//
// 인디 목록과 매장 찾기가 같이 쓴다. 글이 몇 장 안 되는 동안 격자의 빈자리를 메우면서
// 올리는 길을 한 번 더 건넨다. 점선인 이유: 흰 판으로 세우면 진짜 항목 하나로 읽힌다.
import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * compact: 격자 이웃이 낮은 카드(매장 찾기의 글자 두 줄)일 때. 220px 칸이 그 옆에 서면 줄 높이를 혼자 끌어올린다.
 * cn 은 클래스를 합치기만 하고 겹친 값을 고르지 않아서 className 으로 min-h 를 덮을 수 없다 — 그래서 값으로 받는다.
 */
export function CtaTile({ href, title, body, compact = false }: { href: string; title: string; body: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "press flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed border-line-strong px-6 text-center transition-colors duration-fast hover:border-acc hover:bg-acc-soft",
        compact ? "min-h-[96px] py-5" : "min-h-[220px] py-8",
      )}
    >
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-acc-soft text-acc">
        <PlusIcon size={20} />
      </span>
      <span className="text-[15px] font-bold text-ink">{title}</span>
      <span className="max-w-[260px] text-[12.5px] leading-[1.6] text-mut">{body}</span>
    </Link>
  );
}
