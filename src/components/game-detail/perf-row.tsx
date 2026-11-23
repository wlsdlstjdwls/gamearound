// 플랫폼별 성능 — "성능 정보" 탭에서 내 사양, PC 최소 사양 아래에 선다(2026-11-16 사용자, 피드백 v11 목업 "플랫폼별 성능 4칸 나열").
//
// 기기 갈래(PC, PlayStation, Xbox, Switch)마다 칸 하나. 칸 안은 "항목 이름 | 값" 줄이다(2026-11-23 사용자
// "4K | 120fps 라고 쓰지 말고 어떤 항목이 무슨 값인지 이쁘게"). 전에는 머리에 "4K | 120fps" 를 파랑 글자로 세우고
// 나머지를 꼬리표로 흩었는데, 무엇이 해상도고 무엇이 프레임인지 읽는 사람이 맞혀야 했다.
// 줄 이름과 묶음은 lib/games/perf 의 perfLines 한 곳이 정한다. 스토어 사실(기종, 스팀덱, 업그레이드)도 같은 줄 꼴로 잇는다.
// 표지 출처는 lib/games/perf 머리 주석 — Xbox 카탈로그, PCGamingWiki. PlayStation, 닌텐도는 스토어가 성능 값을 주지 않아
// 기종, 업그레이드만 서거나 "공개된 성능 정보가 없어요" 다. 목업의 "성능 모드 1440p 60fps / 화질 모드 4K 30fps" 같은 모드별 숫자는
// 어느 출처도 주지 않는다 — 지어내지 않는다.
// 네 기기 칸은 늘 선다(2026-11-23 사용자 "없어도 닌텐도 칸을 넣어줘") — 이 게임이 안 나온 기기는 "출시하지 않았어요" 라고 말한다.
// 칸 안 줄은 두 열 격자, 이름 위 값 아래(같은 날 "세로로 너무 길어지니 2열로"). 출처 안내 줄은 걷었다(같은 날 사용자).
import { DECK_COMPAT_SHORT, upgradeText } from "@/lib/games/messages";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { normalizePerf, perfLines, type PerfLine } from "@/lib/games/perf";
import { DEVICE_LABEL, DEVICES, devicesOf, type Device } from "@/lib/platform";
import { HOME_REGION } from "@/server/db/schema";
import { cn } from "@/lib/cn";
import type { GameDetail } from "@/server/services/games";

type Cell = { device: Device; released: boolean; lines: PerfLine[] };

function cellOf(game: GameDetail, device: Device): Cell {
  const rows = game.platforms.filter((p) => p.region === HOME_REGION && devicesOf([p.platform])[0] === device);
  const lines = perfLines(normalizePerf(rows.flatMap((r) => r.perfFeatures ?? [])));
  // 기종 이름(PS5, PS4)은 콘솔만 — "이 기기의 어느 판이 있나" 가 성능의 첫 질문이다
  const gens = [...new Set(rows.map((r) => PLATFORM_LABEL[r.platform]).filter(Boolean))];
  // 기종이 칸 이름과 같으면("Xbox" 칸의 "Xbox") 말할 것이 없어 줄을 세우지 않는다
  const model = gens.filter((g) => g !== DEVICE_LABEL[device]);
  if (device !== "pc" && model.length > 0) lines.unshift({ label: D.perfLineModel, value: model.join(", ") });
  const deck = [...new Set(rows.flatMap((r) => (r.deckCompat ? [DECK_COMPAT_SHORT[r.deckCompat]] : [])))];
  if (deck.length > 0) lines.push({ label: D.perfLineDeck, value: deck.join(", ") });
  const upgrades = game.upgrades
    .filter((u) => devicesOf([u.toPlatform])[0] === device)
    .map((u) => upgradeText(u.kind, PLATFORM_LABEL[u.toPlatform] ?? u.toPlatform, u.kind === "paid" && u.price !== null ? formatPrice(u.price) : null));
  if (upgrades.length > 0) lines.push({ label: D.perfLineUpgrade, value: [...new Set(upgrades)].join(", ") });
  return { device, released: rows.length > 0, lines };
}

export function PerfRow({ game }: { game: GameDetail }) {
  if (devicesOf(game.platforms.filter((p) => p.region === HOME_REGION).map((p) => p.platform)).length === 0) return null;
  const cells = DEVICES.map((d) => cellOf(game, d));
  return (
    <section aria-labelledby="perf-row-heading" className="flex min-w-0 flex-col gap-2.5">
      <h3 id="perf-row-heading" className="text-[13px] font-bold text-acc">
        {D.perfRowTitle}
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <li key={c.device} className={cn("flex min-w-0 flex-col gap-2.5 rounded-[var(--radius-md)] px-4 py-3.5", c.released ? "bg-surface shadow-[var(--elev-card)]" : "bg-surface-2/60")}>
            <span className="text-[14px] font-extrabold text-ink">{DEVICE_LABEL[c.device]}</span>
            {c.lines.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {c.lines.map((l) => (
                  <div key={l.label} className="flex min-w-0 flex-col gap-0.5">
                    <dt className="text-[11.5px] text-dim">{l.label}</dt>
                    <dd className="min-w-0 break-keep text-[12.5px] font-semibold leading-[1.45] text-ink-2">{l.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[12.5px] text-dim">{c.released ? D.perfRowNone : D.perfRowNotReleased}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
