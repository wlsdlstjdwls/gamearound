// /alerts — 가격 알림 관리 (§7). ?game=<slug> 가 있으면 해당 게임 대상 새 알림 폼을 상단에 표시
import type { Metadata } from "next";
import Link from "next/link";
import { AlertForm, AlertItemControls } from "@/components/alert-form";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead, ROWS, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
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
    <Page gap={30}>
      <PageHead
        title="가격 알림"
        note={`활성 ${active}개 | 일시중지 ${alerts.length - active}개`}
        action={
          <Link href={ROUTES.settings} className={buttonClass({ variant: "secondary", className: "rounded-full" })}>
            푸시 설정
          </Link>
        }
      />

      {slug && !game && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-semibold text-danger">
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
          description="게임 상세의 '할인 알림 받기' 버튼에서 조건을 만들 수 있습니다."
          action={{ href: ROUTES.game, label: "게임 목록으로" }}
        />
      ) : (
        <section className="flex flex-col gap-3.5">
          <SectionHead title="내 알림" />
        <ul className={ROWS}>
          {alerts.map((a, i) => (
            <li
              key={a.id}
              className={`enter-item flex flex-wrap items-center gap-x-4 gap-y-2 py-[15px] ${a.isActive ? "" : "opacity-55"}`}
              style={stagger(i)}
            >
              <div className="min-w-0 flex-1">
                <Link href={`/games/${a.game.slug}`} className="block text-[14px] font-bold tracking-[-0.02em] text-ink hover:text-acc">
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
        </section>
      )}

      <p className="max-w-[700px] text-[12px] leading-[1.85] text-dim">
        {COLLECT_SCHEDULE_TEXT} {ALERT_RULE_TEXT} 푸시 수신 설정은{" "}
        <Link href={ROUTES.settings} className="text-acc hover:underline">
          설정
        </Link>
        에서 켤 수 있습니다.
      </p>
    </Page>
  );
}
