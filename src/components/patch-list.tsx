// 패치 기록 표시 — 목록(PatchList)과 플랫폼별 속도 비교(PatchSpeed).
//
// 본문을 담지 않으므로 목록의 한 줄은 "버전 + 제목 + 날짜"가 전부다(§10 저작권).
// 글 단위 주소가 있는 소스(Steam)만 제목이 링크가 되고, 없는 소스(GOG)는 글자로 남는다 —
// 열리지 않는 링크를 만들지 않기 위해서다.
import { Clamp } from "@/components/ui/tooltip";
import { cardClass } from "@/components/ui/page";
import { formatDate, platformLabel } from "@/lib/format";
import { GAME_MESSAGES, patchSpeedText } from "@/lib/games/messages";
import type { PatchNoteDto, PlatformPatchesDto } from "@/server/services/games";
import type { Platform, Region } from "@/server/db/schema";

function VersionChip({ version }: { version: string | null }) {
  if (!version) return null;
  return (
    <span className="shrink-0 rounded-[6px] bg-surface-2 px-[7px] py-[2px] font-mono text-[11.5px] text-ink-2">{version}</span>
  );
}

type Item = PatchNoteDto & { platform?: Platform; region?: Region };

export function PatchList({ items, showPlatform = false }: { items: Item[]; showPlatform?: boolean }) {
  if (items.length === 0) {
    return <p className="py-3 text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>;
  }
  return (
    <ul className="divide-y divide-line-soft">
      {items.map((n) => (
        <li key={n.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 py-[13px]">
          <VersionChip version={n.version} />
          <div className="min-w-0 flex-1 text-[13px] leading-[1.5] text-ink">
            {n.url ? (
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold transition-colors duration-base hover:text-acc"
              >
                <Clamp lines={2}>{n.title}</Clamp>
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              <span className="font-semibold">
                <Clamp lines={2}>{n.title}</Clamp>
              </span>
            )}
          </div>
          <p className="flex shrink-0 items-center gap-x-1.5 text-[11.5px] text-dim">
            {showPlatform && n.platform && (
              <>
                <span>{platformLabel({ platform: n.platform, region: n.region ?? "KR" })}</span>
                <span aria-hidden>|</span>
              </>
            )}
            <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * 플랫폼별 패치 속도. 한 칸이 한 스토어다.
 * 값이 "우리가 모은 범위 안에서만" 참이라는 단서는 화면(페이지)이 표 밑에 한 번 적는다.
 */
export function PatchSpeed({ groups }: { groups: PlatformPatchesDto[] }) {
  if (groups.length === 0) return null;
  return (
    <dl className={cardClass("grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] divide-x divide-line-soft overflow-hidden")}>
      {groups.map((g) => (
        <div key={`${g.platform}:${g.region}`} className="flex flex-col gap-1 px-4 py-3.5">
          <dt className="text-[11.5px] text-dim">{platformLabel(g)}</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">
              {g.latestAt ? formatDate(g.latestAt) : "-"}
            </span>
            <span className="text-[11.5px] text-mut">{patchSpeedText(g.averageIntervalDays, g.count)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
