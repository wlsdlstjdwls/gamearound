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
import { DiscountText } from "@/components/ui/discount";
import { SaleBadge } from "@/components/sale-badge";
import { SubscriptionChips } from "@/components/subscription-badges";
import { PlatformAddons } from "@/components/platform-addons";
import { buttonClass } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/tooltip";
import { ROW, ROWS, SECTION_SIZE } from "@/components/ui/page";
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
 * 값 줄과 같은 왼쪽 기둥 폭. 스토어 이름의 시작점이 어긋나면 두 무리가 한 표로 안 읽힌다.
 *
 * 150 에서 96 으로 줄였다(2026-09-22, 사용자 지정으로 세대 배지가 이름 **아래**로 내려가면서).
 * 배지가 옆에 없으니 이 기둥이 재야 할 것은 가장 긴 이름 하나뿐이다("Nintendo 일본" 실측 96px).
 * 줄인 54px 은 그대로 값 쪽으로 간다 — 값이 잘리던 원인의 절반이 이 기둥이었다.
 */
const NAME_COL = "w-[96px] shrink-0";

/**
 * 파는 곳이 아닌 한 줄. 지역 접미어도 세대 배지도 붙이지 않는다 —
 * 팔지 않는 곳에 "Nintendo 일본" 이라고 쓰면 "일본에는 있다" 로 읽히고,
 * 세대 배지는 "그 세대만 없다" 로 읽힌다. 여기 서는 줄은 묶음 전체가 없는 경우뿐이다.
 */
function AbsentRow({ label }: { label: string }) {
  return (
    <li className={cn(ROW, "flex min-w-0 items-center gap-x-2.5 py-[11px]")}>
      <span className={cn(NAME_COL, "truncate text-[14px] text-dim")}>{label}</span>
      <span className="text-[13px] text-dim-2">{ABSENT_TEXT}</span>
    </li>
  );
}

/**
 * 파는 곳이 아닌 줄에 적는 말(2026-09-21, 사용자 지정).
 *
 * 이 화면에서 "-해요" 를 안 쓰는 유일한 자리다(UI 규약 §6 의 예외). 나머지 줄이 전부 값을
 * 말하는 표 안에서, 이 줄만 말을 걸면 값이 아니라 안내문으로 읽혀 눈이 거기 걸린다.
 * 표의 다른 칸("정보 없음", "링크 없음")과 같은 명사형으로 맞춘 말이다.
 */
const ABSENT_TEXT = "서비스하지 않음";

/** 링크가 아직 없는 줄의 버튼에 붙는 말. 버튼은 그대로 서고 눌리지만 않는다(PriceRow 주석) */
const STORE_LINK_MISSING = "스토어 링크를 아직 못 찾았어요";

/**
 * 한 줄 — 이름(+세대 배지), 값, 버튼들.
 *
 * **값이 잘리지 않는 것이 이 줄의 첫 규칙이다**(2026-09-22, 사용자 지적: "금액이 잘려").
 * 전에는 값과 곁가지(세일 배지, 구독 칩)가 한 overflow-hidden 상자에 같이 들어 있었다.
 * 그 상자는 자리가 모자라면 안쪽을 잘라 내는데, 값이 그 상자의 첫 자식이라 뒤엣것이 밀려 들어오면
 * 값의 오른쪽 자릿수부터 사라졌다. 지금은 두 상자로 가른다:
 *   - 값 묶음(값, 할인율, 정가, "i")은 shrink-0 — 절대 줄지 않는다.
 *   - 곁가지 묶음(구독 칩)만 min-w-0 flex-1 overflow-hidden — 좁아지면 여기부터 잘린다.
 *
 * **세대 배지는 이름 아래로 내려간다**(같은 날 사용자 지정: "PS5 뱃지 형태로 PlayStation 밑으로").
 * 옆에 두면 이름 기둥이 배지 폭까지 재야 해서 150px 이 필요했고, 그 폭이 값을 밀어내고 있었다.
 * 아래로 내리면 기둥이 96px 로 줄고, "PlayStation" 과 "PS5" 가 위아래로 읽혀 어느 쪽이
 * 스토어 이름이고 어느 쪽이 세대인지가 더 분명해진다.
 *
 * 정가 취소선은 xl 아래에서 접힌다 — 할인율(-20%)이 같은 말을 더 짧게 한다.
 *
 * **줄에 overflow-hidden 을 걸지 않는다**(2026-09-22, 사용자 지적: "버튼이 옆 컨텐츠를 가리진
 * 않지만 가려져서 안보여져"). 옆 갈래로 삐져나가는 것을 막으려고 줄 전체를 잘랐더니, 잘리는 쪽이
 * 줄의 **끝** 이라 하필 거기 선 버튼 둘(추가 콘텐츠, 스토어)이 사라졌다. 넘침을 막는 자리는
 * 안쪽 곁가지 상자 하나여야 한다 — 거기만 잘리면 잃는 것이 구독 칩뿐이고, 그 값은 구독 탭이 따로 말한다.
 * 같은 날 "최저가" 배지를 이름 기둥으로 올리고 행사 줄을 표 위로 뺀 것도 이 계산의 일부다.
 */
function PriceRow({
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
  return (
    <li className={cn(ROW, "flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 py-[11px]")}>
      {/* 최저가 표시가 이 기둥 맨 위에 선다(2026-09-22, 사용자 지정: "최저가 뱃지는 Steam 위에").
          줄 가운데에 있을 때는 값과 버튼 사이에 끼어 그 줄만 길어졌고, 여덟 줄을 훑는 눈이
          "어느 스토어가 싼가" 를 찾으려면 줄마다 중간까지 읽어야 했다. 이름 위에 두면
          기둥 하나만 세로로 훑어도 답이 나온다 — 자리를 비운 만큼 값과 버튼도 넉넉해진다 */}
      <span className={cn(NAME_COL, "flex flex-col items-start gap-[3px]")}>
        {/* 무료면 배지를 세우지 않는다(2026-09-22, 사용자 지정). 값이 이미 "무료" 라고 적혀 있는데
            그 위에 "최저가" 를 또 붙이면 깎아서 싸진 값처럼 읽힌다 — 0원은 비교의 대상이 아니다.
            값 크기와 버튼 강조는 그대로 둔다: 무료 줄은 여전히 이 표에서 실제로 누를 자리다 */}
        {isBest && p.currentPrice !== 0 && (
          <span className="rounded-full bg-acc-soft px-[7px] py-[2px] text-[10.5px] font-bold leading-[1.45] text-acc">최저가</span>
        )}
        <span className="max-w-full truncate text-[14.5px] font-bold text-ink">{brandNameOf(p)}</span>
        <GenerationBadge platform={p.platform} />
      </span>

      {/* 값 묶음 — 줄지도 잘리지도 않는다(머리 주석) */}
      <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
        {/* 최저가 행만 값이 크다 — 행이 여덟 줄까지 가는데 전부 같은 크기면 "어디를 사면 되나" 가 안 보인다 */}
        <span className={cn("font-extrabold tracking-[-0.035em] text-ink", isBest ? "text-[21px]" : "text-[17px]")}>
          {formatPrice(p.currentPrice, p.currency)}
        </span>
        {hasDiscount && <span className="text-[12.5px] font-bold text-acc"><DiscountText pct={p.discountPct} /></span>}
        {hasDiscount && p.listPrice !== null && p.listPrice !== p.currentPrice && (
          <span className="hidden text-[12px] text-dim-2 line-through xl:inline">{formatPrice(p.listPrice, p.currency)}</span>
        )}
        {/* 값 옆에 붙는다 — 이 사실들은 값에 딸린 것이지 줄 전체의 꼬리표가 아니다.
            self-center 가 필요하다(2026-09-22, 사용자 지적: "툴팁 버튼이 위아래 정렬이 안맞아"):
            이 묶음은 items-baseline 인데 버튼은 inline-flex 라 제 기준선이 안쪽 아이콘의 아래변이다.
            그대로 두면 동그라미가 숫자 기준선까지 내려앉아 반 칸 낮게 선다 */}
        <InfoTip label={tip} className="self-center" />
      </span>

      {/* 곁가지 — 남는 자리에 흘리고, 좁아지면 여기부터 잘린다.
          세일 배지(행사 이름, 남은 기간)는 여기 없다(2026-09-22, 사용자 제안: "할인 이름은
          가격표 위에 표기하는게 어떰..?") — 표 **위 한 줄**로 올라갔다. 근거는 SaleHeadline 주석 */}
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {/* 구독 칩은 줄 끝에 흘린다. 자리가 없으면 잘린다 — 구독 여부는 구독 탭이 따로 말한다 */}
        {p.subscriptions.length > 0 && (
          <span className="hidden min-w-0 lg:flex">
            <SubscriptionChips subscriptions={p.subscriptions} />
          </span>
        )}
      </span>

      {/* 누르는 것들 — 좁은 화면에서는 통째로 **아랫줄**로 내려간다(2026-09-22 실측).
          한 줄이 요구하는 폭은 416px 인데(이름 96 + 값 149 + 버튼 59, 66 + 사이 30) 390px 기기에
          남는 자리는 335px 이라, 넘친 만큼 스토어 버튼이 화면 밖으로 밀려나 있었다
          (문서 폭 430 대 화면 390 — 가로 스크롤이 생겼다).
          줄 안에서 더 깎을 것이 없다: 이름을 자르면 어느 스토어인지가 사라지고, 값을 줄이면
          이 표가 답하려던 것이 사라진다. 그래서 **읽는 값(이름, 가격)은 첫 줄에 그대로 두고
          누르는 것만 내린다**. 오른쪽에 붙이는 이유는 왼쪽에 두면 다음 줄의 이름 기둥과 겹쳐 읽혀서다.
          한 줄로 되돌아오는 지점은 sm(640) 이다 — 계산상 471px 부터 들어가지만 그 사이를 따로 가르면
          토큰에 없는 중단점이 하나 더 생긴다. 넓은 화면의 배치는 이 묶음이 shrink-0 이라 그대로다 */}
      <div className="flex w-full shrink-0 items-center justify-end gap-2.5 sm:w-auto">
        {/* 추가 콘텐츠가 스토어 버튼 왼쪽에 선다 — 오른쪽 끝은 이 화면에서 "나가는 문" 자리다 */}
        {addons}

        {/*
          링크가 없어도 **버튼 자리는 지킨다**(2026-09-22, 사용자 지정). 전에는 "링크 없음" 이라는
          회색 글자로 바꿔 세웠는데, 줄마다 오른쪽 끝의 모양이 달라져 표가 들쭉날쭉했고
          그 글자가 값보다 눈에 걸렸다. 같은 자리에 같은 모양으로 두되 눌리지 않게 한다 —
          "여기는 원래 나가는 문인데 지금은 못 연다" 가 한눈에 읽힌다.
        */}
        {p.storeUrl ? (
          <a
            href={p.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            // 최저가 행만 브랜드 필이다 — 이 화면에서 실제로 누를 자리는 대개 그 하나다(ui/button 주석)
            className={buttonClass({ variant: isBest ? "accent" : "soft", size: "row", className: "shrink-0" })}
          >
            스토어
            <span className="sr-only"> {platformLabel(p)} (새 창에서 열림)</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={buttonClass({ variant: "soft", size: "row", className: "pointer-events-none shrink-0 opacity-45" })}
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
 * 갈래 하나(PC | 콘솔).
 *
 * **면을 걷었다**(2026-09-22, 사용자 지적: "PC / 콘솔 영역 배경색 구려"). 같은 날 아침에
 * 경계가 안 보인다는 지적으로 --surface-2 판을 입혔는데, 그 회색 면이 옆 마디, 카드와 다른 색이라
 * 이 마디만 화면에서 한 겹 꺼진 것처럼 보였다. 판을 다 걷은 리디자인 방향과도 어긋난다.
 *
 * 경계는 이름표 아래 굵은 헤어라인이 대신 긋는다 — 목록의 첫 줄이 이미 --line-strong 이고
 * (globals 의 .rows), 이름표를 그 선 바로 위에 올리면 "여기부터 이 묶음" 이 선 하나로 읽힌다.
 * 면과 달리 선은 배경색을 바꾸지 않아 옆 갈래와 색이 갈리지 않는다.
 *
 * min-w-0 이 없으면 이 칸이 옆 칸을 침범한다(2026-09-22, 사용자 지적: "PC 컨텐츠가 콘솔 영역으로
 * 넘어가버려"). 격자 칸의 기본 최소 크기는 auto 라 "안쪽이 줄바꿈 없이 요구하는 폭" 아래로는
 * 절대 안 줄어드는데, 줄 안에 shrink-0 인 값 묶음과 버튼 셋이 있어서 그 요구 폭이 칸보다 컸다.
 */
function FamilyBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className={SECTION_SIZE.label}>{label}</h3>
      <ul className={ROWS}>{children}</ul>
    </div>
  );
}

/**
 * 표 위 한 줄 — 지금 도는 행사의 이름과 남은 기간(2026-09-22, 사용자 제안).
 *
 * 전에는 최저가 **행 안**에 있었다. 거기서는 두 가지가 나빴다. 하나, 행사 이름("특별 할인",
 * "가을 세일")은 그 줄 하나가 아니라 **표 전체에 걸린 사정**인데 한 줄의 꼬리표처럼 보였다.
 * 둘, 줄에서 가장 잘 잘리는 자리에 있어서 좁은 화면에서는 늘 먼저 사라지는 값이었다.
 *
 * 표 위로 올리면 제목("플랫폼 정보")과 표 사이에서 "이 값들은 지금 행사 중이다" 를 먼저 말한다.
 * 어느 스토어의 행사인지는 그 스토어 이름을 같이 적어 밝힌다 — 행사는 스토어마다 다르다.
 */
function SaleHeadline({ row }: { row: PlatformPriceItem }) {
  if (!row.discountName && !row.discountEndsAt) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[12px] font-semibold text-dim">{brandNameOf(row)}</span>
      <SaleBadge discountName={row.discountName} discountEndsAt={row.discountEndsAt} discountStartsAt={row.discountStartsAt} variant="full" />
    </p>
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
  // 행사 줄은 최저가 행의 것을 쓴다 — 표에서 실제로 살 자리가 그 줄이고, 그 줄의 행사가 이 화면의 행사다
  const saleRow = cheapest && cheapest.discountPct && cheapest.discountPct > 0 ? cheapest : null;

  return (
    <div className="flex flex-col gap-3">
      {saleRow && <SaleHeadline row={saleRow} />}

      {/* 갈래 둘을 **가로로** 세운다(2026-09-22, 사용자 지적). 세로로 쌓으면 여덟 줄이 화면 하나를
          통째로 먹고 그 아래 판정, 파는 곳이 접힘선 밖으로 밀린다. 넓은 화면에서만 가른다 —
          좁은 화면에서 반으로 자르면 값과 버튼이 한 줄에 못 선다.
          items-start 가 필요하다: 기본 stretch 면 줄 수가 적은 쪽(PC 둘)의 헤어라인이 반대쪽 높이까지 늘어난다 */}
      <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-2">
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
                  <PriceRow
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
                <AbsentRow key={a.key} label={a.label} />
              ))}
            </FamilyBlock>
          );
        })}
      </div>
    </div>
  );
}
