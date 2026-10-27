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
import type { Platform } from "@/server/db/schema";
import type { DlcDto } from "@/server/services/games";
import { PlatformAddons } from "@/components/platform-addons";
import { brandAnchorId, brandNameOf, byPrice, orderCards, releaseText, rowKey, type PlatformPriceItem } from "@/components/platform-prices/order";
import { AbsentTile, PriceTile, UpcomingTile } from "@/components/platform-prices/tile";

/** 좁은 화면 1장, sm 2장, lg 4장 — 목업 .pg. 스토어가 넷을 넘으면 다음 줄로 이어진다 */
const GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4";

/** "최저가" 딱지를 세울 최소 비교 대상 수 — 값이 붙은 카드가 이만큼은 있어야 "가장 싸다" 가 뜻을 갖는다 */
const BEST_MIN_PRICED = 2;

export function PlatformPrices({
  platforms,
  quotedUserScorePlatform = null,
  dlcs = [],
  releaseFallback = null,
  upcomingAction,
}: {
  platforms: PlatformPriceItem[];
  /** 상세 히어로 평점 칸이 이미 인용한 유저 점수의 스토어 */
  quotedUserScorePlatform?: Platform | null;
  /** 이 게임의 추가 콘텐츠. 카드마다 자기 플랫폼 것만 걸러 시트에 넣는다(platform-addons 머리 주석) */
  dlcs?: DlcDto[];
  /** 스토어가 출시일을 안 준 카드(PlayStation)에 대신 적을 게임 단위 출시일 */
  releaseFallback?: string | null;
  /**
   * 출시 전 게임이면 값 카드 대신 출시 카드를 세운다(목업 g.up). 카드마다 붙일 알림 버튼을 만드는 함수다 —
   * 버튼은 로그인, 팝업을 쥔 클라이언트 조각이라 이 파일이 직접 import 하지 않고 화면이 넘긴다.
   */
  upcomingAction?: (p: PlatformPriceItem) => React.ReactNode;
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

  return (
    <ul className={GRID}>
      {cards.map((c) => {
        if (c.kind === "absent") {
          return <AbsentTile key={c.brand.key} id={anchorOnce(brandAnchorId(c.brand.platform))} label={c.brand.label} />;
        }
        const p = c.row;
        const id = anchorOnce(brandAnchorId(p.platform));
        const release = releaseText(p, releaseFallback);
        if (upcomingAction) return <UpcomingTile key={rowKey(p)} p={p} id={id} release={release} action={upcomingAction(p)} />;
        // 이 플랫폼에 실제로 있는 추가 콘텐츠만 넘긴다. 하나도 없으면 버튼을 안 세운다 —
        // 열어 봤자 빈 시트인 버튼은 누른 사람을 두 번 움직이게 한다
        const mine = dlcs.filter((d) => d.platforms.some((dp) => dp.platform === p.platform));
        return (
          <PriceTile
            key={rowKey(p)}
            p={p}
            id={id}
            isBest={rowKey(p) === bestKey}
            release={release}
            skipUserScore={p.platform === quotedUserScorePlatform}
            addons={mine.length > 0 || p.hasAddOns ? <PlatformAddons platform={p.platform} platformLabel={brandNameOf(p)} dlcs={mine} /> : null}
          />
        );
      })}
    </ul>
  );
}
