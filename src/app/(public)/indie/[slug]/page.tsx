// /indie/[slug] — 내가 만든 게임 상세(기획서 v2.0 S-19, 목업 mgDetail). 대표 그림, 소개, 영상, 스크린샷, 구매 링크, 찜, 관련 소식.
//
// 숨긴 글은 글쓴이와 관리자만 본다 — 다른 사람에게는 없는 글이다(notFound). 숨긴 사유는 글쓴이 화면에 그대로 뜬다.
//
// 맨 위는 경로 줄(목업 crumb3). 끝 낱말이 데이터라 머리띠 아래 공통 줄(page-trail)이 못 그려서 이 화면이 직접 세우고,
// "이전 화면" 만 공통 줄이 세운다(lib/nav 의 TRAIL_BACK_ONLY_UNDER). 앞 두 낱말은 들어온 곳(?from=, lib/indie/query)을 따른다 —
// 명예의 전당, 슈퍼루키에서 오면 "인디 게임 > 그 칸", 등록현황에서 오면 "개발자 라운지 > 등록현황", 그 밖은 "개발자 라운지 > 내가 만든 게임".
// 낱말과 위쪽 메뉴 강조를 같은 표(lib/nav 의 resolveNav)로 정한다 — 둘이 따로 정하면 메뉴는 인디 게임인데 경로는 라운지인 날이 온다.
// 머리 판은 components/indie/detail-hero.
// 아래는 두 기둥: 읽을 것(영상, 구매, 소개, 스크린샷, 관련 소식)과 확인할 것(게임 정보 카드)을 가른다.
// 스토어 링크는 구매 마디 한 곳에만 선다(detail-hero 머리 주석). 본인 게임이면 오른쪽 카드에서 고치기, 지우기를 바로 한다.
//
// 홍보 기본기(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장): 머리 판의 플레이하기 큰 단추, 바깥 링크 클릭 집계,
// 오른쪽 카드의 개발자 소식 받기, 맨 아래 댓글. 공개 글의 바깥 링크는 모두 경유 주소(app/api/indie/out)로 나가 클릭이 세진다 —
// 승인 전 글은 경유 주소가 404 라(열린 리다이렉트 막기) 글쓴이 미리 보기에서는 원래 주소를 그대로 단다.
import { DbUnavailablePage } from "@/components/db-unavailable";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Comments } from "@/components/community/post-interactions";
import { DeleteIndiePost } from "@/components/indie/delete-post";
import { IndieDetailHero } from "@/components/indie/detail-hero";
import { IndieFollowButton } from "@/components/indie/follow-button";
import { IndieLikeButton } from "@/components/indie/like-button";
import { IndieRelatedNews } from "@/components/indie/related-news";
import { listIndieComments, recordIndieView } from "@/server/services/indie";
import { addIndieCommentAction } from "@/app/(public)/indie/actions";
import { primaryPlayLink } from "@/lib/indie/promo";
import { IndieReportButton } from "@/components/indie/report-button";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeImage } from "@/components/ui/fade-image";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { genreLabels, INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL, INDIE_STAGE_LABEL, INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import { storeLinkPlatform } from "@/lib/indie/constants";
import { resolveNav } from "@/lib/nav";
import { INDIE_FROM_PARAM, parseIndieFrom, type IndieFrom } from "@/lib/indie/query";
import { classifyTraffic } from "@/lib/indie/traffic";
import { headers } from "next/headers";
import { firstParam } from "@/lib/games-query";
import { indieEditPath, indieOutPath, indiePath, ROUTES } from "@/lib/routes";
import { decodeSlugParam } from "@/lib/slug";
import { getIndiePostBySlug } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 경로 줄의 앞 두 낱말 — 메뉴 표(lib/nav)의 이름을 그대로 쓴다. 하위 메뉴 띠와 낱말이 어긋나지 않게 */
function trailHead(slug: string, from: string | null): Array<{ label: string; href: string }> {
  const { section, sub } = resolveNav(indiePath(slug), new URLSearchParams(from ? { [INDIE_FROM_PARAM]: from } : {}));
  return [
    { label: section?.label ?? "", href: section?.href ?? ROUTES.lounge },
    { label: sub?.label ?? M.listTitle, href: sub?.href ?? ROUTES.indie },
  ];
}

/** 이 조회의 유입 경로(lib/indie/traffic). 우리 사이트 호스트는 요청의 Host 로 안다 — 미리 보기 배포와 운영 주소가 다르다 */
async function viewSource(from: IndieFrom | null) {
  const h = await headers();
  return classifyTraffic({ from, referer: h.get("referer"), ownHost: h.get("x-forwarded-host") ?? h.get("host") });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await orDbDown(getIndiePostBySlug(decodeSlugParam((await params).slug)));
  if (post === DB_DOWN) return {};
  if (!post || post.status !== "published") return { title: M.notFound, robots: { index: false } };
  const cover = post.images[0];
  return {
    title: post.title,
    description: post.tagline,
    openGraph: { title: post.title, description: post.tagline, images: cover ? [{ url: cover.url, width: cover.width, height: cover.height }] : undefined },
  };
}

export default async function IndieDetailPage({ params, searchParams }: Props) {
  const slug = decodeSlugParam((await params).slug);
  const from = parseIndieFrom(firstParam((await searchParams)[INDIE_FROM_PARAM]));
  const loaded = await orDbDown(Promise.all([getIndiePostBySlug(slug), getCurrentUser().catch(() => null)]));
  // 장애를 404 로 그리지 않는다(lib/db-errors 의 orDbDown 주석)
  if (loaded === DB_DOWN) return <DbUnavailablePage retryHref={indiePath(slug)} />;
  const [post, viewer] = loaded;
  if (!post) notFound();
  const isOwner = viewer?.id === post.authorUserId;
  const canEdit = viewer !== null && (isOwner || viewer.role === "admin");
  // 승인 전(대기, 반려) 글도 숨긴 글처럼 글쓴이와 관리자만 본다(기획서 v2.0 7.1)
  if ((post.status !== "published" || post.review !== "approved") && !canEdit) notFound();
  const live = post.review === "approved" && post.status === "published";
  // 공개 글 조회 한 번(명예의 전당, 슈퍼루키의 재료)과 댓글은 서로 기다릴 일이 없어 나란히 묻는다. 글쓴이 본인 조회는 서비스가 거른다.
  // 조회 기록이 실패해도 화면은 선다. 댓글을 못 읽으면 빈 목록으로 두고 쓰기는 연다
  const [, comments] = live ? await Promise.all([recordIndieView(post.id, post.authorUserId, await viewSource(from)).catch(() => {}), listIndieComments(post.id).catch(() => [])]) : [null, []];
  /** 링크 순번의 주소 — 공개 글이면 클릭을 세는 경유 주소(머리 주석) */
  const hrefOf = (i: number) => (live ? indieOutPath(post.id, i) : post.links[i].url);
  const playPick = primaryPlayLink(post.links, post.platforms);
  const play = playPick ? { kind: playPick.kind, href: hrefOf(playPick.index) } : null;

  const [cover, ...shots] = post.images;
  // 플랫폼별 구매하러 가기(기획서 S-19, 목업 mgDetail) — 고른 플랫폼 중 스토어 링크를 적은 것만 단추가 된다.
  // 구매 마디에 든 링크는 머리 판에서 뺀다 — 같은 링크를 두 번 세우지 않는다
  const stores = post.links.flatMap((l, i) => {
    const p = storeLinkPlatform(l.kind);
    return p && post.platforms.includes(p) ? [{ platform: p, index: i }] : [];
  });
  // 머리 판에는 구매 마디에 안 든 링크만, 플레이하기 단추가 이미 가리키는 링크도 뺀다 — 같은 링크를 두 번 세우지 않는다
  const otherLinks = post.links.flatMap((l, i) => (stores.some((st) => st.index === i) || i === playPick?.index ? [] : [{ kind: l.kind, href: hrefOf(i) }]));
  const info: Array<{ label: string; value: string | null }> = [
    { label: M.by, value: post.developerName },
    { label: M.stage, value: INDIE_STAGE_LABEL[post.stage] },
    { label: M.platforms, value: post.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ") },
    { label: M.genres, value: genreLabels(post.genres).join(", ") || null },
    { label: M.release, value: post.releaseNote },
    { label: M.posted, value: formatDate(post.createdAt) },
  ].filter((m) => Boolean(m.value));

  return (
    <Page pad="detail" gap={24}>
      <Crumbs items={[...trailHead(post.slug, from), { label: post.title }]} />

      {canEdit && post.status !== "published" && (
        <div role="status" className="rounded-xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {M.hiddenNotice}
          {post.statusReason && ` ${post.statusReason}`}
        </div>
      )}
      {canEdit && post.review !== "approved" && (
        <div role="status" className={post.review === "rejected" ? "rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger" : "rounded-xl bg-warn-soft px-4 py-3 text-[13px] text-warn"}>
          {post.review === "rejected" ? RV.rejectedNotice : RV.pendingNotice}
          {post.reviewReason && ` ${RV.reason}: ${post.reviewReason}`}
        </div>
      )}
      {canEdit && !cover && (
        <div role="status" className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">
          {M.noCoverNotice}
        </div>
      )}

      <IndieDetailHero post={post} links={otherLinks} play={play} />

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

          {stores.length > 0 && (
            <section aria-labelledby="indie-buy" className={sectionCardClass("flex flex-col gap-3")}>
              <SectionHead id="indie-buy" title={M.buyTitle} />
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {stores.map((st) => (
                  <li key={st.platform}>
                    <a
                      href={hrefOf(st.index)}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="lift press flex min-h-[var(--touch-target)] flex-col gap-0.5 rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 transition-colors hover:bg-acc-soft"
                    >
                      <span className="text-[12px] text-dim">{INDIE_PLATFORM_LABEL[st.platform]}</span>
                      <span className="text-[14.5px] font-bold text-ink">{M.storeOf(INDIE_PLATFORM_LABEL[st.platform])}</span>
                      <span className="text-[13px] font-semibold text-acc">{M.buyCta}</span>
                      <span className="sr-only">{M.newWindow}</span>
                    </a>
                  </li>
                ))}
              </ul>
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

          <Suspense fallback={null}>
            <IndieRelatedNews authorUserId={post.authorUserId} isOwner={isOwner} />
          </Suspense>

          {/* 플레이한 사람의 말이 쌓이는 곳(기획서 3장 2번). 게시판 댓글 부품 그대로, 받는 액션만 인디 글 것이다 */}
          {live && (
            <div className={sectionCardClass()}>
              <Comments postId={post.id} initial={comments} addAction={addIndieCommentAction} />
            </div>
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

          {post.review === "approved" && <IndieLikeButton postId={post.id} likeCount={post.likeCount} />}
          {/* 자기 소식은 받을 수 없다(services/indie/promo). 공개 글에서만 — 승인 전 글은 보는 사람이 글쓴이, 관리자뿐이다 */}
          {live && !isOwner && <IndieFollowButton developerUserId={post.authorUserId} />}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3 text-[12.5px]">
            {canEdit && (
              <Link href={indieEditPath(post.id)} className="tap inline-flex items-center text-acc hover:underline">
                {M.edit}
              </Link>
            )}
            {/* 지우기는 본인만(기획서 S-19 "본인 게임이면 수정, 삭제"). 관리자는 지우지 않고 숨긴다(/admin/indie) */}
            {isOwner && <DeleteIndiePost postId={post.id} />}
            {!isOwner && <IndieReportButton postId={post.id} signedIn={viewer !== null} returnTo={indiePath(post.slug)} />}
          </div>
        </aside>
      </div>
    </Page>
  );
}
