// 내 알림 목록 — 한 줄에 "무엇을, 어떤 조건으로, 지금 어디까지 왔나" 를 다 적는다(2026-10-07 고도화).
//
// 전에는 제목과 조건 글 한 줄뿐이라, 알림을 걸어 둔 게임이 지금 얼마인지 보려면 게임마다 상세를 열어야 했다.
// 지금 상태는 services/alerts 가 lib/alerts/condition 으로 판정해 온다 — 발송과 같은 규칙이라
// "조건 충족" 으로 보이는데 알림이 안 오는 일이 없다(가격이 **내려간 순간**에만 보낸다는 점은 각주가 말한다).
//
// 조건에 맞는 줄은 초록 면 배지로 세운다. 이 화면에서 초록은 "싸다, 충족" 하나만 말한다(globals.css 의 --ok 주석).
// 꺼 둔 알림은 흐리게 두되 지우지 않는다 — 다시 켤 자리가 같은 줄에 있어야 한다.
//
// 2026-10-26(기획서 v2.0 S-26, 목업 alv): 팝업(M-02)이 플랫폼마다 한 행씩 저장하므로, 행을 그대로 늘어놓으면
// 같은 게임이 플랫폼 수만큼 겹쳐 선다. 게임 한 줄로 묶고 플랫폼은 칩으로 적는다(lib/alerts/group).
// 묶음의 지금 상태와 미리보기는 대표 행 하나가 말한다 — 플랫폼마다 따로 적으면 한 줄이 표가 된다.
// 받는 방법(웹 알림, 이메일)도 줄에 적는다. 이메일을 골랐는데 웹 알림만 오는 줄 알면 메일함을 안 본다.
import Link from "next/link";
import { AlertGroupControls } from "@/components/alerts/group-controls";
import { AlertPreview } from "@/components/alerts/alert-preview";
import { PriceAlertButton } from "@/components/price-alert-button";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Clamp } from "@/components/ui/tooltip";
import { Tag } from "@/components/ui/tag";
import { DiscountBadge } from "@/components/ui/discount";
import { CheckIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/currency";
import { formatDate, PLATFORM_LABEL } from "@/lib/format";
import { ALERT_MESSAGES as M, PRICE_ALERT_MESSAGES, conditionText, gapText } from "@/lib/alerts/messages";
import { distinct, groupAlertsByGame, type AlertGroup } from "@/lib/alerts/group";
import { alertProgress } from "@/lib/alerts/condition";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { gamePath, ROUTES } from "@/lib/routes";
import type { AlertView } from "@/server/services/alerts";

function Cover({ src }: { src: string | null }) {
  // 커버를 키웠다(2026-10-28 사용자 "밋밋하다") — 96x54 에서는 무슨 게임인지 그림으로 안 읽혔다
  const box = "h-[60px] w-[112px] shrink-0 rounded-[var(--radius-inset)] sm:h-[72px] sm:w-[136px]";
  const fallback = <ImageFallback label="" className={box} />;
  if (!src) return fallback;
  return <FadeImage src={src} alt="" width={136} height={72} unoptimized className={cn(box, "object-cover shadow-hair")} fallback={fallback} />;
}

/**
 * 조건까지 얼마나 왔나를 막대로(2026-10-28). "할인율 20%p 남았어요" 같은 글만으로는 거리가 눈에 안 들어왔다.
 * 충족이면 초록으로 가득 찬다 — 이 화면에서 초록은 "충족" 하나만 말한다(파일 머리 주석).
 */
function ProgressBar({ v, index }: { v: AlertView; index: number }) {
  const p = alertProgress({ minDiscountPct: v.minDiscountPct, targetPrice: v.targetPrice }, v.status);
  if (p === null) return null;
  const pct = Math.round(p * 100);
  return (
    <div className="flex items-center gap-2.5">
      <span
        role="meter"
        aria-label={M.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-surface-2"
      >
        <span className={cn("bar-grow absolute inset-y-0 left-0 rounded-full", "bg-acc")} style={{ ["--bar-w" as string]: `${pct}%`, ...stagger(index) }} />
      </span>
      {!v.status.met && <span className="shrink-0 text-[11.5px] font-semibold text-mut">{M.progress(pct)}</span>}
    </div>
  );
}

function StatusLine({ v }: { v: AlertView }) {
  const { best, met, gap } = v.status;
  if (!best || best.currentPrice === null) return <p className="text-[12.5px] text-dim">{M.priceUnknown}</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
      {/* 조건 충족은 연한 파랑 알약 + 채운 체크(2026-10-30 사용자 "색도 그렇고 맘에 안 든다", 잉크 면은 "너무 어둡다").
          연두 알약은 개편 뒤 파랑 화면에서 혼자 튀었다. 옆 할인 배지가 채운 파랑이라 이쪽은 연한 면으로 둬서 둘이 갈린다 */}
      {met && (
        <span className="inline-flex items-center gap-1 rounded-full bg-acc-soft py-1 pl-1 pr-2 text-[11.5px] font-bold leading-none text-acc shadow-[inset_0_0_0_1px_var(--acc-3)]">
          <span aria-hidden className="grid size-3.5 place-items-center rounded-full bg-acc text-on-ink">
            <CheckIcon size={9} strokeWidth={3.5} />
          </span>
          {M.metLabel}
        </span>
      )}
      <span className="text-mut">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
      <DiscountBadge pct={best.discountPct} size="sm" />
      <span className="text-[14px] font-extrabold tracking-[-0.02em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
      {!met && gap && <span className="text-dim">| {gapText(gap)}</span>}
    </p>
  );
}

/** 묶음의 조건, 받는 방법, 꺼 둠을 한 줄로. 행마다 같으면 한 번만 적는다 */
function summary(g: AlertGroup<AlertView>): string {
  const conditions = distinct(g.items.map((v) => conditionText(v.minDiscountPct, v.targetPrice)));
  const channels = distinct(g.items.map((v) => PRICE_ALERT_MESSAGES.channel[v.channel]));
  return [conditions.join(", "), channels.join(", "), g.isActive ? null : M.paused].filter(Boolean).join(" | ");
}

/** 묶음에서 가장 최근에 보낸 시각 */
function lastSent(items: AlertView[]): Date | null {
  return items.reduce<Date | null>((acc, v) => (v.lastSentAt && (!acc || v.lastSentAt > acc) ? v.lastSentAt : acc), null);
}

export function AlertList({ views }: { views: AlertView[] }) {
  const groups = groupAlertsByGame(views);
  return (
    <ul className="flex flex-col gap-2.5">
      {groups.map((g, i) => {
        const v = g.lead;
        const sentAt = lastSent(g.items);
        return (
          <li
            key={g.gameId}
            className={cn(
              // 한 줄을 낮게(2026-10-27, 사용자: "알림 한 영역이 너무 많이 공간을 차지한다") — 제목 옆에 플랫폼, 그 아래 한 줄에 지금 값과 조건
              "enter-item lift flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[var(--radius-md)] bg-surface px-3.5 py-3 shadow-[var(--elev-card)] transition-shadow duration-base hover:shadow-[var(--elev-card-hover)] sm:flex-nowrap",
              !g.isActive && "opacity-60",
            )}
            style={stagger(i)}
          >
            <Link href={gamePath(v.game.slug)} tabIndex={-1} aria-hidden className="shrink-0">
              <Cover src={v.game.coverUrl} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={gamePath(v.game.slug)} className="min-w-0 text-[15px] font-bold tracking-[-0.02em] text-ink hover:text-acc">
                  <Clamp>{v.game.title}</Clamp>
                </Link>
                {/* 플랫폼 칩. 묶음 안에서 꺼 둔 플랫폼만 흐리게 — 묶음이 켜져 있어도 그 플랫폼은 안 온다 */}
                <ul aria-label={M.platformsLabel} className="flex flex-wrap gap-1">
                  {g.items.map((a) => (
                    <li key={a.id}>
                      <Tag className={cn(!a.isActive && "opacity-60")}>{a.platform ? PLATFORM_LABEL[a.platform] ?? a.platform : M.allPlatforms}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
              <StatusLine v={v} />
              <ProgressBar v={v} index={i} />
              <p className="text-[12px] text-dim">
                {summary(g)} | {sentAt ? M.lastSent(formatDate(sentAt)) : M.neverSent}
              </p>
            </div>
            {/* 오른쪽 끝: 마지막 알림, 미리보기, 수정, 켜기/끄기, 지우기. 좁은 화면에서는 아랫줄로 내려가 한 줄을 다 쓴다 */}
            <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
              <div className="flex items-center gap-1">
                <AlertPreview v={v} />
                {/* "수정" 은 상세에서 열던 그 팝업(M-02)을 다시 연다(기획서 S-26). 팝업은 게임 단위라 묶음과 맞는다.
                    목표가, 할인율 같은 세밀한 조건은 팝업 아래 "자세한 조건" 링크가 이 화면의 폼으로 데려간다 */}
                {v.options.length > 0 ? (
                  <PriceAlertButton
                    gameId={v.game.id}
                    gameSlug={v.game.slug}
                    gameTitle={v.game.title}
                    options={v.options}
                    label={M.edit}
                    variant="secondary"
                    size="sm"
                    slot={`list-${g.gameId}`}
                    className="mr-1"
                  />
                ) : (
                  <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(v.game.slug)}`} className="press tap mr-1.5 inline-flex items-center text-[12.5px] font-semibold text-acc hover:underline">
                    {M.editCondition}
                  </Link>
                )}
                <AlertGroupControls items={g.items.map((a) => ({ id: a.id, isActive: a.isActive }))} isActive={g.isActive} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
