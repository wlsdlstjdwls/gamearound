// /alerts — 가격 알림 관리 (§7). ?game=<slug> 가 있으면 해당 게임 대상 새 알림 폼을 상단에 표시
import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORM_LABEL } from "@/lib/format";
import { findGameBySlug, listAlerts } from "@/server/services/alerts";
import { AlertForm, AlertItemControls } from "@/components/alert-form";

export const metadata: Metadata = { title: "가격 알림" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ game?: string | string[] }> }) {
  const sp = await searchParams;
  const slug = typeof sp.game === "string" ? sp.game.trim() : "";
  const [game, alerts] = await Promise.all([slug ? findGameBySlug(slug) : Promise.resolve(null), listAlerts()]);

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-bold">가격 알림</h1>
        <p className="text-sm text-slate-400">{alerts.length}개</p>
      </header>

      {slug && !game && (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          &lsquo;{slug}&rsquo; 게임을 찾을 수 없습니다.
        </p>
      )}
      {game && <AlertForm game={{ id: game.id, slug: game.slug, title: game.titleKo ?? game.titleEn }} />}

      <p className="text-xs text-slate-500">
        가격 수집은 4시간 간격이며 정확한 시각을 보장하지 않습니다. 알림은 할인율이 조건 이상이고 직전보다 가격이 내려갔을 때 웹푸시로 발송됩니다.
        푸시 수신 설정은 <Link href="/settings" className="text-amber-300 hover:underline">설정</Link>에서 켤 수 있습니다.
      </p>

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-10 text-center text-slate-400">
          등록된 알림이 없습니다. 게임 상세 페이지나 <Link href="/wishlist" className="text-amber-300 hover:underline">위시리스트</Link>에서 알림을 만들 수 있습니다.
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/60">
          {alerts.map((a) => (
            <li key={a.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${a.isActive ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/games/${a.game.slug}`} className="block truncate font-medium hover:text-amber-300">
                  {a.game.titleKo ?? a.game.titleEn}
                </Link>
                <p className="text-xs text-slate-400">
                  {a.platform ? PLATFORM_LABEL[a.platform] ?? a.platform : "전체 플랫폼"} · 할인 {a.minDiscountPct ?? 1}% 이상
                </p>
              </div>
              <AlertItemControls id={a.id} isActive={a.isActive} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
