// 플랫폼별 성능 한 줄 — "성능 정보" 탭에서 내 사양, PC 최소 사양 아래에 선다(2026-11-16 사용자 "그 아래 1행으로 플랫폼별 성능 간단하게 프레임, 화질 등등").
//
// 기기 갈래(PC, PlayStation, Xbox, Switch)마다 칸 하나, 넓은 화면은 한 줄에 다 선다. 좁은 화면은 두 칸씩이다.
// 칸에는 우리가 **실제로 아는** 성능 사실만 적는다: 스팀덱 등급(밸브 판정), 세대 업그레이드(PS4 -> PS5, Switch -> Switch 2).
// 프레임, 해상도는 아직 모으지 않는다 — Xbox 카탈로그는 4K, 60fps 같은 표지를 주지만(adapters/xbox 의 속성) 저장하지 않고 있고,
// PlayStation, 닌텐도 스토어는 그런 값을 주지 않는다. 모르는 값을 "-" 칸으로 세우면 고장으로 읽혀 그 칸은 만들지 않았다.
import { DECK_COMPAT_LABEL, upgradeText } from "@/lib/games/messages";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { DEVICE_LABEL, devicesOf, type Device } from "@/lib/platform";
import { HOME_REGION } from "@/server/db/schema";
import type { GameDetail } from "@/server/services/games";

/** 기기 갈래 하나의 성능 사실들 */
function factsOf(game: GameDetail, device: Device): string[] {
  const rows = game.platforms.filter((p) => p.region === HOME_REGION && devicesOf([p.platform])[0] === device);
  const facts: string[] = [];
  // 세대 이름(PS5, PS4)을 먼저 — "이 기기의 어느 판이 있나" 가 성능의 첫 질문이다
  const gens = [...new Set(rows.map((r) => PLATFORM_LABEL[r.platform]).filter(Boolean))];
  if (device !== "pc" && gens.length > 0) facts.push(gens.join(", "));
  for (const r of rows) if (r.deckCompat) facts.push(DECK_COMPAT_LABEL[r.deckCompat]);
  for (const u of game.upgrades) {
    if (devicesOf([u.toPlatform])[0] !== device) continue;
    const price = u.kind === "paid" && u.price !== null ? formatPrice(u.price) : null;
    facts.push(upgradeText(u.kind, PLATFORM_LABEL[u.toPlatform] ?? u.toPlatform, price));
  }
  return [...new Set(facts)];
}

export function PerfRow({ game }: { game: GameDetail }) {
  const devices = devicesOf(game.platforms.filter((p) => p.region === HOME_REGION).map((p) => p.platform));
  if (devices.length === 0) return null;
  return (
    <section aria-labelledby="perf-row-heading" className="flex min-w-0 flex-col gap-2.5">
      <h3 id="perf-row-heading" className="text-[14px] font-bold text-ink">
        {D.perfRowTitle}
      </h3>
      <ul className="grid grid-cols-2 gap-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
        {devices.map((d) => {
          const facts = factsOf(game, d);
          return (
            <li key={d} className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-3">
              <span className="text-[13px] font-bold text-ink">{DEVICE_LABEL[d]}</span>
              {facts.length > 0 ? (
                facts.map((f) => (
                  <span key={f} className="text-[12.5px] leading-[1.45] text-mut">
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-[12.5px] text-dim">{D.perfRowNone}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-dim">{D.perfRowNote}</p>
    </section>
  );
}
