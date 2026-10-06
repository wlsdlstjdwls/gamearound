// /indie/[slug] — 인디 홍보 글 상세. 대표 그림, 소개, 영상, 스크린샷, 바로 가기 링크.
//
// 숨긴 글은 글쓴이와 관리자만 본다 — 다른 사람에게는 없는 글이다(notFound). 숨긴 사유는 글쓴이 화면에 그대로 뜬다.
// 바깥 링크에 nofollow ugc 를 다는 이유: 승인 없이 서는 글이라 검색 순위를 노린 링크 도배가 우리 도메인의 신용을 먹는다.
//
// 머리는 대표 그림을 흐리게 깐 어두운 판이다(2026-10-06 사용자: "화면이 심심하다"). 흰 판만 줄 서 있으면
// 그 게임의 색이 화면 어디에도 안 남는다 — 스토어 상점 화면처럼 게임 그림이 화면의 분위기를 정하게 둔다.
// 아래는 두 기둥: 읽을 것(영상, 소개, 스크린샷)과 확인할 것(게임 정보 카드)을 가른다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { IndieReportButton } from "@/components/indie/report-button";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { FadeImage } from "@/components/ui/fade-image";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { INDIE_LINK_LABEL, INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import type { IndieLinkKind } from "@/lib/indie/constants";
import { gamePath, indieEditPath, indiePath, ROUTES } from "@/lib/routes";
import { decodeSlugParam } from "@/lib/slug";
import { getIndiePostBySlug } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

type Props = { params: Promise<{ slug: string }> };

/** 어두운 판 위의 알약. 반투명 흰 테두리라 대표 그림 색이 무엇이든 읽힌다 */
const PILL = "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-[color-mix(in_oklab,var(--on-ink)_28%,transparent)]";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getIndiePostBySlug(decodeSlugParam((await params).slug));
  if (!post || post.status !== "published") return { title: M.notFound, robots: { index: false } };
  const cover = post.images[0];
  return {
    title: post.title,
    description: post.tagline,
    openGraph: { title: post.title, description: post.tagline, images: cover ? [{ url: cover.url, width: cover.width, height: cover.height }] : undefined },
  };
}

export default async function IndieDetailPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);
  const [post, viewer] = await Promise.all([getIndiePostBySlug(slug), getCurrentUser().catch(() => null)]);
  if (!post) notFound();
  const canEdit = viewer !== null && (viewer.id === post.authorUserId || viewer.role === "admin");
  if (post.status !== "published" && !canEdit) notFound();

  const [cover, ...shots] = post.images;
  const info: Array<{ label: string; value: string | null }> = [
    { label: M.by, value: post.developerName },
    { label: M.stage, value: INDIE_STAGE_LABEL[post.stage] },
    { label: M.platforms, value: post.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ") },
    { label: M.release, value: post.releaseNote },
    { label: M.posted, value: formatDate(post.createdAt) },
  ].filter((m) => Boolean(m.value));

  return (
    <Page pad="detail" gap={24}>
      <BackLink href={ROUTES.indie}>{M.back}</BackLink>

      {canEdit && post.status !== "published" && (
        <div role="status" className="rounded-xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {M.hiddenNotice}
          {post.statusReason && ` ${post.statusReason}`}
        </div>
      )}
      {canEdit && !cover && (
        <div role="status" className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">
          {M.noCoverNotice}
        </div>
      )}

      <section className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink text-on-ink">
        {/* 대표 그림을 크게 흐려 판의 바탕으로 깐다. 장식이라 alt 를 비우고 읽는 도구에서 숨긴다 */}
        {cover && (
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 scale-125 opacity-55 blur-3xl">
            <CoverImage src={cover.url} alt="" sizes="40vw" />
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--ink) 30%, transparent), color-mix(in oklab, var(--ink) 85%, transparent))" }}
        />

        <div className="grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-9 lg:p-8">
          <div className="relative aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-3 ring-1 ring-[color-mix(in_oklab,var(--on-ink)_18%,transparent)]">
            <CoverImage src={cover?.url ?? null} alt={M.coverAlt(post.title)} sizes="(max-width: 1024px) 100vw, 60vw" priority />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[12px] font-bold tracking-[0.06em]">
                <span aria-hidden className="size-2 rounded-full bg-acc-on-ink" />
                {INDIE_STAGE_LABEL[post.stage]}
              </span>
              <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] sm:text-[36px]">{post.title}</h1>
              <p className="text-[15px] leading-[1.6] opacity-80">{post.tagline}</p>
            </div>

            <ul aria-label={M.platforms} className="flex flex-wrap gap-1.5">
              {post.platforms.map((p) => (
                <li key={p} className={PILL}>
                  {INDIE_PLATFORM_LABEL[p]}
                </li>
              ))}
            </ul>

            {(post.links.length > 0 || post.game?.verified) && (
              <div className="flex flex-wrap gap-2">
                <h2 className="sr-only">{M.links}</h2>
                {post.links.map((l, i) => (
                  <a
                    key={`${l.url}-${i}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className={cn(
                      "press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full px-5 text-[14px] font-bold",
                      i === 0 ? "bg-on-ink text-ink" : "ring-1 ring-[color-mix(in_oklab,var(--on-ink)_35%,transparent)] hover:bg-[color-mix(in_oklab,var(--on-ink)_12%,transparent)]",
                    )}
                  >
                    {INDIE_LINK_LABEL[l.kind as IndieLinkKind] ?? l.kind}
                    <span className="sr-only">{M.newWindow}</span>
                  </a>
                ))}
                {post.game?.verified && (
                  <Link
                    href={gamePath(post.game.slug)}
                    className="press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full px-5 text-[14px] font-bold ring-1 ring-[color-mix(in_oklab,var(--on-ink)_35%,transparent)] hover:bg-[color-mix(in_oklab,var(--on-ink)_12%,transparent)]"
                  >
                    {M.catalogLink}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {post.youtubeId && (
            <section aria-labelledby="indie-trailer" className={sectionCardClass("flex flex-col gap-3")}>
              <SectionHead id="indie-trailer" title={M.trailer} />
              <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-3">
                {/* nocookie 판: 재생 전에는 추적 쿠키를 굽지 않는다. ID 는 검증 때 11자 꼴만 남겼다(lib/indie/schemas) */}
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}`}
                  title={`${post.title} ${M.trailer}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </section>
          )}

          <section aria-labelledby="indie-about" className={sectionCardClass("flex flex-col gap-3")}>
            <SectionHead id="indie-about" title={M.about} />
            {/* 줄바꿈은 글쓴이가 적은 그대로 — 마크다운은 받지 않는다(승인 없이 서는 글에 서식을 열면 도배의 도구가 된다) */}
            <p className="max-w-[720px] whitespace-pre-line text-[15px] leading-[1.8] text-ink-2">{post.body}</p>
          </section>

          {shots.length > 0 && (
            <section aria-labelledby="indie-shots" className={sectionCardClass("flex flex-col gap-3")}>
              <SectionHead id="indie-shots" title={M.screenshots} />
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shots.map((s, i) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="cover-zoom block overflow-hidden rounded-[var(--radius-md)] bg-surface-3">
                      <span className="cover-zoom-img block">
                        <FadeImage
                          src={s.url}
                          alt={M.shotAlt(post.title, i + 1)}
                          width={s.width}
                          height={s.height}
                          sizes="(max-width: 640px) 100vw, 40vw"
                          className="h-auto w-full"
                        />
                      </span>
                      <span className="sr-only">{M.newWindow}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* 넓은 화면에서는 스크롤해도 따라온다 — 긴 소개를 읽다가 "어디서 받지" 를 다시 찾아 올라가지 않게 */}
        <aside aria-labelledby="indie-info" className={sectionCardClass("flex flex-col gap-4 lg:sticky lg:top-24")}>
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-acc-soft text-[17px] font-extrabold text-acc">
              {post.developerName.slice(0, 1)}
            </span>
            <div className="flex min-w-0 flex-col">
              <h2 id="indie-info" className="text-[15px] font-bold text-ink">
                {M.infoTitle}
              </h2>
              <span className="truncate text-[12.5px] text-dim">{post.developerName}</span>
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px]">
            {info.map((m) => (
              <div key={m.label} className="contents">
                <dt className="text-dim">{m.label}</dt>
                <dd className="min-w-0 text-right text-ink">{m.value}</dd>
              </div>
            ))}
          </dl>

          {post.links[0] && (
            <a href={post.links[0].url} target="_blank" rel="noopener noreferrer nofollow ugc" className={buttonClass({ variant: "primary", fullWidth: true })}>
              {INDIE_LINK_LABEL[post.links[0].kind as IndieLinkKind] ?? post.links[0].kind}
              <span className="sr-only">{M.newWindow}</span>
            </a>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-3 text-[12.5px]">
            {canEdit && (
              <Link href={indieEditPath(post.id)} className="tap inline-flex items-center text-acc hover:underline">
                {M.edit}
              </Link>
            )}
            {viewer?.id !== post.authorUserId && <IndieReportButton postId={post.id} signedIn={viewer !== null} returnTo={indiePath(post.slug)} />}
          </div>
        </aside>
      </div>
    </Page>
  );
}
