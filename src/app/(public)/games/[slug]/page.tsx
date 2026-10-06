// 게임 상세 — 결론 → 근거 순 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { CompanyChips } from "@/components/company-chips";
import { SaleBadge } from "@/components/sale-badge";
import { ContentKindHead } from "@/components/content-kind-head";
import { DlcSection } from "@/components/dlc-list";
import { GameHeadbar } from "@/components/game-headbar";
import { UpgradeNotes } from "@/components/upgrade-note";
import { GameViewBeacon } from "@/components/game-view-beacon";
import { KoreanSupportBadges } from "@/components/korean-support-badges";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { PcSupportBadges } from "@/components/pc-support-badges";
import { NewsList } from "@/components/news-list";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { Sheet } from "@/components/ui/sheet";
import { PlatformPrices, PlatformSaleNote, type PlatformPriceItem } from "@/components/platform-prices";
import { PlaytimeCard } from "@/components/playtime-card";
import { CompatSection } from "@/components/compat-section";
import { RequirementsBody } from "@/components/requirements-table";
import { RunCheck } from "@/components/run-check";
import { BackLink } from "@/components/ui/back-link";
import { InfoTip } from "@/components/ui/tooltip";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { DiscountText } from "@/components/ui/discount";
import { SellersSection } from "@/components/shops/sellers-section";
import { IndieGameSection } from "@/components/indie/game-section";
import { listSellersForGame } from "@/server/services/listings";
import { SELLING_MESSAGES } from "@/lib/shops/listing-messages";
import { formatDate, kstDateKey, PLATFORM_LABEL } from "@/lib/format";
import { SITE } from "@/lib/site";
import { getFreshness } from "@/lib/freshness";
import { COMPAT_MESSAGES, GAME_MESSAGES, OS_FAMILY_LABEL, PREORDER_LABEL, preorderHeadlineNote, releaseLineText } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { Tag } from "@/components/ui/tag";
import { requirementSummary } from "@/lib/games/requirement-summary";
import { VerdictNote } from "@/components/devices/verdict-note";
import { stagger } from "@/lib/motion";
import { gamePricesPath, ROUTES } from "@/lib/routes";
import {
  bestUserScore,
  cheapestPlatform,
  displayTitle,
  getGameBySlugCached,
  getGamePatchesCached,
  getPricePerHourScale,
  latestPatches,
  originCountry,
  scoreLines,
  type GameDetail,
} from "@/server/services/games";
import { getRecordedLow, type RecordedLow } from "@/server/services/prices";
import { getCurrentUser } from "@/server/services/users";
import { listMyDevices } from "@/server/services/devices";
import { decodeSlugParam } from "@/lib/slug";

/** 검색결과, SNS 카드에 들어가는 설명 길이 상한 */
const META_DESCRIPTION_MAX = 150;

/**
 * 시트에 담을 패치 기록 수.
 *
 * 전용 화면(/patches)을 걷어내고 시트로 합쳤다(2026-09-15). 패치를 보려고 화면을 옮기면
 * 가격과 플레이타임을 두고 떠나야 했는데, 이 기록은 그것들과 나란히 읽어야 뜻이 있다.
 * 50 은 상한일 뿐이다 — 스토어가 최근 기록만 돌려줘서 실제로는 게임당 훨씬 적다.
 */
const SHEET_PATCH_LIMIT = 50;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlugParam((await params).slug);
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  const title = displayTitle(game);
  const description =
    game.description?.slice(0, META_DESCRIPTION_MAX) ??
    `${title}의 플랫폼별 가격, 할인, 플레이타임, 평점, 뉴스를 ${SITE.name}에서 확인하세요.`;
  return {
    title,
    description,
    // openGraph.images 는 opengraph-image.tsx 가 자동으로 채운다 — 여기서 커버를 지정하면 그걸 덮어쓴다
    openGraph: { title, description },
  };
}

type StatCellProps = { label: string; value: string; suffix?: string | null; note?: string | null };

/**
 * 오른쪽 기둥의 값 한 칸 — 라벨 위, 숫자 아래.
 * 격자 칸을 세로선으로 가르지 않는다(2026-09-21 리디자인): 칸 수가 둘일 때와 넷일 때
 * 선의 개수가 달라져 같은 표가 게임마다 다르게 보였다. 가르는 일은 여백이 한다.
 *
 * 척도는 note 가 아니라 suffix 로 받는다(2026-09-22) — 축 표기가 아래 줄을 차지하면
 * 값 하나에 세 줄이 되고, 평론가 두 칸은 같은 문장을 나란히 반복한다.
 *
 * **근거 줄(note)을 말풍선으로 내렸다**(2026-09-22, 사용자 지정: "Steam | 3.3만명 -> 툴팁으로").
 * "어느 스토어의 몇 명인가" 는 점수를 믿을지 정할 때 한 번 보는 값인데, 늘 펴 두면 칸마다
 * 세 줄이 되어 점수 셋이 화면 하나를 먹었다. 라벨 옆 "i" 가 그 값을 갖는다 —
 * 표 안의 값 줄이 같은 규칙을 이미 쓰고 있다(platform-prices 의 InfoTip).
 */
function StatCell({ label, value, suffix, note }: StatCellProps) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-0.5 text-[12px] text-dim">
        <span className="truncate">{label}</span>
        {note && <InfoTip label={note} className="size-[15px]" />}
      </dt>
      <dd className="mt-0.5 text-[19px] font-extrabold tracking-[-0.03em] text-ink">
        {value}
        {suffix && <span className="ml-0.5 text-[11px] font-semibold tracking-normal text-mut">{suffix}</span>}
      </dd>
    </div>
  );
}

/**
 * 결론 블록 — "지금 얼마인가" 하나에만 답한다.
 *
 * 화면에서 가장 큰 글자가 이 값이어야 한다(2026-09-21 리디자인). 전에는 최저가가 요약 바의
 * 여러 칸 중 하나였고, 평점, 출시일과 같은 20px 였다. 그래서 이 화면에 들어와 처음 묻는 질문의
 * 답이 다른 값들 사이에 묻혀 있었다. 나머지 값은 아래 StatGrid 가 받는다.
 */
function PriceHeadline({ game, recordedLow }: { game: GameDetail; recordedLow: RecordedLow | null }) {
  const best = cheapestPlatform(game.platforms);
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  // 최저가 판이 예약 상품이면 그 값은 "지금 받는 값" 이 아니다 — 값 옆 딱지와 아래 안내로 말한다
  const preorder = best ? isPreorder(best) : false;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] text-dim">
        {["지금 최저가", best ? PLATFORM_LABEL[best.platform] ?? best.platform : null].filter(Boolean).join(" | ")}
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {/* 할인율은 값 **앞** 같은 줄에 보라 숫자로 선다 — 목록 카드(DiscountStamp)와 같은 문법이라
            카드에서 본 "-40% ₩38,880" 이 상세에서도 같은 모양으로 이어진다(2026-09-30) */}
        {hasDiscount && best?.discountPct && (
          <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-acc sm:text-[38px]">
            <DiscountText pct={best.discountPct} />
          </span>
        )}
        <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-[38px]">
          {best ? formatPrice(best.currentPrice, best.currency) : "-"}
        </span>
        {hasDiscount && best?.listPrice != null && (
          <span className="text-[14px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
        )}
        {preorder && <Tag className="self-center px-2 py-1 text-[13px]">{PREORDER_LABEL}</Tag>}
      </p>
      {preorder && best?.releaseDate && <p className="text-[13px] font-semibold text-acc">{preorderHeadlineNote(formatDate(best.releaseDate))}</p>}
      {/* 행사명과 남은 기간. 임박하면 점이 숨 쉰다 — 이 화면에서 빨강을 쓰는 유일한 자리다 */}
      {best && hasDiscount && (
        <SaleBadge discountName={best.discountName} discountEndsAt={best.discountEndsAt} discountStartsAt={best.discountStartsAt} variant="full" />
      )}
      {/*
       * 기록상 최저가. **지금보다 쌌던 적이 있을 때만** 선다 — 없으면 줄 자체를 세우지 않는다.
       *
       * "최저가 = 현재가" 를 적지 않는 이유는 그게 거짓이어서가 아니라, 우리가 열흘밖에 안 봤다는
       * 사실이 화면에 없어서다. 읽는 사람은 그 줄을 "지금이 제일 싸다" 로 읽는다(services/prices 주석).
       */}
      {recordedLow && (
        <p className="text-[12.5px] text-mut">
          {GAME_MESSAGES.recordedLowLabel} {formatPrice(recordedLow.price, recordedLow.currency)} |{" "}
          {GAME_MESSAGES.recordedLowNote(formatPrice(recordedLow.gap, recordedLow.currency), formatDate(recordedLow.at))}
        </p>
      )}
    </div>
  );
}

/**
 * 점수 표 — 오픈크리틱, 메타크리틱, 유저 점수.
 *
 * 모르는 값의 칸은 아예 세우지 않는다(2026-09-15). 전에는 칸을 늘 그리고 값이 없으면 "-" 를 넣었는데,
 * 카탈로그 대부분이 평점을 아직 안 갖고 있어서 화면에서 가장 큰 자리가 줄줄이 "-" 였다.
 * 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다. 아는 게 값뿐이면 한 줄로 그 사실을 말한다.
 *
 * **2026-09-21 — 세 점수를 한 축으로 폈다.** 전에는 오픈크리틱과 메타크리틱이 한 칸에 눌려 있고
 * (메타는 note 안의 "메타 85" 였다) 유저 점수만 "94%" 로 단위를 달고 있었다. 셋 다 0~100 값인데
 * 표기가 셋 다 달라서, 나란히 놓고도 어느 쪽이 높은지 한눈에 안 들어왔다. 값 자리는 맨 숫자로 맞추고
 * 척도는 숫자 옆 작은 "/100", 출처(유저 점수의 스토어와 표본 수)만 아래 줄이 맡는다(services 의 scoreLines).
 *
 * **출시일을 뺐다.** 바로 왼쪽 제목 밑 줄이 같은 날짜를 이미 말한다 — 한 화면에 같은 값이 두 번 서면
 * 읽는 사람은 둘이 다른 값인지 확인하느라 두 번 읽는다.
 * **플레이타임도 뺐다.** 이 기둥 아래에 3종을 막대까지 붙여 말하는 칸이 통째로 내려왔다.
 */
function ScoreGrid({ game }: { game: GameDetail }) {
  const lines = scoreLines(game.platforms);
  if (lines.length === 0) {
    return <p className="border-t border-line pt-5 text-[12.5px] leading-[1.6] text-dim">{GAME_MESSAGES.summaryPending}</p>;
  }
  return (
    /* 한 줄에 다 세운다(2026-09-22, 사용자 지적: "해당 영역은 너무 많은 자리를 차지해").
       2단 격자는 점수가 셋일 때 두 줄이 되고, 아래 줄에 칸 하나만 남아 그 옆이 통째로 비었다.
       칸 수만큼 나누면(2~3) 점수가 몇 개든 한 줄이고 높이가 게임마다 달라지지 않는다 */
    <dl className={cn("grid gap-x-3 border-t border-line pt-4", lines.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
      {lines.map((c) => (
        <StatCell key={c.key} label={c.label} value={String(c.value)} suffix={c.suffix} note={c.note} />
      ))}
    </dl>
  );
}

/**
 * 판정 칸. 찜 버튼과 같은 이유로 따로 떼어 Suspense 로 감쌌다 — 등록된 기기는 로그인에 매달린
 * 값이라, 본문이 세션 조회(실측 220ms)를 기다릴 이유가 없다.
 * 비회원은 devices 가 빈 배열이고, 그때 기기는 브라우저에서 읽는다(compat-section).
 */
async function CompatSlot({ groups, platforms }: { groups: GameDetail["requirements"]; platforms: GameDetail["platforms"] }) {
  const devices = await myDevices();
  return (
    <CompatSection
      groups={groups}
      devices={devices.map((d) => ({ ...d, id: d.id, label: d.label }))}
      platforms={platforms}
    />
  );
}

/**
 * "파는 곳" 칸. 상세 본문(getGameBySlugCached)과 **같이 캐시하지 않는다** —
 * 매장 재고는 크롤이 아니라 매장주가 손으로 바꾸는 값이라, 게임 태그를 밀어 주는 사람이 없다.
 * 상세 캐시에 얹으면 매장이 값을 고쳐도 게임 화면은 한 시간 뒤에나 따라온다.
 *
 * 그래서 Suspense 안에서 따로 받는다. 찜 버튼과 같은 자리이고, 본문이 이 질의를 기다리지 않는다.
 */
async function SellersSlot({ gameId }: { gameId: string }) {
  const sellers = await listSellersForGame(gameId);
  // 파는 곳이 없으면 칸을 아예 안 그린다 — 근거는 SellersSection 머리 주석
  if (sellers.length === 0) return null;
  return (
    <section aria-labelledby="sellers-heading" className={sectionCardClass("flex flex-col gap-3")}>
      <SectionHead id="sellers-heading" title={SELLING_MESSAGES.title} note={SELLING_MESSAGES.lead} />
      <SellersSection sellers={sellers} />
    </section>
  );
}

/**
 * 로그인했으면 등록한 기기, 아니면 빈 목록. 두 자리(판정 칸, 제목 옆 한 줄)가 같은 답을 써야 해서
 * 한 함수로 둔다 — 질의 자체는 요청 안에서 캐시된다(services/devices 의 listMyDevices).
 */
async function myDevices() {
  const user = await getCurrentUser();
  return user ? await listMyDevices() : [];
}

/**
 * 마디 제목 옆의 판정 한 마디. 세션에 매달린 값이라(등록한 기기) 본문을 기다리게 하지 않는다 —
 * 비회원은 이 슬롯이 빈 목록을 넘겨도 컴포넌트가 브라우저의 기기를 스스로 읽는다.
 */
async function VerdictNoteSlot({ groups }: { groups: GameDetail["requirements"] }) {
  const devices = await myDevices();
  return (
    <VerdictNote
      devices={devices.map((d) => ({ ...d, id: d.id, label: d.label }))}
      groups={groups.map((g) => ({
        osFamily: g.osFamily,
        minimum: g.minimum ? { cpuTiers: g.minimum.cpuTiers, gpuTiers: g.minimum.gpuTiers, ramMb: g.minimum.ramMb, storageMb: g.minimum.storageMb } : null,
        recommended: g.recommended
          ? { cpuTiers: g.recommended.cpuTiers, gpuTiers: g.recommended.gpuTiers, ramMb: g.recommended.ramMb, storageMb: g.recommended.storageMb }
          : null,
      }))}
    />
  );
}

export default async function GameDetailPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);

  /*
   * 한 번에 던진다. 전에는 다섯 개를 줄 세워 await 했다 —
   * 상세 → 세션 → 찜 여부 → 패치 → 눈금 순으로, 앞이 끝나야 뒤가 나갔다.
   * 질의 자체는 DB 에서 10~20ms 인데 Neon(us-east-1) 왕복이 한 번에 200ms 대다(list.ts 주석).
   * 그래서 이 화면의 서버 시간은 거의 전부 "기다림" 이었다 — 실측 1,547ms(2026-09-15, 로컬 prod, 콜드).
   * 셋은 서로를 참조하지 않으므로 같이 나간다.
   *
   * 세션과 찜 여부는 여기서 기다리지 않는다 — WishlistSlot 이 Suspense 안에서 따로 받아 온다(아래 주석).
   */
  const [game, patchGroups, perHourScale, recordedLow] = await Promise.all([
    getGameBySlugCached(slug),
    // 패치 기록은 상세 조회와 같은 태그(`game:<slug>`)로 따로 캐시된다 — 붙는 테이블이 game_platforms 라
    // 상세 질의에 얹으면 화면이 안 쓰는 행까지 통째로 끌려온다
    getGamePatchesCached(slug),
    // 시간당 가격을 세울 눈금 - 이 게임이 아니라 카탈로그의 성질이라 게임 태그와 따로 캐시된다
    getPricePerHourScale(),
    // 기록상 최저가. 지금보다 쌌던 적이 있을 때만 값이 온다(services/prices 의 getRecordedLow 주석)
    getRecordedLow(slug),
  ]);
  if (!game) notFound();

  const title = displayTitle(game);
  // 이 게임이 어디서 만들어졌나. 개발사 우선이고, 고르는 규칙은 mappers 의 originCountry 가 갖는다
  const origin = originCountry(game.companies);
  const platforms: PlatformPriceItem[] = game.platforms.map((p) => ({
    ...p,
    freshness: getFreshness(p.lastSyncedAt, p.syncStatus),
  }));
  const best = cheapestPlatform(game.platforms);
  /** 최저가가 0원 — 할인 알림을 걸 자리가 없다. 값이 없는 것(null)과 가른다 */
  const isFree = best?.currentPrice === 0;
  // 플레이 방식 칩이 하나라도 서는지 — 장르와 사이의 구분선을 그릴지 정한다
  const hasPlayModes =
    game.supportsSolo ||
    game.supportsCoop ||
    game.supportsPvp ||
    Boolean(game.localMaxPlayers) ||
    Boolean(game.onlineMaxPlayers);

  return (
    /* 마디 사이 44 에서 30 으로, 다시 22 로 줄였다(2026-09-22, 사용자 지적 두 번).
       히어로의 오른쪽 기둥은 sticky 라 아래로 길고, 왼쪽은 커버가 끝나면 곧 바닥이다 —
       그 짧은 쪽 아래에 큰 여백이 붙으면 "플랫폼 정보" 제목이 히어로에서 떨어져 나온 것처럼 읽혔다.
       마디가 서로 안 붙는 일은 제목 크기(SECTION_SIZE.section, 22px)가 이미 하고 있다 */
    <Page pad="detail" gap={22}>
      <BackLink href={ROUTES.game}>게임 목록으로</BackLink>
      {/* 조회 기록 — 수집이 사람들이 보는 게임을 먼저 갱신하게 한다(server/game-views). 화면에는 아무것도 안 그린다 */}
      <GameViewBeacon slug={game.slug} />

      {/* 섹션 1 — 헤더 블록. 왼쪽은 "무슨 게임인가", 오른쪽은 "지금 사도 되나" 다.
          오른쪽 기둥은 스크롤을 따라온다 — 아래 가격표와 사양을 읽는 동안에도 결론이 화면에 남아야 한다.
          안쪽 조각마다 .enter-item 을 붙이는 이유: 헤더는 300px 넘는 덩어리라 통째로 페이드하면
          화면이 한 번에 툭 던져진다. 커버, 제목, 요약, 장르, 설명 순으로 들어와야 목록 화면과 결이 같다.
          (조각이 하나라도 .enter-item 이면 감싼 section 은 애니메이션에서 빠진다 — 겹쳐 페이드 방지) */}
      {/* 왼쪽 기둥을 둘로 갈랐다(2026-09-29, 사용자: "가시성이 너무 떨어져"). 한 기둥으로 접히는 좁은 화면에서
          값 칸이 설명과 장르 **아래**에 서서, 휴대폰 첫 화면에 값이 한 번도 안 보였다 — 가격 비교 화면의
          첫 질문이 스크롤 두 번 밑에 있었다. 문서 순서를 "커버, 제목 - 값 - 설명" 으로 두고, 넓은 화면에서는
          오른쪽 기둥이 두 줄을 걸쳐 서게 해 배치가 전과 같다. 줄 높이를 auto_1fr 로 박는 이유: 오른쪽 기둥이
          더 길면 남는 높이가 첫 줄로 가서 제목과 설명 사이가 벌어진다 — 둘째 줄이 받게 한다 */}
      <section className="grid items-start gap-x-9 gap-y-6 pb-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.72fr)] lg:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          {/*
            커버는 스탬프가 모서리 밖으로 나가므로 relative 상자와 overflow 상자를 갈라 둔다(game-card 와 같은 규칙).

            **세로 아트의 비율을 원본에 맞추고 폭을 300 에서 400 으로 넓혀 가운데로 옮겼다**(2026-09-21).

            비율부터가 틀려 있었다. 넓은 화면의 칸이 3:4 였는데 원본을 재어 보니 **전부 2:3** 이다
            (무작위 표본 12건, 1440x2160 / 720x1080 / 300x450, 12건 모두 0.667). object-cover 라
            2:3 그림이 3:4 칸에 들어가면 위아래로 12%씩 잘린다 — 세로 아트에서 그 자리는 대개
            로고와 인물 머리다. 칸을 2:3 으로 맞추면 잘리는 곳이 없다.

            기둥을 꽉 채우지 않는 이유는 재어 보면 나온다. 최대폭 1200 에서 가로 간격 36 을 빼고
            1.25 대 0.72 로 가르면 왼쪽 기둥은 약 738px 이다. 여기에 2:3 을 꽉 채우면 높이가 1,107px 이
            되어 제목이 통째로 첫 화면 밖으로 밀린다 — 커버가 답하는 질문("무슨 게임인가")을 커버가
            제목을 가려서 못 답하게 되는 셈이다.

            **400 에서 300 으로 줄였다**(2026-09-22, 사용자 지적: "이미지 영역이 너무 높이가 높아 보여").
            400 은 높이가 600px 이라 첫 화면에서 커버 아래 제목과 설명이 거의 안 보였다 — 세로 아트는
            가로 아트와 달리 폭을 조금만 줘도 높이가 1.5배로 자란다. 300 이면 높이 450px 이라 제목,
            회사, 설명 첫 줄까지 커버와 한 화면에 같이 선다. 원본이 300px 인 건이 표본에 있어
            이 아래로는 굳이 내릴 이유도 없다(더 줄여도 받는 파일이 같다).

            남는 좌우 여백은 가운데 정렬로 일부러 둔 것처럼 읽히게 했다 — 왼쪽에 붙여 두면
            "오른쪽이 비었다" 로 읽히고, 가운데 두면 "이게 이 그림의 크기다" 로 읽힌다.

            sm:w-full 을 빼면 안 된다(2026-09-21 회귀). 부모가 flex-col 이라 자식은 기본 stretch 로
            기둥 폭을 받는데, mx-auto 가 붙는 순간 auto 마진이 그 stretch 를 끈다. 그러면 폭이
            shrink-to-fit 이 되고 안쪽은 position:absolute 인 이미지뿐이라 잴 것이 없어 0 이 된다 —
            w-full 도 0 의 100%라 같이 0 이고, 결국 데스크탑에서만 커버가 통째로 사라졌다.
            w-full 로 폭을 먼저 확정해 두면 max-w 가 400 에서 자르고 마진이 남은 자리를 가른다.

            좁은 화면(sm 아래)은 건드리지 않는다. 거기는 기둥이 하나뿐이라 이미 꽉 차 있고,
            4:3 은 세로 아트를 반쯤 보여 주되 인물과 로고가 모이는 가운데 띠를 남기는 선이다 —
            휴대폰에서 2:3 을 펴면 커버 하나가 첫 화면을 다 먹는다.
          */}
          <div
            className={`enter-item relative ${game.portraitUrl ? "sm:mx-auto sm:w-full sm:max-w-[300px]" : ""}`}
            style={stagger(0)}
          >
            <div
              className={`cover-elev relative w-full overflow-hidden rounded-[var(--radius-cover-lg)] bg-surface-3 ${
                game.portraitUrl ? "aspect-[4/3] sm:aspect-[2/3]" : "aspect-[460/215]"
              }`}
            >
              <CoverImage
                src={game.portraitUrl ?? game.coverUrl}
                alt={`${title} 커버`}
                // 세로 아트는 sm 위에서 300 을 넘지 않는다 — 640 으로 두면 그만큼 큰 원본을 받아 놓고 버린다
                sizes={game.portraitUrl ? "(max-width: 639px) 100vw, 300px" : "(max-width: 1023px) 100vw, 640px"}
                priority
              />
            </div>
            {/* 커버에는 할인율을 찍지 않는다(2026-09-22, 사용자 지정). 상세에 들어온 사람은 바로 오른쪽에서
                값과 할인율을 이미 읽는다 — 그림 위의 도장은 같은 사실을 두 번 말하면서 아트를 가린다.
                목록 카드(game-card)에는 그대로 있다: 거기서는 값이 작고, 훑는 눈이 잡을 표시가 그것뿐이다 */}
          </div>

          <div className="enter-item flex flex-col gap-2.5 pt-2.5" style={stagger(1)}>
            {/* 자식(DLC, 에디션)일 때만 선다 - 본편 화면에서는 아무것도 그리지 않는다 */}
            <ContentKindHead contentType={game.contentType} parent={game.parent} />
            <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[32px] sm:leading-[1.12]">{title}</h1>
            {/* 장르를 이 줄에서 뺐다(2026-09-21). 전에는 "2020년 3월 12일 (목) 출시 | 스포츠, 액션, 캐주얼" 이
                한 줄이었는데, 파이프 왼쪽은 이 게임의 사실(언제 나왔나)이고 오른쪽은 분류(어떤 갈래인가)라
                성질이 다르다. 게다가 장르가 넷을 넘으면 줄이 접히면서 출시일이 장르 사이에 낀 것처럼 읽혔다.
                여기는 "언제, 누가" 만 말하고, 장르는 아래 칩 줄이 맡는다 */}
            {/* 나라는 이 줄의 끝에 국기 한 장과 이름으로 선다(2026-09-22, 사용자 지정: 회사 칩의
                "(대한민국)" 괄호를 걷고 출시일 옆으로). 나라는 회사마다가 아니라 이 게임의 성질이라
                한 번만 적으면 되고, 그 한 번이 "언제, 어디" 를 함께 말하는 이 줄에 붙는 게 맞다.
                국기를 왼쪽에 두지 않는 이유: 이 줄의 첫 값은 원제(또는 출시일)여야 눈이 제목에서
                바로 이어 읽는다 — 국기가 앞에 서면 매번 그림부터 읽고 글자로 되돌아온다 */}
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] text-mut">
              {[game.titleKo ? game.titleEn : null, game.releaseDate ? releaseLineText(formatDate(game.releaseDate), game.releaseDate.slice(0, 10) > kstDateKey(new Date())) : null]
                .filter(Boolean)
                .map((text, i) => (
                  <span key={text as string} className="inline-flex items-center gap-x-1.5">
                    {i > 0 && <span className="text-dim-2">|</span>}
                    {text}
                  </span>
                ))}
              {origin && (
                <span className="inline-flex items-center gap-x-1.5">
                  <span className="text-dim-2">|</span>
                  <Flag code={origin.countryCode} />
                  {origin.countryNameKo}
                </span>
              )}
            </p>
            <CompanyChips companies={game.companies} developer={game.developer} publisher={game.publisher} genres={game.genres} />
          </div>

        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
          {game.description && (
            <p className="enter-item max-w-[620px] text-[14px] leading-[1.8] text-mut" style={stagger(2)}>
              {game.description}
            </p>
          )}


        </div>

        {/* lg 아래에서는 붙이지 않는다 — 한 기둥으로 접히면 따라올 대상이 자기 자신뿐이다.
            sticky 인 기둥에 넣을 것을 고르는 기준은 "사는 결정에 직접 쓰이나" 다 —
            값, 알림 버튼, 점수, 그리고 플레이타임까지 넷이 여기 산다. */}
        {/* 결론 기둥은 흰 판 한 장이다(2026-09-30, sectionCardClass) — 회색 바탕 위에서 "여기가 사는 자리" 로 떠야 한다.
            커머스 상세의 구매 박스와 같은 자리, 같은 역할이다 */}
        <div
          className={sectionCardClass(
            "enter-item row-start-2 flex min-w-0 flex-col gap-5 lg:sticky lg:top-[80px] lg:col-start-2 lg:row-span-2 lg:row-start-1",
          )}
          style={stagger(4)}
        >
          <PriceHeadline game={game} recordedLow={recordedLow} />

          {/* 찜 버튼은 숨겼다(2026-09-21, 사용자 결정) — WishlistSlot 과 그 폴백은 그대로 둔다.
              되살릴 때는 이 자리에 Suspense 한 겹을 되돌리면 된다(site-header 주석에 같이 적었다)

              무료 게임에는 이 버튼을 세우지 않는다(2026-09-21). 0원에는 내려갈 자리가 없어서
              알림을 걸어 두면 영원히 울리지 않는 조건이 계정에 남는다. 값이 아예 없는 게임
              (best === null)은 아직 안 긁었다는 뜻이라 버튼을 그대로 둔다 — 값이 붙는 순간
              쓸모가 생기는 조건이다. */}
          {!isFree && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`}
                // 잉크가 아니라 브랜드 보라다(2026-09-22, 사용자 지정) — 이 화면에서 누를 자리의 으뜸이고,
                // 최저가 스토어 버튼, 칩과 같은 색이어야 "누르는 것" 이 한 색으로 읽힌다
                className={buttonClass({ variant: "accent", size: "lg", className: "min-w-[140px] flex-1" })}
              >
                할인 알림 받기
              </Link>
            </div>
          )}

          <ScoreGrid game={game} />

          {/* 플레이 방식, 스팀덱 등급, 네이티브 OS, 한국어 — "어떻게 즐기나" 를 말하는 값이라 한 줄에 모인다.
              왼쪽(무슨 게임인가)에서 오른쪽(사도 되나)으로 옮겼다(2026-09-22, 사용자 지정).
              "솔로" 와 "스팀덱 검증됨" 은 장르처럼 게임을 설명하는 말이 아니라 **내 조건에 맞나**를
              가르는 값이다 — 혼자 할 사람과 덱을 든 사람에게는 값, 점수와 같은 무게로 읽힌다 */}
          {(hasPlayModes || game.platforms.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
              <MultiplayerBadges
                localMaxPlayers={game.localMaxPlayers}
                onlineMaxPlayers={game.onlineMaxPlayers}
                supportsSolo={game.supportsSolo}
                supportsCoop={game.supportsCoop}
                supportsPvp={game.supportsPvp}
              />
              <PcSupportBadges platforms={game.platforms} />
              <KoreanSupportBadges platforms={game.platforms} />
            </div>
          )}

          {/*
            플레이타임을 이 기둥으로 올렸다(2026-09-21).

            전에는 화면 한참 아래에서 사양표와 나란히 두 칸을 이루고 있었다. 그런데 이 칸이 답하는
            "얼마나 걸리나" 와 그 아래 "시간당 얼마인가" 는 값과 같은 질문의 뒷면이다 —
            10만원이 비싼지는 100시간짜리인지 3시간짜리인지를 알아야 정해진다. 값에서 두 화면 아래
            떨어져 있으면 둘을 머릿속에서 이어 붙여야 했다. 결론끼리 붙여 두면 그 일이 없어진다.

            기둥이 좁아 막대가 짧아지는 문제는 남는다(실측 약 200px). 그래도 막대는 보조 그래픽이고
            값은 늘 숫자로도 읽힌다 — 좁은 막대보다 먼 거리가 더 비쌌다.
          */}
          <div className="border-t border-line pt-5">
            <PlaytimeCard playtime={game.playtime} currentPrice={best?.currentPrice ?? null} currency={best?.currency} scale={perHourScale} />
          </div>
        </div>
      </section>

      {/* 히어로가 머리띠에 가리는 순간부터 제목과 최저가를 머리띠 자리에 띄운다(2026-09-22).
          센티넬이 여기 서야 "히어로를 지나쳤나" 가 된다 — 더 위에 두면 스크롤 첫 픽셀에서 켜진다 */}
      <GameHeadbar
        title={title}
        price={best && best.currentPrice !== null ? formatPrice(best.currentPrice, best.currency) : null}
        listPrice={
          best && best.discountPct && best.listPrice !== null && best.listPrice !== best.currentPrice
            ? formatPrice(best.listPrice, best.currency)
            : null
        }
        discountPct={best?.discountPct ?? null}
        // 나라별로 여러 행인 플랫폼(스위치 한국, 일본)이 배지로 두 번 서지 않게 접는다
        platforms={[...new Set(game.platforms.map((p) => p.platform))]}
        alertHref={isFree ? null : `${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`}
      />

      {/*
        섹션 2 이후 — 근거. 한 마디가 한 줄을 통째로 쓴다(2026-09-21 리디자인).

        전에는 본문 2 : 사이드바 1 의 두 기둥이었고, 플레이타임과 출처가 사이드바에 갇혀 있었다.
        그 기둥이 좁아 막대가 120px 밖에 안 됐고, 가격표가 8줄인 게임에서는 오른쪽이 통째로 비었다.
        지금은 결론만 위에서 따라오고(섹션 1의 오른쪽 기둥), 근거는 마디별로 폭을 다 쓴다.

        칸마다 min-w-0 을 다는 이유(2026-09-16): 격자 칸의 기본 최소 크기는 auto 다. 그래서 칸은
        "안쪽에서 줄바꿈 없이 필요한 폭" 아래로는 절대 줄지 않는다. 안에는 한 줄로 자르는 제목
        (Clamp, truncate = white-space: nowrap)이 있고, 그 제목의 최소 폭은 잘리기 전 글자 전체 폭이다 —
        자식 컴포넌트가 min-w-0, flex-1 을 아무리 붙여도 그 값은 칸까지 올라온다.
        긴 DLC 제목 하나가 상세 본문 전체를 520px 로 밀어 화면 밖으로 내보냈다(390px 기기, ea-sports-fc-26).
      */}
      <section aria-labelledby="platforms-heading" className={sectionCardClass("enter-item flex min-w-0 flex-col gap-3.5")} style={stagger(5)}>
        <SectionHead
          id="platforms-heading"
          title="플랫폼 정보"
          // 행사 이름과 남은 기간은 제목 옆 곁말 자리다(2026-09-30, 사용자 지정) — 근거는 PlatformSaleNote 주석
          note={<PlatformSaleNote platforms={game.platforms} />}
          action={
            <Link href={gamePricesPath(game.slug)} className="text-[13px] text-acc hover:underline">
              가격 변동 그래프
            </Link>
          }
        />
        {/* 요약 바가 인용한 스토어의 유저 점수는 행 안에서 또 적지 않는다(platform-prices 주석).
            추가 콘텐츠는 이 표의 행 안에서 연다(2026-09-22) — 아래에 마디를 따로 두지 않는 이유는
            components/platform-addons 머리 주석에 있다 */}
        <PlatformPrices
          platforms={platforms}
          quotedUserScorePlatform={bestUserScore(game.platforms)?.platform ?? null}
          dlcs={game.dlcs}
        />
        <UpgradeNotes upgrades={game.upgrades} />
      </section>

      {/* 에디션 — 줄 모양은 추가 콘텐츠 시트와 같다(components/dlc-rows).
          머리(건수)까지 DlcSection 안에 있다 - 플랫폼 칩으로 거른 건수를 말해야 해서다.

          가격표 바로 밑으로 올렸다(2026-09-21). 둘 다 "얼마인가" 에 답하는 값이고, 에디션은
          사실상 가격표의 연장이다 — 본편 5만원 옆에 디럭스 7만원이 있어야 고를 수 있다.
          접혀 있으니 자리를 뺏지도 않는다.

          추가 콘텐츠와 달리 마디로 남는 이유(2026-09-22): 에디션은 **본편을 대신 사는 물건**이라
          플랫폼을 고르기 전에 견줘야 한다. 추가 콘텐츠는 이미 산 사람이 기기를 정한 뒤 보는 값이라
          그 기기의 줄 안에서 연다. */}
      {game.editions.length > 0 && (
        <div className={sectionCardClass("min-w-0")}>
          <DlcSection id="edition-heading" title={GAME_MESSAGES.editionHeading} dlcs={game.editions} hasAddOns={false} />
        </div>
      )}

      {/* 사양은 가격, 추가 콘텐츠 다음이다 — 살지 말지를 정한 뒤에 오는 질문이라서다.
          콘솔 전용 게임은 groups 가 비어 있어 칸 자체가 서지 않는다.

          **두 기둥으로 갈랐다**(2026-09-21). 아침까지는 한 기둥이었고, 그 근거로 "결론과 근거를
          좌우로 갈라 놓으면 눈이 둘을 못 잇는다" 를 적어 뒀었다. 재어 보니 그 값보다 키가 더 비쌌다 —
          판정 칸 혼자 결론 면 + 부위 네 줄(각 줄이 근거까지 두 줄) + 단서 한 줄이라 화면 하나를
          거의 다 쓰고, 그 아래 "파는 곳" 과 패치 기록이 통째로 접힘선 밖으로 밀렸다.
          좌우로 세우면 같은 내용이 절반 높이에 들어오고, 둘이 한 화면에 같이 보이므로
          "못 잇는다" 던 걱정도 오히려 줄었다(스크롤 없이 나란히 읽힌다).

          왼쪽이 판정인 이유는 순서 때문이다 — 사람이 묻는 것은 "돌아가나" 이고 표는 그 근거다.
          한 기둥으로 접히는 좁은 화면(lg 아래)에서는 소스 순서대로 판정이 위에 온다.

          기본은 접어 둔다. 두 기둥으로 갈라 키를 절반으로 줄여 놓고도, 부위별 판정과 OS 별
          사양표가 함께 서면 여전히 화면 하나를 먹어 그 아래 "파는 곳" 과 패치 기록을 밀어낸다.
          "돌아가나" 는 콘솔로 살 사람에겐 아예 묻지 않는 질문이라, 묻는 사람만 열게 한다.
          제목 줄에 어느 OS 사양이 있는지(requirementNote)를 적어 두는 것은 그래서다. */}
      {game.requirements.length > 0 && (
        <div className={sectionCardClass("min-w-0")}>
        <RunCheck
          verdictTitle={COMPAT_MESSAGES.heading}
          // 접힌 채로도 답이 보여야 한다 — 이 자리에 서는 것은 "충족인가 미달인가" 한 마디다(devices/verdict-note).
          // 내 부품 이름을 적었다가 사용자가 바로잡은 자리이기도 하다
          verdictNote={
            <Suspense fallback={null}>
              <VerdictNoteSlot groups={game.requirements} />
            </Suspense>
          }
          requirementTitle={GAME_MESSAGES.requirementHeading}
          // OS 이름 대신 사양 요약을 적는다(2026-09-22) — 표를 펴면 OS 머리는 그 안에 있고,
          // 접힌 상태에서 궁금한 것은 "무엇을 요구하나" 다(lib/games/requirement-summary)
          requirementNote={requirementSummary(game.requirements) ?? game.requirements.map((g) => OS_FAMILY_LABEL[g.osFamily]).join(", ")}
          verdict={
            <Suspense fallback={null}>
              <CompatSlot groups={game.requirements} platforms={game.platforms} />
            </Suspense>
          }
          requirements={<RequirementsBody groups={game.requirements} />}
          defaultOpen={false}
        />
        </div>
      )}

      <Suspense fallback={null}>
        <SellersSlot gameId={game.id} />
      </Suspense>

      {/* 개발자가 올린 소개 글. 파는 곳처럼 캐시 밖에서 따로 받는다 — 숨김, 연결 확인이 바로 반영돼야 한다 */}
      <Suspense fallback={null}>
        <IndieGameSection gameId={game.id} />
      </Suspense>

      <div className="grid items-start gap-x-6 gap-y-6 lg:grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        {(patchGroups.length > 0 || game.sourceRefs.length > 0) && (
        <div className={sectionCardClass("flex min-w-0 flex-col gap-6")}>
          {patchGroups.length > 0 && (
            <section aria-labelledby="patches-heading" className="flex flex-col gap-3.5">
              {/* 목록은 시트 안에 둔다 — 상세에서 자리를 가장 많이 먹던 블록인데,
                  "언제 고쳐졌나" 는 한 번 확인하면 끝나는 질문이라 늘 펼쳐 둘 이유가 없다.
                  펼쳐 둘 값은 속도 표 한 줄이면 족하다 */}
              <SectionHead
                id="patches-heading"
                title={GAME_MESSAGES.patchHeading}
                action={
                  <Sheet label="패치 기록 보기" title={`${title} 패치 기록`}>
                    <PatchList items={latestPatches(patchGroups, SHEET_PATCH_LIMIT)} showPlatform={patchGroups.length > 1} />
                  </Sheet>
                }
              />
              <PatchSpeed groups={patchGroups} />
            </section>
          )}

          {game.sourceRefs.length > 0 && (
            <section aria-labelledby="sources-heading" className="flex flex-col gap-2.5 border-t border-line pt-4">
              <h2 id="sources-heading" className="text-[12px] font-bold tracking-[0.08em] text-dim">
                정보 출처
              </h2>
              <ul className="flex flex-wrap gap-1.5 text-[12px]">
                {game.sourceRefs.map((r) =>
                  r.url ? (
                    <li key={r.source}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press inline-flex items-center gap-1 rounded-full bg-surface-2 px-[11px] py-[5px] text-ink-2 transition-colors hover:bg-surface-3"
                      >
                        {r.source}
                        <span className="sr-only"> (새 창에서 열림)</span>
                      </a>
                    </li>
                  ) : (
                    // 아직 못 붙인 출처는 점선으로 둔다 — 면을 주면 "이미 있다" 로 읽힌다
                    <li key={r.source} className="rounded-full border border-dashed border-line-strong px-[11px] py-[5px] text-dim-2">
                      {r.source}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
        </div>
        )}

        <section aria-labelledby="news-heading" className={sectionCardClass("flex min-w-0 flex-col gap-3.5")}>
          <SectionHead id="news-heading" title="관련 뉴스" />
          <NewsList items={game.news} />
        </section>
      </div>
    </Page>
  );
}
