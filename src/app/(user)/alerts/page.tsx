// /alerts — 가격 알림 관리 (§7). ?game=<slug> 가 있으면 해당 게임 대상 새 알림 폼을 상단에 표시
import type { Metadata } from "next";
import Link from "next/link";
import { AlertForm, AlertItemControls } from "@/components/alert-form";
import { EmptyState } from "@/components/empty-state";
import { Card, Page } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { PLATFORM_LABEL } from "@/lib/format";
import { ALERT_RULE_TEXT, COLLECT_SCHEDULE_TEXT } from "@/lib/freshness";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { findGameBySlug, listAlerts } from "@/server/services/alerts";

export const metadata: Metadata = { title: "가격 알림" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ game?: string | string[] }> }) {
  const sp = await searchParams;
  const slug = typeof sp.game === "string" ? sp.game.trim() : "";
  const [game, alerts] = await Promise.all([slug ? findGameBySlug(slug) : Promise.resolve(null), listAlerts()]);
  const active = alerts.filter((a) => a.isActive).length;

  return (
    <Page width="narrow" gap={20}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">가격 알림</h1>
        <p className="text-[13px] text-dim">
          활성 {active}개 | 일시중지 {alerts.length - active}개
        </p>
      </header>

      {slug && !game && (
        <p role="alert" className="rounded-[9px] border border-danger/35 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
          &lsquo;{slug}&rsquo; 게임을 찾을 수 없습니다.
        </p>
      )}

      {game && (
        <AlertForm
          game={{
            id: game.id,
            slug: game.slug,
            title: game.titleKo ?? game.titleEn,
            coverUrl: game.coverUrl,
            priceNote: game.titleKo ? game.titleEn : null,
          }}
        />
      )}

      {alerts.length === 0 ? (
        <EmptyState
          title="등록된 알림이 없습니다"
          description="게임 상세의 '할인 알림 받기' 버튼이나 위시리스트에서 조건을 만들 수 있습니다."
          action={{ href: ROUTES.wishlist, label: "위시리스트로 이동" }}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {alerts.map((a, i) => (
              <li
                key={a.id}
                className={`enter-item flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[15px] ${a.isActive ? "" : "opacity-55"}`}
                style={stagger(i)}
              >
                <div className="min-w-0 flex-1">
                  <Link href={`/games/${a.game.slug}`} className="block text-[13.5px] font-semibold text-ink hover:text-acc">
                    <Clamp>{a.game.titleKo ?? a.game.titleEn}</Clamp>
                  </Link>
                  <p className="text-[12px] text-dim">
                    {a.platform ? PLATFORM_LABEL[a.platform] ?? a.platform : "전체 플랫폼"} | 할인 {a.minDiscountPct ?? 1}% 이상
                  </p>
                </div>
                <span className="text-[12px] text-dim">{a.isActive ? "감시 중" : "일시중지"}</span>
                <AlertItemControls id={a.id} isActive={a.isActive} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-[12px] leading-[1.8] text-dim">
        {COLLECT_SCHEDULE_TEXT} {ALERT_RULE_TEXT} 푸시 수신 설정은{" "}
        <Link href={ROUTES.settings} className="text-acc hover:underline">
          설정
        </Link>
        에서 켤 수 있습니다.
      </p>
    </Page>
  );
}
