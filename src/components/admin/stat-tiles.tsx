// 관리자 화면 머리의 숫자 칸 줄(2026-10-29). 메이커 멤버십, 결제와 환불이 같이 쓴다.
// 목록만 있던 두 화면은 "지금 몇 명이 내고 있나, 이번 달 얼마가 들어왔나" 를 줄을 다 세어 봐야 알았다 — 운영자가 매일 여는 자리라 첫 줄에 숫자를 둔다.
// 칸은 링크가 아니다(누를 수 없는 숫자 칸은 길처럼 보이면 안 된다, nav-must-look-like-nav). 주의가 필요한 숫자만 tone 으로 색을 준다.
import { cn } from "@/lib/cn";

export type StatTile = { label: string; value: string; hint?: string; tone?: "danger" | "warn" };

const TONE = { danger: "text-danger", warn: "text-warn" } as const;

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-hair">
          <dt className="text-[12.5px] font-semibold text-mut">{t.label}</dt>
          <dd className={cn("text-[20px] font-extrabold tabular-nums tracking-[-0.02em] text-ink", t.tone && TONE[t.tone])}>{t.value}</dd>
          {t.hint && <dd className="text-[11.5px] leading-[1.5] text-dim">{t.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
