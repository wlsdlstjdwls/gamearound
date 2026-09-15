"use client";
// 플랫폼 탭 — 상세 페이지. 현재가/할인/정가, 출시일, 버전, 할인 종료 + 스토어 링크.
// freshness 는 서버(RSC)에서 계산해 넘긴다(캐시/하이드레이션 시각 차이 방지).
// 수집 시각도 "가격이 바뀌었을 수 있다" 는 고지도 화면에 적지 않는다(2026-09-15).
// 값이 오래된 것은 탭마다 문장으로 사과할 일이 아니라 다음 행동을 바꿀 일이다 —
// 그때만 스토어 링크를 주 버튼으로 승격한다(isStale).
import { formatPrice } from "@/lib/currency";
import { useId, useState } from "react";
import { formatDate, formatDiscount, formatShortDateTime, platformLabel } from "@/lib/format";
import { userScoreNoteText, userScoreValueText } from "@/lib/user-score";
import type { Freshness } from "@/lib/freshness";
import type { PlatformDto } from "@/server/services/games";
import { SaleBadge } from "@/components/sale-badge";
import { SubscriptionChips } from "@/components/subscription-badges";
import { cardClass } from "@/components/ui/page";

export type PlatformTabItem = PlatformDto & { freshness: Freshness };

function MetaCell({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <dt className="text-[11.5px] text-dim">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-ink">{children}</span>
        {note && <span className="text-[11.5px] font-normal text-mut">{note}</span>}
      </dd>
    </div>
  );
}

/**
 * 같은 기기라도 나라가 다르면 다른 탭이다 — 기기 이름만 키로 쓰면 한국 스위치와 일본 스위치가
 * 같은 키가 돼 탭 하나가 사라진다.
 */
function tabKey(p: PlatformDto): string {
  return `${p.platform}-${p.region}`;
}

export function PlatformTabs({ platforms }: { platforms: PlatformTabItem[] }) {
  const [idx, setIdx] = useState(0);
  const baseId = useId();

  if (platforms.length === 0) {
    return (
      <div className={cardClass("p-[18px] text-[13px] text-dim")}>
        플랫폼별 가격 정보가 아직 수집되지 않았습니다.
      </div>
    );
  }

  const current = platforms[Math.min(idx, platforms.length - 1)];
  const hasDiscount = Boolean(current.discountPct && current.discountPct > 0);
  const isStale = current.freshness === "stale";

  return (
    <div className={cardClass("overflow-hidden")}>
      <div role="tablist" aria-label="플랫폼 선택" className="flex overflow-x-auto overflow-y-hidden border-b border-line">
        {platforms.map((p, i) => {
          const selected = i === idx;
          return (
            <button
              key={tabKey(p)}
              role="tab"
              id={`${baseId}-tab-${tabKey(p)}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tabKey(p)}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setIdx(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setIdx((idx + 1) % platforms.length);
                if (e.key === "ArrowLeft") setIdx((idx - 1 + platforms.length) % platforms.length);
              }}
              className={`relative shrink-0 px-[18px] py-3 text-[13px] transition-colors duration-base ${
                selected ? "font-semibold text-ink" : "text-dim hover:text-ink"
              }`}
            >
              {platformLabel(p)}
              {p.discountPct && p.discountPct > 0 ? (
                <span className="ml-1 text-[11.5px] text-dim">{formatDiscount(p.discountPct)}</span>
              ) : null}
              {/* 구독 포함 표시는 점 하나로 족하다 — 탭 줄에 서비스 이름까지 넣으면 탭이 가로로 넘친다.
                  이름은 탭을 열면 칩이 말한다. 읽는 사람을 위해 aria-label 로 이름을 남긴다 */}
              {p.subscriptions.length > 0 && (
                <span
                  className="ml-1 inline-block size-1.5 rounded-full bg-acc align-middle"
                  aria-label={`${p.subscriptions.map((s) => s.label).join(", ")} 포함`}
                />
              )}
              {selected && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-ink" />}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tabKey(current)}`}
        aria-labelledby={`${baseId}-tab-${tabKey(current)}`}
        className="flex flex-col gap-4 p-[18px]"
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
          <span className="text-[27px] font-bold tracking-[-0.03em] text-ink">{formatPrice(current.currentPrice, current.currency)}</span>
          {hasDiscount && current.listPrice !== null && (
            <span className="text-[13px] text-dim-2 line-through">{formatPrice(current.listPrice, current.currency)}</span>
          )}
          {hasDiscount && (
            <span className="rounded-[6px] bg-ink px-2 py-[3px] text-[11.5px] font-bold text-on-ink">
              {formatDiscount(current.discountPct)}
            </span>
          )}
          {hasDiscount && <SaleBadge discountName={current.discountName} discountEndsAt={current.discountEndsAt} />}
        </div>

        {/* 구독 칩은 가격 바로 밑이다 — "얼마인가" 다음에 오는 질문이 "안 사고도 할 수 있나" 라서다 */}
        <SubscriptionChips subscriptions={current.subscriptions} />

        <dl className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] divide-x divide-line overflow-hidden rounded-[10px] border border-line">
          <MetaCell label="정가">{formatPrice(current.listPrice, current.currency)}</MetaCell>
          <MetaCell label="출시일">{formatDate(current.releaseDate)}</MetaCell>
          <MetaCell label="버전">{current.currentVersion ?? "-"}</MetaCell>
          <MetaCell label="할인 종료">
            {hasDiscount && current.discountEndsAt ? formatShortDateTime(current.discountEndsAt) : hasDiscount ? "미공개" : "-"}
          </MetaCell>
          {/* 유저 점수는 스토어마다 재는 방식이 달라 요약 바가 아니라 그 스토어 칸 안에서도 한 번 말한다 */}
          <MetaCell
            label="유저 점수"
            note={current.userScore ? userScoreNoteText(current.userScore.kind, current.userScore.count) : undefined}
          >
            {current.userScore ? userScoreValueText(current.userScore.value, current.userScore.kind) : "-"}
          </MetaCell>
        </dl>

        {current.storeUrl ? (
          <a
            href={current.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`press lift flex h-[42px] w-full items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold transition-colors duration-base ${
              // 수집이 오래됐을수록 "스토어에서 직접 확인"이 다음 행동이다 — 그때만 주 버튼으로 승격한다
              isStale ? "bg-ink text-on-ink hover:bg-ink-2" : "border border-line-strong bg-surface text-ink hover:border-ink"
            }`}
          >
            {platformLabel(current)} 스토어에서 보기
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : (
          <p className="text-[12px] text-dim">스토어 링크가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
