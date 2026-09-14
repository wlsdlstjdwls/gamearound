"use client";
// 플랫폼 탭 — 상세 페이지. 정가/현재가/할인율/버전/출시일/점수/스토어 링크/갱신시각 + 신선도 배지(§4.6)
// freshness 는 서버(RSC)에서 계산해 넘긴다(캐시/하이드레이션 시각 차이 방지)
import { useId, useState } from "react";
import { formatDate, formatDateTime, formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import type { Freshness } from "@/lib/freshness";
import type { PlatformDto } from "@/server/services/games";
import { FreshnessBadge } from "@/components/freshness-badge";
import { SaleBadge } from "@/components/sale-badge";

export type PlatformTabItem = PlatformDto & { freshness: Freshness };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs text-slate-400">{label}</dt>
      <dd className="text-right text-sm text-slate-100">{children}</dd>
    </div>
  );
}

export function PlatformTabs({ platforms }: { platforms: PlatformTabItem[] }) {
  const [idx, setIdx] = useState(0);
  const baseId = useId();

  if (platforms.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
        플랫폼별 가격 정보가 아직 수집되지 않았습니다.
      </div>
    );
  }

  const current = platforms[Math.min(idx, platforms.length - 1)];
  const hasDiscount = Boolean(current.discountPct && current.discountPct > 0);
  const isStale = current.freshness === "stale";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <div role="tablist" aria-label="플랫폼 선택" className="flex overflow-x-auto border-b border-slate-800">
        {platforms.map((p, i) => {
          const selected = i === idx;
          return (
            <button
              key={p.platform}
              role="tab"
              id={`${baseId}-tab-${p.platform}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${p.platform}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setIdx(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setIdx((idx + 1) % platforms.length);
                if (e.key === "ArrowLeft") setIdx((idx - 1 + platforms.length) % platforms.length);
              }}
              className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition ${
                selected ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {PLATFORM_LABEL[p.platform] ?? p.platform}
              {p.discountPct && p.discountPct > 0 ? (
                <span className="ml-1 rounded bg-amber-400/20 px-1 text-[10px] text-amber-300">{formatDiscount(p.discountPct)}</span>
              ) : null}
              {selected && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.platform}`}
        aria-labelledby={`${baseId}-tab-${current.platform}`}
        className="p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{formatKrw(current.currentPrice)}</span>
            {hasDiscount && current.listPrice !== null && (
              <span className="text-sm text-slate-500 line-through">{formatKrw(current.listPrice)}</span>
            )}
            {hasDiscount && (
              <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-950">
                {formatDiscount(current.discountPct)}
              </span>
            )}
            {hasDiscount && <SaleBadge discountName={current.discountName} discountEndsAt={current.discountEndsAt} />}
          </div>
          <FreshnessBadge freshness={current.freshness} />
        </div>

        {isStale && (
          <p className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            수집이 오래됐거나 실패했습니다. 정확한 가격은 스토어에서 직접 확인하세요.
          </p>
        )}

        <dl className="divide-y divide-slate-800/80">
          <Row label="정가">{formatKrw(current.listPrice)}</Row>
          <Row label="현재가">{formatKrw(current.currentPrice)}</Row>
          <Row label="할인율">{hasDiscount ? formatDiscount(current.discountPct) : "-"}</Row>
          {hasDiscount && (
            <Row label="할인 기간">
              {current.discountEndsAt || current.discountStartsAt || current.discountName ? (
                <SaleBadge
                  variant="full"
                  discountName={current.discountName}
                  discountStartsAt={current.discountStartsAt}
                  discountEndsAt={current.discountEndsAt}
                />
              ) : (
                <span className="text-slate-500">스토어가 기간을 공개하지 않음</span>
              )}
            </Row>
          )}
          <Row label="출시일">{formatDate(current.releaseDate)}</Row>
          <Row label="버전">{current.currentVersion ?? "-"}</Row>
          <Row label="메타크리틱">{current.metacriticScore ?? "-"}</Row>
          <Row label="오픈크리틱">{current.opencriticScore ?? "-"}</Row>
          <Row label="갱신 시각">
            <time dateTime={current.lastSyncedAt ?? undefined}>{formatDateTime(current.lastSyncedAt)}</time>
            {current.syncStatus && current.syncStatus !== "ok" && (
              <span className="ml-1 text-xs text-slate-500">({current.syncStatus === "failed" ? "실패" : "부분"})</span>
            )}
          </Row>
        </dl>

        {current.storeUrl ? (
          <a
            href={current.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition ${
              isStale
                ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300/60 hover:bg-amber-300"
                : "border border-slate-700 text-slate-100 hover:border-amber-400 hover:text-amber-300"
            }`}
          >
            {PLATFORM_LABEL[current.platform] ?? current.platform} 스토어에서 보기
            <span className="sr-only"> (새 창에서 열림)</span>
            <span aria-hidden className="ml-1">
              ↗
            </span>
          </a>
        ) : (
          <p className="mt-4 text-xs text-slate-500">스토어 링크가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
