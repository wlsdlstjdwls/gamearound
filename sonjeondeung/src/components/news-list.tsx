// 뉴스 목록 — 제목+썸네일+소스+시간, 외부 링크 새 창. 본문은 저장하지 않으므로 링크만 제공(§10 저작권)
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { NewsDto } from "@/server/services/games";

export function NewsList({ items, showGame = false }: { items: NewsDto[]; showGame?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">관련 뉴스가 아직 없습니다.</p>;
  }
  return (
    <ul className="divide-y divide-slate-800">
      {items.map((n) => (
        <li key={n.id} className="flex gap-3 py-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-slate-800">
            {n.thumbnailUrl ? (
              // 뉴스 썸네일은 외부 도메인이 불특정이라 next/image 최적화 대상에서 제외
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div aria-hidden className="flex h-full w-full items-center justify-center text-slate-600">
                📰
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-sm font-medium text-slate-100 hover:text-amber-300"
            >
              {n.title}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{n.sourceName}</span>
              <span aria-hidden>·</span>
              <time dateTime={n.publishedAt}>{formatDateTime(n.publishedAt)}</time>
              {showGame && n.game && (
                <>
                  <span aria-hidden>·</span>
                  <Link href={`/games/${n.game.slug}`} className="text-amber-300/80 hover:text-amber-300">
                    {n.game.title}
                  </Link>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
