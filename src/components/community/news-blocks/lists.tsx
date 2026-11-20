// 소식 블록 — 게시판 홈(S-10)과 라운지 홈(S-16)이 같은 모양을 쓴다(기획서 v2.0 6.6 "같은 규칙으로 소식을 구성").
//
// 목업의 대시보드 모양을 그대로 옮겼다(2026-10-26 사용자: "목업과 모든 화면 최대한 동일하게"):
//   현황 스트립 — 칸 여럿을 세로 선으로 가른 띠 하나, 오른쪽 끝에 "자세히 보기" 링크
//   급상승 — 카드 격자가 아니라 한 판 안의 줄 넷. 왼쪽 순위 숫자(1~3위는 크게, 2026-11-18 칸과 색을 걷었다), 가운데 딱지와 제목, 오른쪽 반응 수
//   기다리는 글 — 줄 여섯. 딱지 "댓글 0"(라운지는 "답변 0")과 오른쪽 끝 "댓글 남기기" 알약
//   오른쪽 패널 — 제목 줄 + 흰 판 안의 줄들 + 판 아래 안내 한 마디
// 시간은 "3시간 전" 으로 적는다 — 이 화면의 용건이 "지금 반응이 몰린 글" 이라 시각보다 지난 시간이 먼저 읽혀야 한다.
// 기준 시각(now)은 화면이 한 번 정해 내려 준다 — 줄마다 시계를 읽으면 한 화면 안에서 값이 어긋난다.
import Link from "next/link";
import { AuthorName } from "@/components/community/badges";
import { RankBadge } from "@/components/community/rank-badge";
import { FadeImage } from "@/components/ui/fade-image";
import { HeartIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";
import { EmptyRow, HeadLink, MetaLine, NEWS_BOX, NewsHead, TitleLine } from "./parts";

/** 반응 수(좋아요, 댓글, 조회). 한 줄에 하나만 보인다 — 좁은 화면은 작성자 줄 끝, 넓은 화면은 줄 오른쪽 기둥(RisingBlock) */
function Reactions({ post: p, className }: { post: PostRowDto; className: string }) {
  return (
    <span className={`flex gap-2.5 text-[12px] tabular-nums text-dim sm:text-[12.5px] sm:text-mut ${className}`}>
      <span className="flex items-center gap-1">
        <HeartIcon size={13} aria-hidden />
        <span className="sr-only">{M.likes}</span>
        {p.likeCount.toLocaleString("ko-KR")}
      </span>
      <span>
        {M.comments} {p.commentCount.toLocaleString("ko-KR")}
      </span>
      <span className="text-dim">
        {M.views} {p.viewCount.toLocaleString("ko-KR")}
      </span>
    </span>
  );
}

export function RisingBlock({ posts, allHref, now }: { posts: PostRowDto[]; allHref: string; now: number }) {
  return (
    <section aria-labelledby="rising-heading" className="flex flex-col gap-2.5">
      <NewsHead id="rising-heading" title={M.rising} note={M.risingNote} action={<HeadLink href={allHref}>{M.allPostsLink}</HeadLink>} />
      <div className={NEWS_BOX}>
        {posts.length === 0 ? (
          <EmptyRow title={M.risingEmpty} lead={M.newsEmptyLead} />
        ) : (
          <ol className="divide-y divide-line-soft">
            {posts.map((p, i) => (
              <li key={p.id} className="enter-item" style={stagger(i)}>
                <Link
                  href={p.href}
                  // 1위 줄에 깔던 파랑, 보라 빛은 걷었다(2026-11-18 라운지 시안 C, 사용자 "파란색 남발", "보라색은 다 빼줘"). 순위는 숫자 크기가 말한다.
                  // 좁은 화면(2026-11-20 사용자 "인기글도 눈에 잘 안 들어와"): 순위, 게임 이름, 분류, 날짜, 제목, 작성자, 수치가 다 비슷한 무게로 다섯 줄을
                  // 쌓아 제목이 묻혔다. 제목을 맨 위 주인공(16px 굵게)으로 올리고, 나머지는 작은 회색 두 줄(게임 | 분류 | 지난 시간, 작성자와 반응 수)로 모은다.
                  // 순위는 제목 첫 줄 높이에 맞춰 위에 붙는다(명예의 전당 목록 fame-rows 와 같은 문법). 넓은 화면은 예전 배치 그대로다
                  className="row-beam cover-zoom group grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:grid-cols-[40px_88px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3.5 sm:gap-y-1.5 sm:px-5 sm:py-3.5"
                >
                  <span className="max-sm:-mt-0.5">
                    <RankBadge rank={i + 1} />
                  </span>
                  {/* 글에 붙은 게임 그림(2026-11-18 사용자 "포인트가 없으니 눈에 안 들어온다"). 색을 더하지 않고 그림이 눈길을 잡는다.
                      좁은 화면에서는 그림을 뺀다. 게임 없는 글은 빈 회색 칸으로 줄을 맞춘다 */}
                  <span aria-hidden className="relative hidden aspect-[460/215] w-[88px] overflow-hidden rounded-[var(--radius-xs)] bg-surface-3 sm:block">
                    {p.game?.coverUrl && <FadeImage src={p.game.coverUrl} alt="" fill sizes="88px" className="cover-zoom-img object-cover" />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    {/* "급상승" 딱지는 걷었다 — 블록 제목이 이미 말하고, 줄마다 빨간 딱지가 서니 줄이 알록달록했다(10-28 사용자) */}
                    <MetaLine post={p} now={now} phoneQuiet />
                    <span className="max-sm:order-first max-sm:mb-0.5">
                      <TitleLine post={p} />
                    </span>
                    <span className="flex min-w-0 items-center gap-3 text-[12.5px] text-dim max-sm:text-[12px]">
                      <AuthorName post={p} />
                      <Reactions post={p} className="ml-auto shrink-0 sm:hidden" />
                    </span>
                  </span>
                  {/* 반응 수는 회색 한 톤이다(2026-11-18 시안 C) — 제목이 줄의 주인공이다. 좁은 화면은 작성자 줄 끝에 선다(위) */}
                  <Reactions post={p} className="hidden sm:col-start-4 sm:flex sm:flex-col sm:items-end sm:gap-0.5" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/** zero: 딱지 문구("댓글 0" / "답변 0"). 라운지는 질문만 모으므로 "답변" 이라 부른다 */
export function WaitingBlock({ title, note, posts, cta, zero, now }: { title: string; note: string; posts: PostRowDto[]; cta: string; zero: string; now: number }) {
  // 기다리는 글이 없으면 블록째 접는다(2026-11-18 라운지 시안 C) — "모든 글에 댓글이 달렸어요" 빈 판이 첫 화면 자리를 먹었다
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="waiting-heading" className="flex flex-col gap-2.5">
      <NewsHead id="waiting-heading" title={title} note={note} count={posts.length} />
      <div className={NEWS_BOX}>
        {posts.length === 0 ? (
          <EmptyRow title={M.waitingEmpty} lead={M.newsEmptyLead} />
        ) : (
          <ul className="divide-y divide-line-soft">
            {posts.map((p, i) => (
              <li key={p.id} className="enter-item" style={stagger(i)}>
                {/* 줄 전체가 글로 가고, 알약은 댓글 칸으로 바로 내린다. 알약을 줄 안의 두 번째 링크로 두면
                    링크 안의 링크가 된다 — 그래서 알약은 줄 링크 밖, 같은 칸 오른쪽에 겹쳐 세운다 */}
                <div className="row-beam grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                  <Link href={p.href} className="group flex min-w-0 flex-col gap-1 after:absolute after:inset-0">
                    <MetaLine flag={<Tag tone="neutral">{zero}</Tag>} post={p} now={now} />
                    <TitleLine post={p} awaiting={false} />
                    <span className="flex min-w-0 items-center gap-1 text-[12.5px] text-dim">
                      <AuthorName post={p} />
                      <span className="shrink-0">
                        | {M.views} {p.viewCount.toLocaleString("ko-KR")}
                      </span>
                    </span>
                  </Link>
                  <Link
                    href={`${p.href}#comments-heading`}
                    className="press relative z-[1] inline-flex min-h-9 w-fit items-center rounded-full bg-surface-2 px-3.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-ink hover:text-on-ink"
                  >
                    {cta}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

