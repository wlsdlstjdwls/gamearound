// /indie/[slug] — 인디 홍보 글 상세. 대표 그림, 소개, 영상, 스크린샷, 바로 가기 링크.
//
// 숨긴 글은 글쓴이와 관리자만 본다 — 다른 사람에게는 없는 글이다(notFound). 숨긴 사유는 글쓴이 화면에 그대로 뜬다.
// 바깥 링크에 nofollow ugc 를 다는 이유: 승인 없이 서는 글이라 검색 순위를 노린 링크 도배가 우리 도메인의 신용을 먹는다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { IndieReportButton } from "@/components/indie/report-button";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { FadeImage } from "@/components/ui/fade-image";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { INDIE_LINK_LABEL, INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
import type { IndieLinkKind } from "@/lib/indie/constants";
import { gamePath, indieEditPath, indiePath, ROUTES } from "@/lib/routes";
import { decodeSlugParam } from "@/lib/slug";
import { getIndiePostBySlug } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

type Props = { params: Promise<{ slug: string }> };

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
  const meta: Array<{ label: string; value: string | null }> = [
    { label: M.by, value: post.developerName },
    { label: M.platforms, value: post.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ") },
    { label: M.release, value: post.releaseNote },
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

      <section className="grid items-start gap-x-9 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="relative aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-hair">
          <CoverImage src={cover?.url ?? null} alt={M.coverAlt(post.title)} sizes="(max-width: 1024px) 100vw, 60vw" priority />
        </div>

        <div className={sectionCardClass("flex flex-col gap-4")}>
          <div className="flex flex-col gap-2">
            <IndieStageBadge stage={post.stage} className="self-start" />
            <h1 className="text-[26px] font-extrabold leading-[1.25] tracking-[-0.03em] text-ink">{post.title}</h1>
            <p className="text-[15px] leading-[1.6] text-mut">{post.tagline}</p>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {meta.map((m) => (
              <div key={m.label} className="contents">
                <dt className="text-dim">{m.label}</dt>
                <dd className="min-w-0 text-ink">{m.value}</dd>
              </div>
            ))}
          </dl>

          {(post.links.length > 0 || (post.game?.verified ?? false)) && (
            <div className="flex flex-col gap-2">
              <h2 className="sr-only">{M.links}</h2>
              <div className="flex flex-wrap gap-2">
                {post.links.map((l, i) => (
                  <a
                    key={`${l.url}-${i}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className={buttonClass({ variant: i === 0 ? "primary" : "secondary", size: "sm" })}
                  >
                    {INDIE_LINK_LABEL[l.kind as IndieLinkKind] ?? l.kind}
                    <span className="sr-only">{M.newWindow}</span>
                  </a>
                ))}
                {post.game?.verified && (
                  <Link href={gamePath(post.game.slug)} className={buttonClass({ variant: "soft", size: "sm" })}>
                    {M.catalogLink}
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12.5px] text-dim">
            <span>{formatDate(post.createdAt)}</span>
            <div className="flex items-center gap-3">
              {canEdit && (
                <Link href={indieEditPath(post.id)} className="tap inline-flex items-center text-acc hover:underline">
                  {M.edit}
                </Link>
              )}
              {viewer?.id !== post.authorUserId && <IndieReportButton postId={post.id} signedIn={viewer !== null} returnTo={indiePath(post.slug)} />}
            </div>
          </div>
        </div>
      </section>

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
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[var(--radius-md)] bg-surface-3">
                  <FadeImage
                    src={s.url}
                    alt={M.shotAlt(post.title, i + 1)}
                    width={s.width}
                    height={s.height}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="h-auto w-full"
                  />
                  <span className="sr-only">{M.newWindow}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
