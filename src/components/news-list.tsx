// 뉴스 목록 — 썸네일 + 제목 + 출처, 시각, 외부 링크 새 창. 본문은 저장하지 않으므로 링크만 제공(§10 저작권)
//
// **줄 전체가 누르는 자리다**(2026-09-21). 전에는 제목 글자에만 링크가 걸려 있어서, 줄에 hover 배경이
// 깔리는데(ROW 의 row-hover) 정작 썸네일이나 여백을 누르면 아무 일도 없었다 — 눌리는 것처럼 보이고
// 안 눌리는 자리가 줄마다 대부분이었다.
//
// 줄을 통째로 <a> 로 감싸지 않은 이유: 줄 안에 게임 상세로 가는 링크가 또 있다(showGame).
// 링크 안에 링크를 넣으면 브라우저가 상자를 밖으로 끌어내 서버 HTML 과 어긋나고, 낭독기에서도
// 무엇을 누르는지 말할 수 없게 된다.
//
// 그래서 제목 <a> 의 ::after 를 줄 전체에 덮는다(stretched link). 덮개는 그 <a> 의 일부라
// 어디를 눌러도 같은 링크가 열리고, hover 도 같이 걸려 제목 색이 따라 바뀐다.
// 덮개 위로 다시 올려야 하는 것이 둘 있다.
//   1) 게임 링크 — 덮개 밑에 깔리면 영영 못 누른다.
//   2) 잘린 제목(Clamp) — 덮개가 포인터를 먼저 먹으면 말풍선이 안 뜬다. 제목은 두 줄에서 잘리는
//      일이 잦아 말풍선이 전문을 읽는 유일한 방법이다. 이 span 은 제목 <a> 의 자식이라
//      위로 올려도 누르면 그대로 기사로 간다.
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { NewsDto } from "@/server/services/games";
import { Clamp } from "@/components/ui/tooltip";
import { FadeImage } from "@/components/ui/fade-image";
import { newsThumbnailSrc } from "@/lib/news/thumbnail";
import { ImageFallback } from "@/components/ui/image-fallback";
import { ROW, ROWS } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export function NewsList({ items, showGame = false }: { items: NewsDto[]; showGame?: boolean }) {
  if (items.length === 0) {
    return <p className="py-3 text-[13px] text-dim">관련 뉴스가 아직 없습니다.</p>;
  }
  return (
    // 판이 없어진 화면에서 목록의 머리를 긋는 건 .rows 첫 줄의 진한 헤어라인이다(ui/page 의 ROWS)
    <ul className={ROWS}>
      {items.map((n) => {
        // 주소는 서명해 우리 출처로 바꾼다 — 핫링크를 막는 매체가 있어 브라우저가 직접 받으면 403 이다.
        // 우리 쪽에서도 안 열리는 호스트면 null 이 와서 아예 요청하지 않는다(lib/news/thumbnail)
        const thumbnail = n.thumbnailUrl ? newsThumbnailSrc(n.thumbnailUrl) : null;
        return (
          <li key={n.id} className={cn(ROW, "relative flex gap-3 py-[13px]")}>
            <div className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-[7px] bg-surface-3">
              {/* 뉴스 썸네일은 외부 도메인이 불특정이라 next/image 최적화 대상에서 제외한다(unoptimized).
                  주소가 없을 때와 죽은 주소일 때 둘 다 브랜드 면으로 받는다 — 뉴스는 원문이 사라지면
                  썸네일부터 404 가 되는 자리라 엑박이 제일 잘 난다. */}
              {thumbnail ? (
                <FadeImage
                  src={thumbnail}
                  alt=""
                  fill
                  sizes="72px"
                  unoptimized
                  loading="lazy"
                  className="object-cover"
                  fallback={<ImageFallback label="" />}
                />
              ) : (
                <ImageFallback label="" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[13px] font-semibold leading-[1.5] text-ink transition-colors duration-base after:absolute after:inset-0 after:content-[''] hover:text-acc"
              >
                <Clamp lines={2} className="relative z-10">
                  {n.title}
                </Clamp>
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-dim">
                <span>{n.sourceName}</span>
                <span aria-hidden>|</span>
                <time dateTime={n.publishedAt}>{formatDateTime(n.publishedAt)}</time>
                {showGame && n.game && (
                  <>
                    <span aria-hidden>|</span>
                    <Link href={`/games/${n.game.slug}`} className="relative z-10 text-acc hover:underline">
                      {n.game.title}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
