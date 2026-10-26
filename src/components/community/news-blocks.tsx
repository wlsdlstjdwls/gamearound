// 소식 블록 — 게시판 홈(S-10)과 라운지 홈(S-16)이 같은 모양을 쓴다(기획서 v2.0 6.6 "같은 규칙으로 소식을 구성").
//
// 목업의 대시보드 모양을 그대로 옮겼다(2026-10-26 사용자: "목업과 모든 화면 최대한 동일하게"):
//   현황 스트립 — 칸 여럿을 세로 선으로 가른 띠 하나, 오른쪽 끝에 "자세히 보기" 링크
//   급상승 — 카드 격자가 아니라 한 판 안의 줄 넷. 왼쪽 순위 칸(1~3위만 채운 색), 가운데 딱지와 제목, 오른쪽 반응 수
//   기다리는 글 — 줄 여섯. 딱지 "댓글 0"(라운지는 "답변 0")과 오른쪽 끝 "댓글 남기기" 알약
//   오른쪽 패널 — 제목 줄 + 흰 판 안의 줄들 + 판 아래 안내 한 마디
// 시간은 "3시간 전" 으로 적는다 — 이 화면의 용건이 "지금 반응이 몰린 글" 이라 시각보다 지난 시간이 먼저 읽혀야 한다.
// 기준 시각(now)은 화면이 한 번 정해 내려 준다 — 줄마다 시계를 읽으면 한 화면 안에서 값이 어긋난다.
import Link from "next/link";
import { PostTags } from "@/components/community/badges";
import { HeartIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatAgo } from "@/lib/format";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";

/** 소식 블록과 오른쪽 패널이 같이 쓰는 흰 판 */
export const NEWS_BOX = "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair";

/** 블록 머리 — 제목, 한 줄 설명, 개수, 오른쪽 끝 링크가 한 줄에 선다(목업 .nsh) */
export function NewsHead({ id, title, note, count, action }: { id: string; title: string; note?: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2 id={id} className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">
        {title}
      </h2>
      {note && <span className="min-w-0 flex-1 text-[13px] text-dim">{note}</span>}
      {count !== undefined && count > 0 && <span className="text-[13px] font-semibold text-acc">{M.totalCount(count)}</span>}
      {action && <span className={cn(!note && "ml-auto")}>{action}</span>}
    </div>
  );
}

/** 블록 머리 오른쪽의 작은 이동 링크("전체 글 보기", "홍보 게시판") */
export function HeadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13px] text-mut hover:text-acc hover:underline">
      {children}
    </Link>
  );
}

function EmptyRow({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-5">
      <p className="text-[14px] font-bold text-ink">{title}</p>
      <p className="text-[12.5px] text-dim">{lead}</p>
    </div>
  );
}

/** 딱지 줄 — 줄 성격 딱지, 카테고리, 지난 시간 */
function MetaLine({ flag, post, now }: { flag: React.ReactNode; post: PostRowDto; now: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12px] text-dim">
      {flag}
      <span className="truncate">{CATEGORY_LABEL[post.category]}</span>
      <span className="shrink-0">{formatAgo(post.createdAt, now)}</span>
    </span>
  );
}

/** 제목 줄 — 스포, 홍보 유형 딱지가 제목 앞에 붙는다(카테고리는 딱지 줄이 이미 말한다) */
function TitleLine({ post, awaiting = true }: { post: PostRowDto; awaiting?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <PostTags post={post} showCategory={false} awaiting={awaiting} />
      <span className="min-w-0 truncate text-[15.5px] font-bold tracking-[-0.02em] text-ink group-hover:text-acc">{post.title}</span>
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
                <Link href={p.href} className="group grid grid-cols-[30px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[30px_minmax(0,1fr)_auto] sm:px-5">
                  {/* 1~3위만 채운 칸 — 순위가 곧 "얼마나 뜨거운가" 라 위 셋을 눈이 먼저 잡게 한다 */}
                  <span
                    aria-label={M.rankLabel(i + 1)}
                    className={cn("flex size-[30px] items-center justify-center rounded-lg text-[14px] font-extrabold tabular-nums", i < 3 ? "bg-acc text-on-ink" : "bg-surface-2 text-dim")}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <MetaLine flag={<Tag tone="warn">{M.risingFlag}</Tag>} post={p} now={now} />
                    <TitleLine post={p} />
                    <span className="truncate text-[12.5px] text-dim">{p.authorName}</span>
                  </span>
                  {/* 좁은 화면에서는 반응 수가 제목 아래 한 줄로 내려간다(목업 650px 이하) */}
                  <span className="col-start-2 flex gap-3 text-[12.5px] tabular-nums text-mut sm:col-start-3 sm:flex-col sm:items-end sm:gap-0.5">
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      <HeartIcon size={13} aria-hidden />
                      <span className="sr-only">{M.likes}</span>
                      {p.likeCount.toLocaleString("ko-KR")}
                    </span>
                    <span className="font-semibold text-ink">
                      {M.comments} {p.commentCount.toLocaleString("ko-KR")}
                    </span>
                    <span className="text-dim">
                      {M.views} {p.viewCount.toLocaleString("ko-KR")}
                    </span>
                  </span>
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
                <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                  <Link href={p.href} className="group flex min-w-0 flex-col gap-1 after:absolute after:inset-0">
                    <MetaLine flag={<Tag tone="info">{zero}</Tag>} post={p} now={now} />
                    <TitleLine post={p} awaiting={false} />
                    <span className="truncate text-[12.5px] text-dim">
                      {p.authorName} | {M.views} {p.viewCount.toLocaleString("ko-KR")}
                    </span>
                  </Link>
                  <Link
                    href={`${p.href}#comments-heading`}
                    className="press relative z-[1] inline-flex min-h-9 w-fit items-center rounded-full bg-acc-soft px-3.5 text-[12.5px] font-semibold text-acc transition-colors hover:bg-acc hover:text-on-ink"
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

/** 현황 스트립의 한 칸 */
export type StatItem = { label: string; value: string; href?: string };

/**
 * 현황 스트립(목업 .lhs) — 칸 여럿을 세로 선으로 가른 띠 하나. 누르는 칸은 값 뒤에 꺾쇠 대신 밑줄 hover 로 말한다.
 * 칸마다 따로 뜬 카드(예전 StatTile 넷)는 "숫자 넷이 각자 다른 이야기" 로 읽혔다 — 띠 하나는 "내 현황 한 줄" 이다.
 */
export function StatStrip({ items, link, label }: { items: StatItem[]; link?: { href: string; label: string }; label: string }) {
  return (
    <section aria-label={label} className="flex flex-wrap items-center gap-y-3 rounded-[var(--radius-md)] bg-acc-soft px-4 py-4 shadow-hair sm:px-6">
      <dl className="flex w-full min-w-0 flex-wrap gap-y-3 sm:w-auto sm:flex-1">
        {items.map((it, i) => {
          const value = <span className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">{it.value}</span>;
          return (
            <div key={it.label} className={cn("flex min-w-0 flex-1 flex-col gap-1 px-3 sm:flex-none sm:px-6", i === 0 ? "pl-0 sm:pl-0" : "border-l border-line")}>
              <dt className="break-keep text-[12px] text-mut">{it.label}</dt>
              <dd>
                {it.href ? (
                  <Link href={it.href} className="press rounded-sm hover:underline hover:decoration-acc hover:underline-offset-4">
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {link && (
        <Link href={link.href} className="w-full text-[13px] font-semibold text-acc hover:underline sm:ml-auto sm:w-auto">
          {link.label}
        </Link>
      )}
    </section>
  );
}

/**
 * 오른쪽 패널(목업 .lhsd) — 제목 줄, 흰 판 안의 줄들, 판 아래 안내 한 마디(guide).
 * 판 안 줄은 SideRow 를 쓰고, 비었을 때는 children 자리에 안내를 넣는다.
 */
export function SidePanel({ id, title, action, guide, children }: { id: string; title: string; action?: React.ReactNode; guide?: { title: string; body: React.ReactNode; link?: React.ReactNode }; children: React.ReactNode }) {
  return (
    <aside aria-labelledby={id} className="flex flex-col gap-2.5 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
      <NewsHead id={id} title={title} action={action} />
      <div className={cn(NEWS_BOX, "flex flex-col gap-2.5 p-3.5")}>
        {children}
        {guide && (
          <div className="mt-1 flex flex-col gap-1.5 border-t border-line-soft px-1.5 pb-1 pt-4">
            <p className="text-[14px] font-bold text-ink">{guide.title}</p>
            <div className="text-[12.5px] leading-[1.7] text-mut">{guide.body}</div>
            {guide.link && <span className="text-[13px] font-semibold text-acc">{guide.link}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}

/** 패널 안 한 줄 — 글자 칸(이름 첫 글자), 제목과 보조 줄, 오른쪽 알약 링크 */
export function SideRow({ mark, title, lines, href, cta, muted = false }: { mark: string; title: string; lines: React.ReactNode[]; href: string; cta: string; muted?: boolean }) {
  return (
    <div className="relative grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-inset)] bg-surface-4 p-3 transition-colors hover:bg-surface-2 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-[10px] bg-acc-soft text-[19px] font-extrabold text-acc sm:size-[52px]">
        {mark}
      </span>
      <Link href={href} className="flex min-w-0 flex-col gap-0.5 after:absolute after:inset-0">
        <span className="truncate text-[14.5px] font-bold text-ink">{title}</span>
        {lines.map((l, i) => (
          <span key={i} className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] text-dim">
            {l}
          </span>
        ))}
      </Link>
      <span
        aria-hidden
        className={cn("whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold", muted ? "text-dim" : "text-acc shadow-[inset_0_0_0_1px_var(--acc)]")}
      >
        {cta}
      </span>
    </div>
  );
}

/** 패널이 비었을 때 — 한 마디와 행동 하나 */
export function SideEmpty({ title, lead, action }: { title: string; lead?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 px-1.5 py-2">
      <p className="text-[14px] font-bold text-ink">{title}</p>
      {lead && <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>}
      {action}
    </div>
  );
}

/** 따로 뜬 숫자 칸 하나(목업 .lsk) — 등록현황의 상단 집계처럼 칸마다 숫자가 주인공인 자리. 누르면 그 목록으로 간다 */
export function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <span className="text-[12.5px] text-dim">{label}</span>
      <span className="text-[22px] font-black tabular-nums text-ink sm:text-[26px]">{value.toLocaleString("ko-KR")}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-hair";
  return href ? (
    <Link href={href} className={`${cls} press transition-colors hover:bg-surface-2`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
