// 플랫폼별 가격 — 상세 화면. 스토어마다 한 행씩, 전부 펼쳐 놓는다.
//
// 왜 탭을 걷어냈나(2026-09-15): 탭은 한 번에 한 스토어만 보여 준다. 그런데 이 블록에 오는 사람이
// 하려는 일은 "어디가 싼가" 비교다 — 비교하려면 탭을 눌러 가며 숫자를 외워야 했다.
// 게다가 패널이 현재가를 27px 로 다시 크게 적어서, 바로 위 요약 바의 "지금 최저가" 와 같은 값이
// 한 화면에 두 번 서 있었다. 행으로 펴면 스토어 셋이 전에 하나 보이던 높이 안에 다 들어온다.
//
// 큰 글씨는 요약 바가 맡는다 — 여기 숫자는 13px 다. 이 블록은 "결론" 이 아니라 "근거" 다.
// 상태가 사라졌으므로 서버 컴포넌트다(SaleBadge 만 남은 시간 때문에 클라이언트).
//
// **없는 스토어도 줄을 세운다**(2026-09-21). 전에는 파는 곳만 그렸는데, 그러면 "스위치에 없다" 와
// "스위치를 아직 안 긁었다" 가 화면에서 똑같이 생긴 빈자리였다. PS 유저가 PS 줄을 못 찾으면
// 목록으로 돌아가 다시 검색하거나 스토어를 직접 열어 확인해야 했다 — 우리가 이미 아는 사실인데도.
// 없는 줄은 값 자리에 한마디를 적고 회색으로 물러난다. 순서는 PLATFORM_ORDER 를 따르되
// 파는 곳 전부가 먼저다 — 비교하러 온 사람의 눈이 빈 줄을 건너뛰며 내려가면 안 된다.
//
// **PC 와 콘솔로 한 번 묶는다**(2026-09-22, 사용자 결정). 여덟 줄이 한 덩어리로 서 있으면
// 눈이 매번 줄 이름을 읽어 가며 "이건 내 기기인가" 를 가려야 했다. 갈래는 목록 필터가 이미 쓰는 축이라
// (lib/platform 의 PLATFORM_FAMILIES) 같은 말을 여기서도 쓴다 — 화면마다 다른 축으로 묶으면 두 번 배운다.
// 묶음 안의 순서 규칙(싼 순 + 세대 붙이기)은 그대로다. 갈래 자체의 순서는 PC 가 먼저다(PLATFORM_FAMILIES).
import { formatPrice } from "@/lib/currency";
import { formatDate, PLATFORM_LABEL, platformLabel, REGION_SUFFIX } from "@/lib/format";
import { brandKeyOf, brandOf, familyOf, PLATFORM_BRANDS, PLATFORM_FAMILIES, PLATFORM_FAMILY_LABEL, PLATFORM_ORDER, type PlatformFamily } from "@/lib/platform";
import { countText, scoreToStars } from "@/lib/user-score";
import { type Freshness } from "@/lib/freshness";
import type { Platform, Region } from "@/server/db/schema";
import type { DlcDto, PlatformDto } from "@/server/services/games";
import { GAME_MESSAGES, PREORDER_HINT, PREORDER_LABEL } from "@/lib/games/messages";
import { PendingNote } from "@/components/ui/pending-note";
import { ClockIcon, StoreIcon } from "@/components/ui/icons";
import { isPreorder } from "@/lib/games/preorder";
import { DiscountText } from "@/components/ui/discount";
import { Tag } from "@/components/ui/tag";
import { SaleBadge } from "@/components/sale-badge";
import { SubscriptionChips } from "@/components/subscription-badges";
import { PlatformAddons } from "@/components/platform-addons";
import { buttonClass } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/tooltip";
import { SECTION_SIZE } from "@/components/ui/page";
import { cn } from "@/lib/cn";

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

/**
 * 값 줄에 딸린 사실들 — 말풍선 한 장에 줄로 모은다(2026-09-22, 사용자 지정).
 *
 * 전에는 값 밑에 회색 한 줄로 폈다("출시 2018년 12월 7일 (금) | 평균 4.8점 | 1.4천명").
 * 그 줄이 표에서 가장 긴 글이라 값보다 먼저 읽혔는데, 정작 셋 다 **살지 정한 다음에 보는 값**이다.
 * 자리를 비우되 버리지는 않는다 — "i" 를 눌러(또는 올려) 편다.
 *
 * 유저 점수는 스토어마다 재는 방식이 달라(긍정 비율, 별점) 그 스토어 줄 안에서 말한다.
 * 요약 바가 이미 인용한 스토어만 건너뛴다 — 같은 숫자를 한 화면에 두 번 적지 않기 위해서다.
 */
function tipText(p: PlatformPriceItem, skipUserScore: boolean): string {
  const lines: string[] = [];
  // 배지가 왜 섰는지는 여기서 말한다 — 배지 글자 넷으로는 "누가 그렇다고 했나" 를 못 담는다
  if (isPreorder(p)) lines.push(PREORDER_HINT);
  if (p.releaseDate) lines.push(`출시 ${formatDate(p.releaseDate)}`);
  if (p.currentVersion) lines.push(`버전 ${p.currentVersion}`);
  if (p.userScore && !skipUserScore) {
    const { value, kind, count } = p.userScore;
    const score = kind === "star_average" ? `평균 ${scoreToStars(value)}점` : `긍정 ${Math.round(value)}%`;
    lines.push(count > 0 ? `${score} | ${countText(count)}` : score);
  }
  // 신선도 문구는 붙이지 않는다(lib/freshness 주석) — 값은 그냥 값으로 세운다
  return lines.join("\n");
}

/**
 * 이름 기둥에 적을 말(2026-09-21). PS5 와 PS4 는 "PlayStation" 한 이름으로, Switch 와 Switch 2 는
 * "Nintendo" 한 이름으로 부르고, 어느 세대인지는 옆 배지가 말한다.
 *
 * 왜 이름에서 세대를 뗐나: 이 기둥이 답하는 질문은 "어디서 파나" 다. 세대는 그 다음 질문인데
 * 이름에 붙어 있으면 PS5 줄과 PS4 줄이 서로 다른 스토어처럼 읽혀, 둘을 견주려면 표를 두 번 훑어야 했다.
 * 이름을 같게 두면 같은 곳의 두 값이라는 사실이 먼저 읽히고, 배지가 그 안의 차이를 말한다.
 *
 * 지역 접미어는 이름 쪽에 남긴다("Nintendo 일본") — 나라는 세대와 다른 축이고,
 * 배지 둘이 나란히 서면 어느 쪽이 기기이고 어느 쪽이 나라인지 구별이 안 된다.
 */
function brandNameOf(p: { platform: string; region: Region }): string {
  const brand = brandOf(p.platform as Platform);
  if (!brand) return platformLabel(p);
  const suffix = REGION_SUFFIX[p.region];
  return suffix ? `${PLATFORM_BRANDS[brand].label} ${suffix}` : PLATFORM_BRANDS[brand].label;
}

/** 세대 배지에 적을 말. 묶이지 않는 플랫폼(Steam, Xbox, Epic)은 배지를 달지 않는다 — 가를 짝이 없다 */
function generationOf(platform: Platform): string | null {
  return brandOf(platform) ? PLATFORM_LABEL[platform] ?? platform : null;
}

/**
 * 세대 배지.
 *
 * **면에서 테두리로 바꿨다**(2026-09-22, 사용자 지적: "PS5 뱃지 봤는데 좀 배경좀 다르게 하던가").
 * --surface-2 는 이 화면에서 장르 칩, 구독 칩, 판정 면이 이미 쓰는 회색이라, 이름 아래로 내려온
 * 배지가 그것들과 같은 물건으로 읽혔다. 게다가 카드 판(--surface) 위에서 두 회색의 차이가
 * 3% 뿐이라 배지의 경계 자체가 흐렸다.
 *
 * 테두리만 두면 값이 아니라 **꼬리표**라는 성질이 모양으로 드러난다 — 이 표에서 면을 가진 것은
 * 최저가 배지 하나뿐이고, 그 대비가 유지돼야 "어디서 사면 되나" 가 한눈에 남는다.
 * 글자는 mut 에서 ink-2 로 한 단 올린다: 10.5px 라 회색이 한 단만 옅어도 "PS4" 의 4 가 뭉갠다.
 */
function GenerationBadge({ platform }: { platform: Platform }) {
  const label = generationOf(platform);
  if (!label) return null;
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-line-strong px-[6px] py-[2px] text-[10.5px] font-bold leading-[1.45] tracking-[0.01em] text-ink-2">
      {label}
    </span>
  );
}

/**
 * 싼 순을 지키되 같은 묶음의 줄을 붙여 세운다.
 *
 * 값 순서만 쓰면 PS5 가 1번, PS4 가 5번에 서서 이름이 같은 두 줄이 표 양 끝으로 갈린다 —
 * 묶어 부르기로 한 이름이 오히려 "같은 이름이 왜 두 번 나오나" 로 읽힌다.
 * 묶음의 자리는 그 묶음에서 가장 싼 줄이 정한다. 최저가 줄은 어차피 맨 위이므로 이 정렬로 안 밀린다.
 */
function groupByBrand(rows: PlatformPriceItem[]): PlatformPriceItem[] {
  const rank = new Map<string, number>();
  rows.forEach((r, i) => {
    const key = brandKeyOf(r.platform);
    if (!rank.has(key)) rank.set(key, i);
  });
  return rows
    .map((r, i) => ({ r, i, rank: rank.get(brandKeyOf(r.platform)) ?? i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.r);
}

/**
 * 안 파는 줄도 묶음 단위로 센다. 묶음 안에서 **한 세대라도 팔면** 줄을 세우지 않는다 —
 * 그 사실은 파는 줄의 세대 배지가 이미 말한다("PlayStation [PS5]" 는 PS4 판이 없다는 뜻이다).
 * 넷이던 "서비스하지 않음" 줄이 둘로 준다.
 */
function absentBrands(sold: Set<Platform>): { key: string; label: string; family: PlatformFamily | undefined }[] {
  const seen = new Set<string>();
  const out: { key: string; label: string; family: PlatformFamily | undefined }[] = [];
  for (const p of PLATFORM_ORDER) {
    const key = brandKeyOf(p);
    if (seen.has(key)) continue;
    const members = PLATFORM_ORDER.filter((q) => brandKeyOf(q) === key);
    if (members.some((q) => sold.has(q))) {
      seen.add(key);
      continue;
    }
    seen.add(key);
    const brand = brandOf(p);
    out.push({ key, label: brand ? PLATFORM_BRANDS[brand].label : PLATFORM_LABEL[p] ?? p, family: familyOf(p) });
  }
  return out;
}

/**
 * 파는 곳이 아닌 스토어 = 흐린 타일 한 장(2026-09-30, 사용자: "서비스하지 않아도 카드는 만들어놔도 좋을듯").
 * 같은 날 아침에는 표 아래 한 줄로 모았는데, 그러면 "Nintendo 에는 없다" 를 찾으려고 타일 격자와
 * 아래 글자 줄을 두 번 읽어야 했다. 같은 격자, 같은 자리에 서면 스토어 목록이 늘 같은 모양이다.
 * 값 타일과 섞여 읽히지 않게 면을 빼고 점선만 두른다, 글자도 흐린 색이다. 높이는 넓은 화면에서만
 * 값 타일에 맞춘다(격자 한 줄이 들쭉날쭉하지 않게) — 한 줄에 한 장인 좁은 화면에서는 빈 칸이 된다.
 * 지역 접미어도 세대 배지도 붙이지 않는다 — "Nintendo 일본" 은 "일본에는 있다" 로 읽힌다.
 *
 * 2026-10-07(사용자: "부드럽게, 밋밋하니 아이콘으로 칸을 채워") "서비스하지 않음" 명사형을 걷고
 * "-해요" 문구 + 가방 아이콘으로 바꿨다(GAME_MESSAGES.storeChecking). 예전엔 표 안에서 말을 걸면
 * 눈이 걸린다고 명사형을 골랐는데, 타일 한 장이 통째로 그 말뿐이라 걸릴 다른 값이 없다.
 */
function AbsentTile({ label }: { label: string }) {
  return (
    <li className="flex min-w-0 flex-col justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong p-4 sm:min-h-[132px]">
      <span className="truncate text-[15px] font-bold text-dim">{label}</span>
      <PendingNote icon={<StoreIcon size={15} />}>{GAME_MESSAGES.storeChecking}</PendingNote>
    </li>
  );
}

/** 링크가 아직 없는 타일의 버튼에 붙는 말. 버튼은 그대로 서고 눌리지만 않는다(PriceTile 주석) */
const STORE_LINK_MISSING = "스토어 링크를 아직 못 찾았어요";

/**
 * 스토어 한 곳 = 타일 한 장(2026-09-30, 사용자: "플랫폼 정보 좀 가시성 높게").
 *
 * 전에는 PC, 콘솔 두 기둥에 줄로 섰다. 한 줄에 이름, 값, 할인율, 정가, "i", 구독 칩, 버튼 둘이
 * 가로로 끼어 있어서 기둥 폭(약 540px)에 다 못 서고 정가가 접히고 버튼이 아랫줄로 떨어졌다.
 * 줄마다 모양이 달라 "어디가 싼가" 를 훑기 어려웠다.
 *
 * 타일은 같은 순서(이름 - 값 - 버튼)를 세로로 쌓아 폭을 요구하지 않는다. 값은 줄마다 같은 자리,
 * 같은 크기에 서고(22px), 최저가 타일만 보라 테두리와 연한 보라 면을 얻는다 — 목록 카드의
 * "최저" 말풍선과 같은 색 문법이다.
 *
 * 세대 배지(PS5)는 이름 옆에 선다 — 타일은 폭이 남아 예전처럼 이름 아래로 내릴 이유가 없다.
 * 값 묶음은 줄바꿈하지 않는다(2026-09-22 "금액이 잘려" 이후의 첫 규칙): 값, 할인율은 한 줄, 정가는 아랫줄.
 * 링크가 없어도 **버튼 자리는 지킨다**(2026-09-22, 사용자 지정) — 같은 자리 같은 모양, 눌리지만 않는다.
 */
function PriceTile({
  p,
  isBest,
  tip,
  addons,
}: {
  p: PlatformPriceItem;
  isBest: boolean;
  /** 말풍선에 담을 사실들(출시일, 버전, 유저 점수). 없으면 "i" 자체를 안 세운다 */
  tip: string;
  addons: React.ReactNode;
}) {
  const hasDiscount = Boolean(p.discountPct && p.discountPct > 0);
  // 무료면 "최저가" 를 세우지 않는다(2026-09-22, 사용자 지정) — 0원은 비교의 대상이 아니다
  const showBest = isBest && p.currentPrice !== 0;
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-[var(--radius-md)] p-4",
        showBest ? "bg-acc-soft ring-2 ring-acc ring-inset" : "bg-surface-4 shadow-hair",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[15px] font-bold text-ink">{brandNameOf(p)}</span>
        <GenerationBadge platform={p.platform} />
        {showBest && (
          <span className="ml-auto shrink-0 rounded-full bg-acc px-2 py-[3px] text-[11px] font-bold leading-none text-on-ink">최저가</span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          {hasDiscount && (
            <span className="text-[20px] font-extrabold tracking-[-0.03em] text-acc">
              <DiscountText pct={p.discountPct} />
            </span>
          )}
          {/* 값을 아직 못 받았으면 "-" 대신 말로 한다(2026-10-07) — 22px "-" 는 0원으로도 고장으로도 읽혔다 */}
          {p.currentPrice === null ? (
            <PendingNote icon={<ClockIcon size={15} />} className="self-center">
              {GAME_MESSAGES.pricePending}
            </PendingNote>
          ) : (
            <span className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">{formatPrice(p.currentPrice, p.currency)}</span>
          )}
          {/* self-center: 이 묶음은 items-baseline 인데 버튼의 기준선은 아이콘 아래변이라 반 칸 낮게 선다 */}
          <InfoTip label={tip} className="self-center" />
        </span>
        <span className="flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          {/* 스토어마다 따로 본다 — PS 는 예약 중이어도 스팀은 이미 팔 수 있다(lib/games/preorder) */}
          {isPreorder(p) && <Tag>{PREORDER_LABEL}</Tag>}
          {hasDiscount && p.listPrice !== null && p.listPrice !== p.currentPrice && (
            <span className="text-dim-2 line-through">{formatPrice(p.listPrice, p.currency)}</span>
          )}
          {/* 구독 칩은 값 아래 곁줄에 — 구독 여부는 구독 탭이 따로 말하므로 넘치면 잘려도 된다 */}
          {p.subscriptions.length > 0 && (
            <span className="flex min-w-0 overflow-hidden">
              <SubscriptionChips subscriptions={p.subscriptions} />
            </span>
          )}
        </span>
      </div>

      {/* 누르는 것들은 타일 바닥에 — 오른쪽 끝(스토어)이 이 화면에서 "나가는 문" 자리다 */}
      <div className="mt-auto flex items-center gap-2">
        {addons}
        {p.storeUrl ? (
          <a
            href={p.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            // 최저가 타일만 브랜드 필이다 — 이 화면에서 실제로 누를 자리는 대개 그 하나다(ui/button 주석)
            className={buttonClass({ variant: isBest ? "accent" : "soft", size: "row", className: "ml-auto shrink-0 flex-1" })}
          >
            스토어
            <span className="sr-only"> {platformLabel(p)} (새 창에서 열림)</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={buttonClass({ variant: "soft", size: "row", className: "pointer-events-none ml-auto shrink-0 flex-1 opacity-45" })}
          >
            스토어
            <span className="sr-only"> {STORE_LINK_MISSING}</span>
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * 갈래 하나(PC | 콘솔) — 이름표 + 타일 격자.
 * 갈래를 옆으로 나란히 세우던 것(2026-09-22)을 위아래로 바꿨다(2026-09-30): 옆으로 가르면 기둥 폭이
 * 반이 되어 줄이 못 섰다. 타일은 한 장이 작아 위아래로 쌓아도 갈래 하나가 한두 줄이다.
 * 좁은 화면 1열, sm 2열, lg 4열 — 스토어는 갈래마다 많아야 넷이라 넓은 화면에서 한 줄에 선다.
 */
function FamilyBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <h3 className={SECTION_SIZE.label}>{label}</h3>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{children}</ul>
    </div>
  );
}

/**
 * 지금 도는 행사의 이름과 남은 기간 — "플랫폼 정보" **제목 옆**에 선다(2026-09-30, 사용자 지정).
 *
 * 처음엔 최저가 행 안에 있었고(한 줄의 꼬리표처럼 보였고, 좁으면 먼저 잘렸다), 2026-09-22 에
 * 표 위 한 줄로 올렸다. 그 한 줄이 제목과 표 사이에 따로 서서 자리를 먹어, 제목 옆 곁말 자리로 옮겼다.
 * 행사는 스토어마다 달라서 어느 스토어의 행사인지를 앞에 적는다. 값은 **최저가 행**의 것이다 —
 * 표에서 실제로 살 자리가 그 줄이고, 그 줄의 행사가 이 화면의 행사다.
 */
export function PlatformSaleNote({ platforms }: { platforms: PlatformDto[] }) {
  const cheapest = [...platforms].sort(byPrice)[0] ?? null;
  if (!cheapest || !cheapest.discountPct || cheapest.discountPct <= 0) return null;
  if (!cheapest.discountName && !cheapest.discountEndsAt) return null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[12px] font-semibold text-dim">{brandNameOf(cheapest)}</span>
      <SaleBadge
        discountName={cheapest.discountName}
        discountEndsAt={cheapest.discountEndsAt}
        discountStartsAt={cheapest.discountStartsAt}
        variant="full"
      />
    </span>
  );
}

export function PlatformPrices({
  platforms,
  quotedUserScorePlatform = null,
  dlcs = [],
}: {
  platforms: PlatformPriceItem[];
  /** 상세 요약 바가 이미 인용한 유저 점수의 스토어 */
  quotedUserScorePlatform?: Platform | null;
  /**
   * 이 게임의 추가 콘텐츠. 행마다 자기 플랫폼 것만 걸러 시트에 넣는다 —
   * 마디로 따로 세우지 않는 이유는 platform-addons 머리 주석에 있다.
   */
  dlcs?: DlcDto[];
}) {
  // 값 순으로 세운 뒤 같은 세대 묶음끼리 붙인다(groupByBrand 주석)
  const rows = groupByBrand([...platforms].sort(byPrice));
  // 한 플랫폼이 나라별로 여러 행일 수 있어(Switch 한국, 일본) 플랫폼 단위로 접어서 없는 것만 고른다
  const sold = new Set(platforms.map((p) => p.platform));
  const absent = absentBrands(sold);

  if (rows.length === 0 && absent.length === 0) {
    return <p className="border-t border-line-strong py-5 text-[13px] text-dim">플랫폼 정보가 아직 없어요.</p>;
  }

  // 최저가는 **값 순서**로 정한다. 묶음 정렬이 줄 자리를 바꾸므로 "맨 앞 행" 으로 잡으면
  // 묶음이 앞으로 올라온 날 엉뚱한 줄에 "최저가" 가 붙는다(정렬을 바꾸며 실제로 깨졌던 자리)
  const cheapest = [...platforms].sort(byPrice)[0] ?? null;
  const bestKey = cheapest?.currentPrice != null ? rowKey(cheapest) : null;

  return (
    <div className="flex flex-col gap-3">

      <div className="flex flex-col gap-5">
        {PLATFORM_FAMILIES.map((family) => {
          const familyRows = rows.filter((r) => familyOf(r.platform) === family);
          const familyAbsent = absent.filter((a) => a.family === family);
          // 갈래 전체가 비면 이름표도 세우지 않는다 — 빈 제목은 "여기 뭔가 빠졌다" 로 읽힌다
          if (familyRows.length === 0 && familyAbsent.length === 0) return null;
          return (
            <FamilyBlock key={family} label={PLATFORM_FAMILY_LABEL[family]}>
              {familyRows.map((p) => {
                // 이 플랫폼에 실제로 있는 추가 콘텐츠만 넘긴다. 하나도 없으면 버튼을 안 세운다 —
                // 열어 봤자 빈 시트인 버튼은 누른 사람을 두 번 움직이게 한다
                const mine = dlcs.filter((d) => d.platforms.some((dp) => dp.platform === p.platform));
                return (
                  <PriceTile
                    key={rowKey(p)}
                    p={p}
                    isBest={rowKey(p) === bestKey}
                    tip={tipText(p, p.platform === quotedUserScorePlatform)}
                    addons={
                      mine.length > 0 || p.hasAddOns ? (
                        <PlatformAddons platform={p.platform} platformLabel={brandNameOf(p)} dlcs={mine} />
                      ) : null
                    }
                  />
                );
              })}
              {familyAbsent.map((a) => (
                <AbsentTile key={a.key} label={a.label} />
              ))}
            </FamilyBlock>
          );
        })}
      </div>
    </div>
  );
}
