// 게임 상세의 "이벤트, 소식" 마디 — 공식 페이지의 공유 태그(제목, 소개, 그림)를 카드로 띄우고 원문으로 보낸다.
// 카드가 없으면 마디째 안 그린다(대부분의 게임이 그렇다).
//
// 그림은 unoptimized 로 원본 서버에서 바로 띄운다 — 사본을 만들지 않는다(schema-game-events 머리 주석).
// 카드 전체가 링크다. 제목 링크의 ::after 로 판 전체를 누를 자리로 넓힌다(목록 카드와 같은 방식).
import Image from "next/image";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatDotDate } from "@/lib/format";
import { GAME_EVENTS_MESSAGES as M } from "@/lib/game-events/messages";
import type { GameEventDto } from "@/lib/game-events/dto";
import { listGameEvents } from "@/server/services/game-events";

function when(e: GameEventDto): string {
  if (e.endsAt) return e.startsAt ? M.period(formatDotDate(e.startsAt), formatDotDate(e.endsAt)) : M.until(formatDotDate(e.endsAt));
  return e.publishedAt ? M.posted(formatDotDate(e.publishedAt)) : "";
}

function EventCard({ event }: { event: GameEventDto }) {
  return (
    <li className="lift relative flex gap-3.5 rounded-[var(--radius-md)] border border-line p-3">
      {/* 그림이 없으면 빈 회색 칸을 두지 않는다 — 닌텐도 글은 공유 그림이 사이트 로고뿐이라 대부분 그림이 없다 */}
      {event.imageUrl && (
        <span className="relative aspect-[16/9] w-[132px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-3">
          <Image src={event.imageUrl} alt="" fill sizes="132px" unoptimized className="object-cover" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11.5px] text-dim">
          <span className="font-semibold text-acc">{M.kind[event.kind]}</span> | {M.source[event.source] ?? event.source}
        </p>
        <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold leading-[1.4] text-ink after:absolute after:inset-0 hover:underline">
          <Clamp lines={2}>{event.title}</Clamp>
          <span className="sr-only">{M.newTab}</span>
        </a>
        {event.description && (
          <Clamp lines={2} className="text-[12.5px] leading-[1.5] text-mut">
            {event.description}
          </Clamp>
        )}
        {when(event) && <p className="text-[12px] text-dim">{when(event)}</p>}
      </div>
    </li>
  );
}

export async function GameEventsSection({ gameId }: { gameId: string }) {
  const events = await listGameEvents(gameId);
  if (events.length === 0) return null;
  return (
    <section aria-labelledby="game-events-heading" className={sectionCardClass("flex flex-col gap-4")}>
      <SectionHead id="game-events-heading" title={M.title} note={M.lead} />
      <ul className="grid gap-3 md:grid-cols-2">
        {events.map((e) => (
          <EventCard key={e.url} event={e} />
        ))}
      </ul>
    </section>
  );
}
