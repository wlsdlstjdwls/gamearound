// /alerts — 가격 알림 관리 (§7). ?game=<slug> 가 있으면 해당 게임 대상 폼을 상단에 표시한다.
//
// 2026-10-07 고도화(사용자: "디자인 개선하고 고도화"):
// - 머리에 숫자 셋(켜 둔 알림, 지금 조건 충족, 최근 7일 보낸 알림). 알림 화면에 들어오는 사람의 첫 질문은 "뭐가 왔나" 다.
// - 이 기기에 푸시를 안 켰으면 맨 위에 경고 띠. 알림을 만들어도 아무것도 안 오는 상태를 모르고 기다리는 게 가장 나쁘다.
//   기기 수가 아니라 계정의 구독 수로 판단한다(서버에서 알 수 있는 건 그것뿐) — 0이면 확실히 안 온다.
// - 목록이 지금 가격과 조건까지의 거리를 말한다(components/alerts/alert-list).
// - 이미 알림이 있는 게임으로 들어오면 폼이 그 값으로 채워진 "조건 바꾸기" 로 열린다.
//
// 2026-10-27(사용자: "푸시 켜기, 푸시 설정 겹치는 거 아님? 합쳐 봐"): 푸시로 가는 길은 하나만 선다.
// 맨 아래 발송 규칙 각주(하루 두 번 확인, 내려간 순간에 보낸다)는 2026-10-27 걷었다(사용자: "지워도 될 듯"). 같은 규칙은 이용약관 알림 조항이 말한다.
// 이 기기에 푸시가 꺼져 있으면 띠(종이 흔들린다)의 "푸시 켜기", 켜져 있으면 머리의 작은 "푸시 설정" 이다. 둘이 같이 서던 때는 같은 화면으로 가는 단추가 둘이었다.
import type { Metadata } from "next";
import Link from "next/link";
import { AlertForm, type AlertInitial } from "@/components/alert-form";
import { AlertList } from "@/components/alerts/alert-list";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
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
          pushCount > 0 ? (
            <Link href={ROUTES.settings} className={buttonClass({ variant: "ghost", size: "sm", className: "rounded-full" })}>
              <BellIcon size={15} />
              {M.pushSettings}
            </Link>
          ) : undefined
        }
      >
        <p className="text-[14px] text-mut">{M.lead}</p>
      </PageHead>

      {pushCount === 0 && (
        <div role="status" className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-acc-soft px-4 py-3">
          <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-2">
            <span aria-hidden className="bell-ring grid size-8 shrink-0 place-items-center rounded-full bg-surface text-acc shadow-1">
              <BellIcon size={16} />
            </span>
            {M.pushOff}
          </p>
          <Link href={ROUTES.settings} className={buttonClass({ size: "sm", variant: "accent" })}>
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
          {/* 개수는 게임 수다 — 목록이 플랫폼 행을 게임 한 줄로 묶어 보인다(components/alerts/alert-list) */}
          <SectionHead title={M.listTitle} note={`${new Set(views.map((v) => v.game.id)).size.toLocaleString("ko-KR")}개`} />
          <AlertList views={views} />
        </section>
      )}

    </Page>
  );
}
