// 내 알림 목록 — 한 줄에 "무엇을, 어떤 조건으로, 지금 어디까지 왔나" 를 다 적는다(2026-10-07 고도화).
//
// 전에는 제목과 조건 글 한 줄뿐이라, 알림을 걸어 둔 게임이 지금 얼마인지 보려면 게임마다 상세를 열어야 했다.
// 지금 상태는 services/alerts 가 lib/alerts/condition 으로 판정해 온다 — 발송과 같은 규칙이라
// "조건 충족" 으로 보이는데 알림이 안 오는 일이 없다(가격이 **내려간 순간**에만 보낸다는 점은 각주가 말한다).
//
// 조건에 맞는 줄은 초록 면 배지로 세운다. 이 화면에서 초록은 "싸다, 충족" 하나만 말한다(globals.css 의 --ok 주석).
// 꺼 둔 알림은 흐리게 두되 지우지 않는다 — 다시 켤 자리가 같은 줄에 있어야 한다.
import Link from "next/link";
import { AlertItemControls } from "@/components/alert-form";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Clamp } from "@/components/ui/tooltip";
import { DiscountText } from "@/components/ui/discount";
import { formatPrice } from "@/lib/currency";
import { formatDate, PLATFORM_LABEL } from "@/lib/format";
import { ALERT_MESSAGES as M, conditionText, gapText } from "@/lib/alerts/messages";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { gamePath, ROUTES } from "@/lib/routes";
import type { AlertView } from "@/server/services/alerts";

function Cover({ src }: { src: string | null }) {
  const box = "h-[54px] w-[96px] shrink-0 rounded-[var(--radius-inset)]";
  const fallback = <ImageFallback label="" className={box} />;
  if (!src) return fallback;
  return <FadeImage src={src} alt="" width={96} height={54} unoptimized className={cn(box, "object-cover shadow-hair")} fallback={fallback} />;
}

function StatusLine({ v }: { v: AlertView }) {
  const { best, met, gap } = v.status;
  if (!best || best.currentPrice === null) return <p className="text-[12.5px] text-dim">{M.priceUnknown}</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
      {met && <span className="rounded-full bg-ok-soft px-2 py-[3px] text-[11.5px] font-bold leading-none text-ok shadow-[inset_0_0_0_1px_var(--ok-line)]">{M.metLabel}</span>}
      <span className="text-mut">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
      {best.discountPct ? (
        <span className="font-bold text-acc">
          <DiscountText pct={best.discountPct} />
        </span>
      ) : null}
      <span className="text-[14px] font-extrabold tracking-[-0.02em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
      {!met && gap && <span className="text-dim">| {gapText(gap)}</span>}
    </p>
  );
}

export function AlertList({ views }: { views: AlertView[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {views.map((v, i) => (
        <li
          key={v.id}
          className={cn(
            "enter-item flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-md)] bg-surface p-3.5 shadow-[var(--elev-card)] sm:flex-nowrap",
            !v.isActive && "opacity-60",
          )}
          style={stagger(i)}
        >
          <Link href={gamePath(v.game.slug)} tabIndex={-1} aria-hidden className="shrink-0">
            <Cover src={v.game.coverUrl} />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link href={gamePath(v.game.slug)} className="text-[15px] font-bold tracking-[-0.02em] text-ink hover:text-acc">
              <Clamp>{v.game.title}</Clamp>
            </Link>
            <p className="text-[12px] text-dim">
              {[v.platform ? PLATFORM_LABEL[v.platform] ?? v.platform : M.allPlatforms, conditionText(v.minDiscountPct, v.targetPrice), v.isActive ? null : M.paused]
                .filter(Boolean)
                .join(" | ")}
            </p>
            <StatusLine v={v} />
          </div>
          {/* 오른쪽 끝: 마지막 알림, 조건 바꾸기, 켜기/끄기, 지우기. 좁은 화면에서는 아랫줄로 내려가 한 줄을 다 쓴다 */}
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5">
            <span className="text-[11.5px] text-dim">{v.lastSentAt ? M.lastSent(formatDate(v.lastSentAt)) : M.neverSent}</span>
            <div className="flex items-center gap-1">
              <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(v.game.slug)}`} className="press tap mr-1.5 inline-flex items-center text-[12.5px] font-semibold text-acc hover:underline">
                {M.editCondition}
              </Link>
              <AlertItemControls id={v.id} isActive={v.isActive} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
