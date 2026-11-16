// 플랫폼별 성능 한 줄 — "성능 정보" 탭에서 내 사양, PC 최소 사양 아래에 선다(2026-11-16 사용자, 피드백 v11 목업 "플랫폼별 성능 4칸 나열").
//
// 기기 갈래(PC, PlayStation, Xbox, Switch)마다 칸 하나. 칸 머리에 최대 해상도와 프레임("4K | 120fps")을 파랑 글자로 세우고,
// 그 아래 나머지 표지(HDR, 레이 트레이싱, 업스케일링 등)와 우리가 아는 사실(스팀덱 등급, 세대 업그레이드)을 적는다.
// 표지 출처는 lib/games/perf 머리 주석 — Xbox 카탈로그, PCGamingWiki. PlayStation, 닌텐도는 스토어가 성능 값을 주지 않아
// 세대, 업그레이드만 서거나 "공개된 성능 정보가 없어요" 다. 목업의 "성능 모드 1440p 60fps / 화질 모드 4K 30fps" 같은 모드별 숫자는
// 어느 출처도 주지 않는다 — 지어내지 않는다.
import { DECK_COMPAT_LABEL, upgradeText } from "@/lib/games/messages";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { normalizePerf, PERF_FEATURE_LABEL, perfHeadline, type PerfFeature } from "@/lib/games/perf";
import { DEVICE_LABEL, devicesOf, type Device } from "@/lib/platform";
import { HOME_REGION } from "@/server/db/schema";
import type { GameDetail } from "@/server/services/games";

/** 머리 줄(perfHeadline)이 이미 말한 표지 — 아래 꼬리표에서 되풀이하지 않는다 */
const HEADLINE_KEYS: readonly PerfFeature[] = ["8k", "4k", "120fps", "60fps"];

type Cell = { device: Device; headline: string | null; tags: string[]; notes: string[] };

function cellOf(game: GameDetail, device: Device): Cell {
  const rows = game.platforms.filter((p) => p.region === HOME_REGION && devicesOf([p.platform])[0] === device);
  const features = normalizePerf(rows.flatMap((r) => r.perfFeatures ?? []));
  const tags = features.filter((f) => !HEADLINE_KEYS.includes(f)).map((f) => PERF_FEATURE_LABEL[f]);
  const notes: string[] = [];
  // 세대 이름(PS5, PS4)은 콘솔만 — "이 기기의 어느 판이 있나" 가 성능의 첫 질문이다
  const gens = [...new Set(rows.map((r) => PLATFORM_LABEL[r.platform]).filter(Boolean))];
  if (device !== "pc" && gens.length > 0) notes.push(gens.join(", "));
  for (const r of rows) if (r.deckCompat) notes.push(DECK_COMPAT_LABEL[r.deckCompat]);
  for (const u of game.upgrades) {
    if (devicesOf([u.toPlatform])[0] !== device) continue;
    const price = u.kind === "paid" && u.price !== null ? formatPrice(u.price) : null;
    notes.push(upgradeText(u.kind, PLATFORM_LABEL[u.toPlatform] ?? u.toPlatform, price));
  }
  return { device, headline: perfHeadline(features), tags, notes: [...new Set(notes)] };
}

export function PerfRow({ game }: { game: GameDetail }) {
  const devices = devicesOf(game.platforms.filter((p) => p.region === HOME_REGION).map((p) => p.platform));
  if (devices.length === 0) return null;
  const cells = devices.map((d) => cellOf(game, d));
  return (
    <section aria-labelledby="perf-row-heading" className="flex min-w-0 flex-col gap-2.5">
      <h3 id="perf-row-heading" className="text-[13px] font-bold text-acc">
        {D.perfRowTitle}
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
        {cells.map((c) => {
          const empty = !c.headline && c.tags.length === 0 && c.notes.length === 0;
          return (
            <li key={c.device} className="flex min-w-0 items-start gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-[var(--elev-card)]">
              <span className="w-[76px] shrink-0 break-keep text-[13.5px] font-extrabold leading-[1.3] text-ink">{DEVICE_LABEL[c.device]}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {c.headline && <span className="text-[15px] font-extrabold tracking-[-0.02em] text-acc">{c.headline}</span>}
                {c.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <li key={t} className="rounded-[var(--radius-xs)] bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                {c.notes.map((n) => (
                  <span key={n} className="text-[12.5px] leading-[1.45] text-mut">
                    {n}
                  </span>
                ))}
                {empty && <span className="text-[12.5px] text-dim">{D.perfRowNone}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-dim">{D.perfRowNote}</p>
    </section>
  );
}
