// 플랫폼별 가격 — 상세 화면. 스토어마다 한 행씩, 전부 펼쳐 놓는다.
//
// 왜 탭을 걷어냈나(2026-09-15): 탭은 한 번에 한 스토어만 보여 준다. 그런데 이 블록에 오는 사람이
// 하려는 일은 "어디가 싼가" 비교다 — 비교하려면 탭을 눌러 가며 숫자를 외워야 했다.
// 게다가 패널이 현재가를 27px 로 다시 크게 적어서, 바로 위 요약 바의 "지금 최저가" 와 같은 값이
// 한 화면에 두 번 서 있었다. 행으로 펴면 스토어 셋이 전에 하나 보이던 높이 안에 다 들어온다.
//
// 큰 글씨는 요약 바가 맡는다 — 여기 숫자는 13px 다. 이 블록은 "결론" 이 아니라 "근거" 다.
// 상태가 사라졌으므로 서버 컴포넌트다(SaleBadge 만 남은 시간 때문에 클라이언트).
import { formatPrice } from "@/lib/currency";
import { formatDate, formatDiscount, platformLabel } from "@/lib/format";
import { countText, scoreToStars } from "@/lib/user-score";
import { FRESHNESS_LABEL, type Freshness } from "@/lib/freshness";
import type { Platform } from "@/server/db/schema";
import type { PlatformDto } from "@/server/services/games";
import { SaleBadge } from "@/components/sale-badge";
import { SubscriptionChips } from "@/components/subscription-badges";
import { cardClass } from "@/components/ui/page";

export type PlatformPriceItem = PlatformDto & { freshness: Freshness };

/**
 * 같은 기기라도 나라가 다르면 다른 행이다 — 기기 이름만 키로 쓰면 한국 스위치와 일본 스위치가
 * 같은 키가 돼 행 하나가 사라진다.
 */
function rowKey(p: PlatformDto): string {
  return `${p.platform}-${p.region}`;
}

/**
 * 싼 순으로 세운다. 값이 없는 스토어는 맨 뒤 — "모르는 값" 이 비교의 첫 줄에 오면 안 된다.
 * 통화가 섞였을 때 환산해서 줄을 세우지는 않는다(lib/currency 의 규칙). 같은 통화끼리만 대소가 뜻을 갖고,
 * 다른 통화는 원래 순서를 유지한 채 뒤로 밀린다.
 */
function byPrice(a: PlatformDto, b: PlatformDto): number {
  if (a.currentPrice === null) return b.currentPrice === null ? 0 : 1;
  if (b.currentPrice === null) return -1;
  if (a.currency !== b.currency) return 0;
  return a.currentPrice - b.currentPrice;
}

/** 값 밑 회색 한 줄. 아는 것만 파이프로 잇는다 — 모르는 값의 자리는 세우지 않는다 */
function metaText(p: PlatformPriceItem, skipUserScore: boolean): string {
  const parts: string[] = [];
  if (p.releaseDate) parts.push(`출시 ${formatDate(p.releaseDate)}`);
  if (p.currentVersion) parts.push(p.currentVersion);
  // 유저 점수는 스토어마다 재는 방식이 달라(긍정 비율, 별점) 그 스토어 행 안에서 말한다.
  // 요약 바가 이미 인용한 스토어만 건너뛴다 — 같은 숫자를 한 화면에 두 번 적지 않기 위해서다.
  // 한 줄 안에서는 "무엇을 잰 값인지" 를 숫자 앞에 둔다 — 요약 바처럼 값과 단서를 위아래로 나눌 자리가 없어서,
  // 뒤에 붙이면 "4.5 5점 만점" 처럼 숫자 둘이 붙어 읽힌다
  if (p.userScore && !skipUserScore) {
    const { value, kind, count } = p.userScore;
    parts.push(kind === "star_average" ? `평균 ${scoreToStars(value)}점` : `긍정 ${Math.round(value)}%`);
    if (count > 0) parts.push(countText(count));
  }
  // 오래된 값은 사과가 아니라 단서로 적는다 — 그래야 "스토어에서 직접 확인" 이 다음 행동이 된다
  if (p.freshness !== "fresh") parts.push(FRESHNESS_LABEL[p.freshness]);
  return parts.join(" | ");
}

export function PlatformPrices({
  platforms,
  quotedUserScorePlatform = null,
}: {
  platforms: PlatformPriceItem[];
  /** 상세 요약 바가 이미 인용한 유저 점수의 스토어 */
  quotedUserScorePlatform?: Platform | null;
}) {
  if (platforms.length === 0) {
    return <div className={cardClass("p-[18px] text-[13px] text-dim")}>플랫폼별 가격 정보가 아직 없어요.</div>;
  }

  const rows = [...platforms].sort(byPrice);
  // 맨 앞 행이 최저가다(정렬 결과). 값이 없는 스토어뿐이면 아무 행에도 표를 달지 않는다
  const bestKey = rows[0].currentPrice !== null ? rowKey(rows[0]) : null;

  return (
    <ul className={cardClass("divide-y divide-line-soft overflow-hidden")}>
      {rows.map((p) => {
        const hasDiscount = Boolean(p.discountPct && p.discountPct > 0);
        const meta = metaText(p, p.platform === quotedUserScorePlatform);
        return (
          <li key={rowKey(p)} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <span className="flex w-[104px] shrink-0 items-center gap-1.5 text-[13px] font-semibold text-ink">
              {platformLabel(p)}
              {rowKey(p) === bestKey && (
                <span className="rounded-[5px] bg-acc px-1.5 py-[1px] text-[10.5px] font-bold text-on-ink">최저</span>
              )}
            </span>

            <div className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">{formatPrice(p.currentPrice, p.currency)}</span>
                {hasDiscount && p.listPrice !== null && p.listPrice !== p.currentPrice && (
                  <span className="text-[12px] text-dim-2 line-through">{formatPrice(p.listPrice, p.currency)}</span>
                )}
                {hasDiscount && (
                  <span className="rounded-[5px] bg-acc px-1.5 py-[2px] text-[11px] font-bold text-on-ink">{formatDiscount(p.discountPct)}</span>
                )}
                {hasDiscount && <SaleBadge discountName={p.discountName} discountEndsAt={p.discountEndsAt} />}
              </div>
              {p.subscriptions.length > 0 && <SubscriptionChips subscriptions={p.subscriptions} />}
              {meta && <p className="text-[11.5px] leading-[1.5] text-dim">{meta}</p>}
            </div>

            {p.storeUrl ? (
              <a
                href={p.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press shrink-0 rounded-[8px] border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors duration-base hover:border-ink"
              >
                스토어
                <span className="sr-only"> {platformLabel(p)} (새 창에서 열림)</span>
              </a>
            ) : (
              <span className="shrink-0 text-[12px] text-dim-2">링크 없음</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
