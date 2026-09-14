// 세대 간 업그레이드 안내 — 기획서 F6.
// Switch 2 Edition 이 첫 사례지만 표현은 세대 중립이다. PS4 에서 PS5, Xbox Smart Delivery 도 같은 줄을 쓴다.
import { formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { GAME_MESSAGES, upgradeText } from "@/lib/games/messages";
import type { UpgradeDto } from "@/server/services/games";

export function UpgradeNotes({ upgrades }: { upgrades: UpgradeDto[] }) {
  if (upgrades.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5" aria-label={GAME_MESSAGES.upgradeHeading}>
      {upgrades.map((u) => {
        const toLabel = PLATFORM_LABEL[u.toPlatform] ?? u.toPlatform;
        const price = u.kind === "paid" && u.price !== null ? formatKrw(u.price) : null;
        return (
          <li
            key={`${u.fromPlatform}-${u.toPlatform}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-surface-4 px-3 py-2 text-[12.5px]"
          >
            <span className="text-ink">{upgradeText(u.kind, toLabel, price)}</span>
            {u.note && <span className="text-dim">{u.note}</span>}
            {u.storeUrl && (
              <a
                href={u.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-acc underline-offset-2 hover:underline"
              >
                스토어에서 보기
                <span className="sr-only">(새 창에서 열림)</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
