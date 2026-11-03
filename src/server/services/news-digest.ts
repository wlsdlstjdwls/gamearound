// 주간 맞춤 소식의 재료 읽기 — 후보 기사와 회원 취향. 고르는 규칙은 lib/news/digest(순수 함수)에 있다.
// 세션을 읽는 화면용 함수는 services/news-mine 에 따로 둔다 — 이 파일은 크론과 스크립트(tsx)도 부르는데, 세션 모듈은 server-only 라 import 만 해도 던진다.
// 매주 묶음을 보내는 sync/news-digest 와 맞춤 소식 화면(/news/mine)이 같이 읽는다 — 메일의 "전체 보기" 가 같은 목록으로 이어져야 한다.
//
// 질의를 생 SQL 로 쓰는 이유: 기사마다 게임의 플랫폼과 장르를 배열로 붙이는 하위 질의가 둘이다. Drizzle 은 테이블 하나짜리 select 에서
// 칸 이름을 테이블 없이 찍어서, 하위 질의 안에서 다른 테이블 칸으로 읽힌다(2026-11-03 sync/run-news 에서 데었다). 여기서는 별칭을 손으로 단다.
//
// 취향은 개인화 동의가 살아 있고 잠시 끔이 아닐 때만 읽는다(schema 의 userProfiles.personalizationConsentAt 주석). 찜은 동의와 상관없다 —
// 회원이 직접 담은 목록이라 "취향을 추측" 하는 것이 아니다.
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import type { Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { NEWS_DIGEST_WINDOW_DAYS, type DigestCandidate, type DigestTaste } from "@/lib/news/digest";
import type { NewsDto } from "@/server/services/games";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 고르기에 쓰는 칸과 화면, 메일에 쓰는 칸을 함께 든 후보 한 건 */
export type DigestNews = DigestCandidate & {
  url: string;
  sourceName: string;
  thumbnailUrl: string | null;
  summary: string | null;
  game: { slug: string; title: string };
};

type CandidateRow = {
  id: string; title: string; url: string; source_name: string; thumbnail_url: string | null; summary: string | null;
  published_at: string | Date; game_id: string; slug: string; game_title: string; platforms: string[] | null; genre_ids: number[] | null;
};

/** since 뒤에 난, 게임과 이어진 기사 전부(최신 순). 한 주에 수백 건이라 회원마다 다시 묻지 않고 한 번 읽어 나눠 쓴다 */
export async function loadDigestCandidates(db: Db, since: Date): Promise<DigestNews[]> {
  const visible = visiblePlatformsOnly();
  const res = await db.execute<CandidateRow>(sql`
    select n.id, n.title, n.url, n.source_name, n.thumbnail_url, n.summary, n.published_at, n.game_id,
      g.slug, coalesce(g.title_ko, g.title_en) as game_title,
      (select array_agg(distinct game_platforms.platform::text) from game_platforms
        where game_platforms.game_id = n.game_id ${visible ? sql`and ${visible}` : sql``}) as platforms,
      (select array_agg(gg.genre_id) from game_genres gg where gg.game_id = n.game_id) as genre_ids
    from news n
    inner join games g on g.id = n.game_id
    where n.published_at > ${since.toISOString()}::timestamptz
    order by n.published_at desc
  `);
  return res.rows.map((r) => ({
    newsId: r.id,
    title: r.title,
    url: r.url,
    sourceName: r.source_name,
    thumbnailUrl: r.thumbnail_url,
    summary: r.summary,
    publishedAt: new Date(r.published_at),
    gameId: r.game_id,
    platforms: (r.platforms ?? []) as Platform[],
    genreIds: r.genre_ids ?? [],
    game: { slug: r.slug, title: r.game_title },
  }));
}

/** 묶음을 받을 회원 한 명 */
export type DigestReader = { userId: string; email: string; taste: DigestTaste; lastDigestAt: Date | null };

type ReaderRow = { user_id: string; email: string; platforms: string[] | null; genre_ids: number[] | null; wished: string[] | null; last_digest_at: string | Date | null };

/**
 * 회원 취향을 읽는다. who 가 "opted-in" 이면 주간 소식을 켠 사람 전부(sync), userId 면 그 한 사람(화면 — 켰는지와 상관없이 본다).
 * 지난 묶음 시각은 알림함의 news 줄로 센다 — 따로 기록 칸을 두면 알림함과 어긋날 수 있다(알림함이 곧 발송 기록이다, server/notify/web 머리 주석)
 */
export async function loadDigestReaders(db: Db, who: "opted-in" | { userId: string }): Promise<DigestReader[]> {
  const filter = who === "opted-in" ? sql`u.news_digest_on_at is not null` : sql`u.id = ${who.userId}::uuid`;
  const res = await db.execute<ReaderRow>(sql`
    select u.id as user_id, u.email,
      case when p.personalization_consent_at is not null and p.personalization_paused_at is null then p.platforms::text[] end as platforms,
      case when p.personalization_consent_at is not null and p.personalization_paused_at is null then p.favorite_genre_ids end as genre_ids,
      (select array_agg(w.game_id::text) from wishlists w where w.user_id = u.id) as wished,
      (select max(nt.created_at) from notifications nt where nt.user_id = u.id and nt.kind = 'news') as last_digest_at
    from users u
    left join user_profiles p on p.user_id = u.id
    where ${filter}
  `);
  return res.rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    taste: { platforms: (r.platforms ?? null) as Platform[] | null, genreIds: r.genre_ids ?? null, wishedGameIds: new Set(r.wished ?? []) },
    lastDigestAt: r.last_digest_at ? new Date(r.last_digest_at) : null,
  }));
}

/** 거슬러 볼 시작점. 지난 묶음이 한 주 안이면 그 뒤부터 — 받은 기사를 다시 받지 않는다 */
export function digestSince(now: Date, lastDigestAt: Date | null): Date {
  const windowStart = new Date(now.getTime() - NEWS_DIGEST_WINDOW_DAYS * DAY_MS);
  return lastDigestAt && lastDigestAt > windowStart ? lastDigestAt : windowStart;
}

export function digestNewsDto(n: DigestNews): NewsDto {
  return { id: n.newsId, title: n.title, url: n.url, sourceName: n.sourceName, thumbnailUrl: n.thumbnailUrl, summary: n.summary, publishedAt: n.publishedAt.toISOString(), game: n.game };
}
