// 패치 기록 표시 — 목록(PatchList)과 플랫폼별 속도 비교(PatchSpeed).
//
// 본문을 담지 않으므로 목록의 한 줄은 "버전 + 제목 + 종류 + 날짜"다(§10 저작권).
// 스토어가 한국어 패치 노트를 주지 않아(2026-09-15 실측) 한글은 두 군데서 온다:
//   titleKo, summaryKo  우리가 본문을 읽고 쓴 글(scripts/patch-ko). 아직 안 쓴 기록은 null 이다
//   종류 딱지          제목에서 규칙으로 읽어낸 한 마디(lib/patch-kind)
// 한글 제목이 있으면 그것을 보여 주고 없으면 원문으로 폴백한다 — 채우는 일이 밀려도 목록은 선다.
// **종류 딱지는 늘 원문 제목으로 읽는다.** 규칙이 영어 낱말로 짜여 있어 한글 제목을 넣으면 아무것도 안 걸린다.
// 글 단위 주소가 있는 소스(Steam)만 제목이 링크가 되고, 없는 소스는 글자로 남는다 —
// 열리지 않는 링크를 만들지 않기 위해서다.
import { Clamp } from "@/components/ui/tooltip";
import { ROWS } from "@/components/ui/page";
import { formatDate, platformLabel } from "@/lib/format";
import { GAME_MESSAGES, patchSpeedText } from "@/lib/games/messages";
import { patchKindLabels } from "@/lib/patch-kind";
import type { PatchNoteDto, PlatformPatchesDto } from "@/server/services/games";
import type { Platform, Region } from "@/server/db/schema";

function VersionChip({ version }: { version: string | null }) {
  if (!version) return null;
  return (
    <span className="shrink-0 rounded-[6px] bg-surface-2 px-[7px] py-[2px] font-mono text-[11.5px] text-ink-2">{version}</span>
  );
}

/**
 * 무엇을 고친 패치인지 한글 한 마디로. 제목이 영어라 이게 없으면 목록이 통째로 영어다.
 * 읽어내지 못한 제목에는 아무것도 붙이지 않는다(lib/patch-kind).
 */
function KindChips({ title }: { title: string }) {
  const labels = patchKindLabels(title);
  if (labels.length === 0) return null;
  return (
    <>
      {labels.map((label) => (
        <span key={label} className="shrink-0 rounded-full bg-surface-2 px-2 py-[2px] text-[11px] text-ink-2">
          {label}
        </span>
      ))}
    </>
  );
}

type Item = PatchNoteDto & { platform?: Platform; region?: Region };

export function PatchList({ items, showPlatform = false }: { items: Item[]; showPlatform?: boolean }) {
  if (items.length === 0) {
    return <p className="py-3 text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>;
  }
  return (
    <ul className={ROWS}>
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
                <Clamp lines={2}>{n.titleKo ?? n.title}</Clamp>
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              <span className="font-semibold">
                <Clamp lines={2}>{n.titleKo ?? n.title}</Clamp>
              </span>
            )}
            {n.summaryKo && (
              <p className="mt-1 text-[12.5px] font-normal leading-[1.55] text-mut">
                <Clamp lines={3}>{n.summaryKo}</Clamp>
              </p>
            )}
          </div>
          <KindChips title={n.title} />
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
    // 칸을 세로선으로 가르던 격자를 헤어라인 줄로 바꿨다 — 스토어가 둘일 때와 넷일 때
    // 칸 폭이 달라져 같은 표가 화면마다 다르게 읽혔다. 줄은 몇 개든 같은 모양이다
    <dl className={ROWS}>
      {groups.map((g) => (
        <div key={`${g.platform}:${g.region}`} className="flex items-baseline justify-between gap-2.5 py-[11px]">
          <dt className="text-[13.5px] font-bold text-ink">{platformLabel(g)}</dt>
          <dd className="text-right">
            <span className="block text-[13px] text-ink">{g.latestAt ? formatDate(g.latestAt) : "-"}</span>
            <span className="text-[11.5px] text-dim">{patchSpeedText(g.averageIntervalDays, g.count)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
