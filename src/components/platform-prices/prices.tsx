// 플랫폼별 가격 비교 — 상세 화면(기획서 v2.0 S-05, 목업 "플랫폼별 가격 비교"). 스토어마다 카드 한 장, 전부 펼쳐 놓는다.
//
// 탭을 걷어낸 이유(2026-09-15)는 그대로다: 이 블록에 오는 사람이 하려는 일은 "어디가 싼가" 비교라,
// 한 번에 한 스토어만 보여 주면 숫자를 외워 가며 눌러야 한다.
//
// **없는 스토어도 카드를 세운다**(2026-09-21). 파는 곳만 그리면 "스위치에 없다" 와 "스위치를 아직 안 긁었다" 가
// 화면에서 똑같이 생긴 빈자리가 된다. 목업도 미지원 카드를 흐리게 세운다.
//
// 카드 모양은 tile.tsx, 순서와 이름 규칙은 order.ts 가 갖는다. 행사 이름 곁말은 sale-note.tsx.
// 상태가 없어 서버 컴포넌트다(SaleBadge, 알림 버튼만 클라이언트).
import { kstDateKey } from "@/lib/format";
import { BEST_MIN_PRICED, brandAnchorId, brandNameOf, byPrice, isUpcomingRow, mergeableGroups, mergeGroupKey, mergePickKey, orderCards, releaseText, rowKey, type PlatformPriceItem } from "@/components/platform-prices/order";
import { AbsentTile, PriceTile, UpcomingTile } from "@/components/platform-prices/tile";
import { MergedTile } from "@/components/platform-prices/merged-tile";
import { PC_PICK_KEY, PLATFORM_FAMILY_LABEL } from "@/lib/platform";
import { GAME_MESSAGES } from "@/lib/games/messages";

/**
 * 좁은 화면 1장, sm 2장, lg 4장 — 목업 .pg. 스토어가 넷을 넘으면 다음 줄로 이어진다.
 * 카드는 이 격자의 일곱 줄을 빌려 쓴다(tile.tsx 의 TILE, subgrid) — 같은 띠의 카드끼리 줄 높이가 맞는다.
 * 세로 틈(gap-y)은 띠와 띠 사이 틈이다. 카드 안 줄 틈은 카드가 제 gap-y 로 덮는다
 */
const GRID = "grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-4";

export function PlatformPrices({
  platforms,
  releaseFallback = null,
  upcomingAll = false,
  releaseAction,
}: {
  platforms: PlatformPriceItem[];
  /** 스토어가 출시일을 안 준 카드(PlayStation)에 대신 적을 게임 단위 출시일 */
  releaseFallback?: string | null;
  /** 게임 전체가 출시 전이고 값이 하나도 없다 — 모든 행을 출시 카드로 세운다(목업 g.up) */
  upcomingAll?: boolean;
  /**
   * 출시 카드마다 붙일 알림 버튼을 만드는 함수. 버튼은 로그인, 팝업을 쥔 클라이언트 조각이라 이 파일이 직접 import 하지 않고 화면이 넘긴다.
   * 게임 전체가 출시 전이 아니어도 "이 기기로는 아직" 인 행(isUpcomingRow)은 출시 카드가 된다.
   */
  releaseAction?: (p: PlatformPriceItem) => React.ReactNode;
}) {
  const cards = orderCards(platforms);
  if (cards.length === 0) {
    return <p className="py-5 text-[13px] text-dim">플랫폼 정보가 아직 없어요.</p>;
  }

  // 최저가는 **값 순서**로 정한다. 묶음 정렬이 카드 자리를 바꾸므로 "맨 앞 카드" 로 잡으면 엉뚱한 카드에 붙는다
  const cheapest = [...platforms].sort(byPrice)[0] ?? null;
  // 값이 붙은 카드가 둘 이상일 때만 "최저가" 다(2026-10-27 사용자). 하나뿐이면 견줄 대상이 없어 그 말이 거짓이 된다 —
  // 통화가 다른 카드는 견주지 않으므로(byPrice) 같은 통화끼리만 센다
  const priced = cheapest?.currentPrice != null ? platforms.filter((p) => p.currentPrice !== null && p.currency === cheapest.currency).length : 0;
  const bestKey = cheapest && priced >= BEST_MIN_PRICED ? rowKey(cheapest) : null;
  // 히어로 이름이 눌러 내려올 id 는 묶음의 첫 카드만 받는다 — 같은 id 가 둘이면 링크가 엉뚱한 장을 잡는다
  const anchored = new Set<string>();
  const anchorOnce = (id: string) => (anchored.has(id) ? undefined : (anchored.add(id), id));
  const today = kstDateKey(new Date());
  const upcoming = (p: PlatformPriceItem) => upcomingAll || isUpcomingRow(p, releaseFallback, today);
  // 같은 갈래 값 카드가 둘 이상이면 한 장으로 합친다 — PC(Steam, Epic), PlayStation(PS5, PS4), Nintendo(Switch, Switch 2).
  // 한쪽이 출시 전이면 합치지 않는다(merged-tile 머리 주석, order 의 mergeableGroups)
  const rowsOnly = cards.flatMap((c) => (c.kind === "row" ? [c.row] : []));
  const merged = mergeableGroups(rowsOnly, upcoming);
  const groupRows = (key: string) => rowsOnly.filter((r) => mergeGroupKey(r) === key);

  const absent = cards.flatMap((c) => (c.kind === "absent" ? [c.brand.label] : []));
  return (
    <>
    <ul className={GRID}>
      {cards.map((c) => {
        if (c.kind === "absent") {
          // 좁은 화면에서는 카드를 숨기고 격자 아래 한 줄로 모은다(AbsentLine). 한 장에 약 180px 이라 안 파는 곳이 파는 곳을 밀어냈다
          return <AbsentTile key={c.brand.key} id={anchorOnce(brandAnchorId(c.brand.platform))} label={c.brand.label} className="max-sm:hidden" />;
        }
        const p = c.row;
        const group = mergeGroupKey(p);
        if (group && merged.has(group)) {
          const gRows = groupRows(group);
          if (p !== gRows[0]) return null; // 묶음 첫 줄 자리에 한 장만 선다
          const [first, ...rest] = gRows.map((r) => anchorOnce(brandAnchorId(r.platform)));
          return (
            <MergedTile
              key={group}
              label={group === PC_PICK_KEY ? PLATFORM_FAMILY_LABEL.pc : brandNameOf(p)}
              pickKey={mergePickKey(group, p)}
              rows={gRows}
              id={first}
              secondId={rest.find(Boolean)}
              isBest={gRows.some((r) => rowKey(r) === bestKey)}
              release={gRows.map((r) => releaseText(r, releaseFallback)).find(Boolean) ?? null}
            />
          );
        }
        const id = anchorOnce(brandAnchorId(p.platform));
        const release = releaseText(p, releaseFallback);
        if (upcoming(p)) {
          return <UpcomingTile key={rowKey(p)} p={p} id={id} release={release} action={releaseAction?.(p)} />;
        }
        return (
          <PriceTile
            key={rowKey(p)}
            p={p}
            id={id}
            isBest={rowKey(p) === bestKey}
            release={release}
          />
        );
      })}
    </ul>
    {absent.length > 0 && <AbsentLine labels={absent} />}
    </>
  );
}

/**
 * 좁은 화면의 안 파는 플랫폼 한 줄(2026-11-20 사용자 "플랫폼 서비스 하지 않는 건 뒤로 밀고 1행으로 간단하게").
 * 넓은 화면은 카드 그대로다 — 네 칸 격자에서 빈 자리가 "없다" 를 말한다(머리 주석 2026-09-21).
 */
function AbsentLine({ labels }: { labels: string[] }) {
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border border-dashed border-line-strong bg-surface-2/50 px-4 py-3 text-[13px] sm:hidden">
      <span className="text-dim">{GAME_MESSAGES.storeAbsentHead}</span>
      <span className="font-semibold text-mut">{labels.join(", ")}</span>
    </p>
  );
}
