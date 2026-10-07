// /alerts — 가격 알림 관리 (§7). ?game=<slug> 가 있으면 해당 게임 대상 폼을 상단에 표시한다.
//
// 2026-10-07 고도화(사용자: "디자인 개선하고 고도화"):
// - 머리에 숫자 셋(켜 둔 알림, 지금 조건 충족, 최근 7일 보낸 알림). 알림 화면에 들어오는 사람의 첫 질문은 "뭐가 왔나" 다.
// - 이 기기에 푸시를 안 켰으면 맨 위에 경고 띠. 알림을 만들어도 아무것도 안 오는 상태를 모르고 기다리는 게 가장 나쁘다.
//   기기 수가 아니라 계정의 구독 수로 판단한다(서버에서 알 수 있는 건 그것뿐) — 0이면 확실히 안 온다.
// - 목록이 지금 가격과 조건까지의 거리를 말한다(components/alerts/alert-list).
// - 이미 알림이 있는 게임으로 들어오면 폼이 그 값으로 채워진 "조건 바꾸기" 로 열린다.
import type { Metadata } from "next";
import Link from "next/link";
import { AlertForm, type AlertInitial } from "@/components/alert-form";
import { AlertList } from "@/components/alerts/alert-list";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
import { ALERT_RULE_TEXT, COLLECT_SCHEDULE_TEXT } from "@/lib/freshness";
import { ROUTES } from "@/lib/routes";
import { ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { conditionMode } from "@/lib/alerts/condition";
import { cn } from "@/lib/cn";
import { findGameBySlug, findMyAlertForGame, listAlertViews } from "@/server/services/alerts";
import { getMyProfile, isPersonalized } from "@/server/services/profiles";
import { countMyPushSubscriptions } from "@/server/services/push";
import { alertDefaults } from "@/lib/onboarding/personal";

export const metadata: Metadata = { title: M.title };

/** 머리 숫자 한 칸. 지금 조건에 맞는 칸만 초록 — 그 숫자가 이 화면에서 유일하게 "행동할 이유" 다 */
function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-[var(--radius-md)] px-4 py-3.5", tone === "ok" && value > 0 ? "bg-ok-soft" : "bg-surface shadow-[var(--elev-1)]")}>
      <span className="text-[12px] text-dim">{label}</span>
      <span className={cn("text-[24px] font-extrabold leading-none tracking-[-0.03em]", tone === "ok" && value > 0 ? "text-ok" : "text-ink")}>{value.toLocaleString("ko-KR")}</span>
    </div>
  );
}

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ game?: string | string[] }> }) {
  const sp = await searchParams;
  const slug = typeof sp.game === "string" ? sp.game.trim() : "";
  const [game, overview, profile, pushCount] = await Promise.all([
    slug ? findGameBySlug(slug) : Promise.resolve(null),
    listAlertViews(),
    getMyProfile(),
    countMyPushSubscriptions(),
  ]);
  const existing = game ? await findMyAlertForGame(game.id) : null;
  const initial: AlertInitial | undefined = existing
    ? {
        platform: existing.platform ?? "all",
        mode: conditionMode({ minDiscountPct: existing.minDiscountPct, targetPrice: existing.targetPrice }),
        minDiscountPct: existing.minDiscountPct,
        targetPrice: existing.targetPrice,
      }
    : undefined;
  // 개인화를 끈 사람의 값은 남아 있어도 읽지 않는다(profiles 의 isPersonalized 주석)
  const defaults = isPersonalized(profile) ? alertDefaults(profile) : undefined;
  const { views } = overview;

  return (
    <Page gap={26}>
      <PageHead
        title={M.title}
        action={
          <Link href={ROUTES.settings} className={buttonClass({ variant: "secondary", className: "rounded-full" })}>
            {M.pushSettings}
          </Link>
        }
      />

      {pushCount === 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-warn-soft px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-warn">
            <BellIcon size={16} />
            {M.pushOff}
          </p>
          <Link href={ROUTES.settings} className={buttonClass({ size: "sm", variant: "secondary" })}>
            {M.pushOffAction}
          </Link>
        </div>
      )}

      {views.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label={M.statActive} value={overview.active} />
          <Stat label={M.statMet} value={overview.metNow} tone="ok" />
          <Stat label={M.statSent} value={overview.sentRecent} />
        </div>
      )}

      {slug && !game && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-semibold text-danger">
          {M.notFound(slug)}
        </p>
      )}

      {game && (
        <AlertForm
          // 다른 게임으로 넘어오면 폼 상태를 새로 세운다 — 같은 자리라 React 가 옛 게임의 값을 이어 쓴다
          key={game.id}
          game={{
            id: game.id,
            slug: game.slug,
            title: game.titleKo ?? game.titleEn,
            coverUrl: game.coverUrl,
            priceNote: game.titleKo ? game.titleEn : null,
          }}
          defaults={defaults}
          initial={initial}
        />
      )}

      {views.length === 0 ? (
        <EmptyState title={M.emptyTitle} description={M.emptyDescription} action={{ href: ROUTES.game, label: M.emptyAction }} />
      ) : (
        <section className="flex flex-col gap-3.5">
          <SectionHead title={M.listTitle} note={`${views.length.toLocaleString("ko-KR")}개`} />
          <AlertList views={views} />
        </section>
      )}

      <p className="max-w-[700px] text-[12px] leading-[1.85] text-dim">
        {COLLECT_SCHEDULE_TEXT} {ALERT_RULE_TEXT}
      </p>
    </Page>
  );
}
