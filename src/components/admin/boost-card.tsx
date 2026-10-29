// 광고 관리 화면의 광고 한 장(2026-10-29, 사용자 "광고쪽 화면도 좀 개선 필요"). 앞 판은 딱지, 제목, 기간과 숫자를 한 줄 글자로 이어 붙여
// 무엇이 언제 끝나고 얼마나 보였는지 읽으려면 줄을 끝까지 따라가야 했다.
// 카드 하나에 세 마디: 머리(상태, 출처, 제목, 회수), 기간 막대(얼마나 지났나, 며칠 남았나), 성과 칸(노출, 클릭, 클릭률).
// 대기 광고는 성과 칸 대신 "시작하면 숫자가 쌓여요" 를 둔다 — 0 을 세우면 효과가 없던 광고로 읽힌다.
import Link from "next/link";
import { PromoRevokeButton } from "@/components/admin/promo-controls";
import { BoostStateTag } from "@/components/promo/boost-state-tag";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { PROMO_MESSAGES as M, PROMO_PERFORMANCE_MESSAGES as PM, PROMO_SOURCE_LABEL } from "@/lib/promo/messages";
import type { BoostRowDto } from "@/server/services/promotions";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-inset)] bg-surface-2 px-3 py-2">
      <span className="text-[11.5px] font-semibold text-dim">{label}</span>
      <span className="text-[15px] font-bold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export function BoostCard({ row: r }: { row: BoostRowDto }) {
  const live = r.state === "active";
  const open = live || r.state === "queued";
  const ctr = r.views > 0 ? `${((r.clicks / r.views) * 100).toFixed(1)}%` : "-";

  return (
    <li className={cn("flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair", !open && "opacity-80")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <BoostStateTag state={r.state} />
            <Tag tone={r.source === "purchase" ? "plum" : "neutral"}>{PROMO_SOURCE_LABEL[r.source]}</Tag>
          </div>
          {r.targetHref ? (
            <Link href={r.targetHref} className="min-w-0 break-words text-[15px] font-bold text-ink hover:text-acc hover:underline">
              {r.targetTitle}
            </Link>
          ) : (
            <span className="text-[15px] font-bold text-dim">{r.targetTitle}</span>
          )}
          {r.note && <span className="break-words text-[12.5px] text-mut">{r.note}</span>}
          {live && !r.targetLive && <span className="text-[12.5px] font-semibold text-danger">{M.notLive}</span>}
        </div>
        {open && <PromoRevokeButton id={r.id} />}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
          <span className="text-dim">{M.period(formatDateTime(r.startsAt), formatDateTime(r.endsAt))}</span>
          {open && <span className="font-semibold text-ink">{r.state === "queued" ? M.startsLater : M.daysLeft(r.daysLeft)}</span>}
        </div>
        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={cn("h-full rounded-full", live ? "bg-acc" : "bg-line-strong")} style={{ width: `${Math.round(r.progress * 100)}%` }} />
        </div>
      </div>

      {r.state === "queued" ? (
        <p className="text-[12.5px] text-dim">{PM.queued}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Stat label={PM.views} value={r.views.toLocaleString("ko-KR")} />
          <Stat label={PM.clicks} value={r.clicks.toLocaleString("ko-KR")} />
          <Stat label={PM.ctr} value={ctr} />
        </div>
      )}
    </li>
  );
}
