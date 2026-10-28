// 상세 화면에서 Suspense 안에 따로 받는 조각들 — 본문(getGameBySlugCached)과 같이 기다리지 않는 값.
// page.tsx 에서 옮겨 왔다(2026-10-26, 300줄 규약). 각 조각이 왜 따로인지는 조각마다 적었다.
import Link from "next/link";
import { CompatSection } from "@/components/compat-section";
import { EmptyLine } from "@/components/game-detail/empty-line";
import { VerdictNote } from "@/components/devices/verdict-note";
import { PriceChart } from "@/components/price-chart";
import { SellersSection } from "@/components/shops/sellers-section";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { Bone } from "@/components/ui/skeleton";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatDate } from "@/lib/format";
import { gamePricesPath } from "@/lib/routes";
import { SELLING_MESSAGES } from "@/lib/shops/listing-messages";
import type { GameDetail } from "@/server/services/games";
import { listSellersForGame } from "@/server/services/listings";
import { getPriceHistory } from "@/server/services/prices";
import { listMyDevices } from "@/server/services/devices";
import { getCurrentUser } from "@/server/services/users";

/** 본문 그래프가 그리는 기간(기획서 v2.0 S-05: 1개월~1년). 1년보다 긴 값은 전용 화면(/prices)이 맡는다 */
const CHART_DAYS = 365;
const CHART_RANGE_KEYS = ["1m", "3m", "6m", "1y"] as const;
/**
 * 기록이 이 날수보다 짧으면 그래프 밑에 "언제부터 모으는지" 한 줄을 단다. 가격 기록은 2026-10-26 새 DB 에서 다시 쌓기 시작해
 * 대부분 게임의 선이 점 몇 개뿐이라 그래프가 고장처럼 비어 보였다(2026-10-28 사용자). 한 달이면 1개월 칩이 다 차서 줄이 필요 없다
 */
const SHORT_HISTORY_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isShortHistory(firstAt: string): boolean {
  return Date.now() - Date.parse(firstAt) < SHORT_HISTORY_DAYS * MS_PER_DAY;
}

/**
 * 로그인했으면 등록한 기기, 아니면 빈 목록. 두 자리(판정 칸, 제목 옆 한 줄)가 같은 답을 써야 해서
 * 한 함수로 둔다 — 질의 자체는 요청 안에서 캐시된다(services/devices 의 listMyDevices).
 */
async function myDevices() {
  const user = await getCurrentUser();
  return user ? await listMyDevices() : [];
}

/** 판정 칸. 등록된 기기는 로그인에 매달린 값이라 본문이 세션 조회(실측 220ms)를 기다릴 이유가 없다 */
export async function CompatSlot({ groups, platforms }: { groups: GameDetail["requirements"]; platforms: GameDetail["platforms"] }) {
  const devices = await myDevices();
  return <CompatSection groups={groups} devices={devices.map((d) => ({ ...d, id: d.id, label: d.label }))} platforms={platforms} />;
}

/** 판정 제목 옆 한 마디. 비회원은 빈 목록을 넘겨도 컴포넌트가 브라우저의 기기를 스스로 읽는다 */
export async function VerdictNoteSlot({ groups }: { groups: GameDetail["requirements"] }) {
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

/**
 * "파는 곳" 칸. 상세 캐시와 같이 캐시하지 않는다 — 매장 재고는 매장주가 손으로 바꾸는 값이라 게임 태그를
 * 밀어 주는 사람이 없다. 파는 곳이 없으면 칸을 아예 안 그린다(SellersSection 머리 주석).
 */
export async function SellersSlot({ gameId }: { gameId: string }) {
  const sellers = await listSellersForGame(gameId);
  if (sellers.length === 0) return null;
  return (
    <section aria-labelledby="sellers-heading" className={sectionCardClass("flex flex-col gap-3")}>
      <SectionHead id="sellers-heading" title={SELLING_MESSAGES.title} note={SELLING_MESSAGES.lead} />
      <SellersSection sellers={sellers} />
    </section>
  );
}

function ChartHead({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 id="chart-heading" className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
        {D.chartHeading}
      </h2>
      {/* 전용 화면은 지우지 않았다 — 기간 "전체" 와 플랫폼별 요약 표는 거기만 있다 */}
      <Link href={gamePricesPath(slug)} className="text-[12.5px] text-acc hover:underline">
        {D.chartMore}
      </Link>
    </div>
  );
}

/**
 * 가격 변동 추이(목업 .chs). 2026-10-26 전에는 별도 화면(/games/[slug]/prices)에만 있었다.
 * 이력 질의는 본문과 따로 받는다 — 1년치 스냅샷이라 본문의 첫 그림을 이것 때문에 늦출 이유가 없다.
 */
export async function PriceChartSlot({ slug }: { slug: string }) {
  const series = await getPriceHistory(slug, { days: CHART_DAYS });
  // 기록이 없으면 빈 그래프 판 대신 한 줄(game-detail/empty-line, 2026-10-27 사용자 검수). 전용 화면 링크는 줄 끝에 남긴다
  if (series.length === 0) {
    return (
      <EmptyLine
        id="chart-heading"
        title={D.chartHeading}
        action={
          <Link href={gamePricesPath(slug)} className="text-[12.5px] text-acc hover:underline">
            {D.chartMore}
          </Link>
        }
      >
        {D.chartEmpty}
      </EmptyLine>
    );
  }
  // 가장 이른 기록 시각. 점은 계열마다 시간순이라 첫 점만 견준다
  const firstAt = series.map((s) => s.points[0]?.t).filter((t): t is string => Boolean(t)).sort()[0] ?? null;
  return (
    <section aria-labelledby="chart-heading" className={sectionCardClass("min-w-0")}>
      <PriceChart series={series} head={<ChartHead slug={slug} />} rangeKeys={CHART_RANGE_KEYS} />
      {firstAt && isShortHistory(firstAt) && (
        <p className="mt-3 rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-[1.6] text-mut">{D.chartShort(formatDate(firstAt))}</p>
      )}
    </section>
  );
}

/** 그래프 자리를 미리 잡는다 — 비워 두면 이력이 도착하는 순간 아래 뉴스가 한 화면만큼 밀려 내려간다 */
export function PriceChartFallback() {
  return (
    <div className={sectionCardClass("flex min-w-0 flex-col gap-3")}>
      <Bone className="h-6 w-40" />
      <Bone className="h-60 w-full sm:h-72" />
    </div>
  );
}
