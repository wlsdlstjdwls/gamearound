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
import { AuthorName, PostTags } from "@/components/community/badges";
import { ChevronLeftIcon, HeartIcon } from "@/components/ui/icons";
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

/**
 * 딱지 줄 — 줄 성격 딱지, 관련 게임, 카테고리, 지난 시간(목업 hotRow, waitRow 의 "게임 이름 + 카테고리").
 * 게임 이름이 길면 그것만 잘린다 — 카테고리와 시간은 짧고 늘 읽혀야 한다.
 */
function MetaLine({ flag, post, now }: { flag?: React.ReactNode; post: PostRowDto; now: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12px] text-dim">
      {flag}
      {post.game && <span className="min-w-0 truncate font-semibold text-ink-2">{post.game.title}</span>}
      <span className={post.game ? "shrink-0" : "truncate"}>{CATEGORY_LABEL[post.category]}</span>
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
                <Link href={p.href} className="row-beam group grid grid-cols-[30px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[30px_minmax(0,1fr)_auto] sm:px-5">
                  {/* 1~3위만 채운 칸 — 순위가 곧 "얼마나 뜨거운가" 라 위 셋을 눈이 먼저 잡게 한다.
                      그 셋만 빛이 위에서 아래로 차례로 스친다(.rank-glint) */}
                  <span
                    aria-label={M.rankLabel(i + 1)}
                    className={cn("flex size-[30px] items-center justify-center rounded-lg text-[14px] font-extrabold tabular-nums", i < 3 ? "rank-glint bg-acc text-on-ink" : "bg-surface-2 text-dim")}
                    style={i < 3 ? rankGlint(i) : undefined}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    {/* "급상승" 딱지는 걷었다 — 블록 제목이 이미 말하고, 줄마다 빨간 딱지가 서니 줄이 알록달록했다(10-28 사용자) */}
                    <MetaLine post={p} now={now} />
                    <TitleLine post={p} />
                    <span className="flex min-w-0 text-[12.5px] text-dim">
                      <AuthorName post={p} />
                    </span>
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

/** 순위 칸 빛의 어긋남 — 1위부터 한 칸씩 늦게 출발해 위에서 아래로 흐른다. 첫 출발은 줄 등장이 끝난 뒤다 */
const RANK_GLINT_START_MS = 900;
const RANK_GLINT_STEP_MS = 260;
function rankGlint(i: number): React.CSSProperties {
  return { "--glint-delay": `${RANK_GLINT_START_MS + i * RANK_GLINT_STEP_MS}ms` } as React.CSSProperties;
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

/** 현황 띠의 한 칸. value 가 수면 크게 세우고 단위(unit)를 옆에 작게 붙인다. 글자(로그인 안내)면 한 줄 문장으로 선다 */
export type StatItem = { label: string; value: number | string; unit?: string; href?: string; icon?: React.ReactNode };

/**
 * 현황 띠(게시판 홈 S-10, 라운지 홈 S-16) — 흰 판 하나를 칸으로 가르고, 칸마다 아이콘, 이름, 큰 수를 세운다.
 * 10-28 검수("이 영역이 너무 안 이쁘다"): 연파랑 면에 작은 글자 줄이 흐릿한 빛과 겹쳐 숫자가 안 읽혔다. 숫자가 주인공이 되게
 * 수를 키우고, 면은 흰 판으로 바꾸고, 빛 웅덩이는 걷었다. 첫 칸만 아이콘 바탕을 채워 "지금 가장 중요한 수" 로 세운다.
 * 누르는 칸은 칸 전체가 누를 면이고 오른쪽에 꺾쇠가 선다. 좁은 화면은 두 칸씩 접히고 끝의 링크는 맨 아래 한 줄이 된다.
 */
export function StatStrip({ items, link, label }: { items: StatItem[]; link?: { href: string; label: string }; label: string }) {
  const four = items.length >= 4;
  const cols = four ? "grid-cols-2 md:grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-1";
  return (
    <section aria-label={label} className="flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair md:flex-row md:items-stretch">
      <dl className={cn("grid min-w-0 flex-1", cols)}>
        {items.map((it, i) => {
          const numeric = typeof it.value === "number";
          return (
            <div
              key={it.label}
              style={stagger(i)}
              className={cn(
                "enter-item group/stat relative flex min-w-0 flex-col gap-2.5 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:gap-3.5 sm:px-5",
                // 칸 사이 선. 넷은 좁은 폭에서 두 칸씩 접혀 둘째 줄 위에도 선을 긋는다
                "border-line-soft",
                four ? i % 2 === 1 && "border-l" : i > 0 && "border-l",
                four && i >= 2 && "max-md:border-t",
                four && i === 2 && "md:border-l",
                // 눌러서 들어가는 칸은 눌린다는 티를 낸다(2026-10-28, 사용자: "클릭된다고 티 좀 내줘 이쁘게").
                // 바탕이 브랜드색으로 옅게 물들고, 그림 칸이 채운 파랑으로 바뀌고, 오른쪽 동그라미 화살표가 밀려 나간다.
                // 화살표는 좁은 폭에도 늘 선다 — 터치 기기에는 hover 가 없어 그것 말고는 눌린다는 표시가 없다
                it.href && "pr-12 hover:bg-acc-soft sm:pr-14",
              )}
            >
              {it.icon && (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-fast sm:size-11",
                    i === 0 ? "bg-acc text-on-ink" : "bg-acc-soft text-acc",
                    it.href && "group-hover/stat:bg-acc group-hover/stat:text-on-ink",
                  )}
                >
                  {it.icon}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <dt className={cn("truncate text-[12.5px]", it.href ? "font-semibold text-ink-2" : "text-mut")}>{it.label}</dt>
                <dd className={cn("flex items-baseline gap-0.5", !numeric && "text-[14px] font-semibold text-ink")}>
                  {numeric ? (
                    <>
                      <span className="text-[22px] font-black leading-tight tracking-[-0.03em] tabular-nums text-ink sm:text-[24px]">{(it.value as number).toLocaleString("ko-KR")}</span>
                      {it.unit && <span className="text-[13px] font-semibold text-mut">{it.unit}</span>}
                    </>
                  ) : (
                    it.value
                  )}
                </dd>
              </div>
              {it.href && (
                <Link
                  href={it.href}
                  aria-label={`${it.label} ${typeof it.value === "number" ? it.value.toLocaleString("ko-KR") : it.value}${it.unit ?? ""}`}
                  className="press absolute inset-0 rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acc"
                >
                  <span
                    aria-hidden
                    className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-mut transition-[background-color,color,translate] duration-fast group-hover/stat:translate-x-0.5 group-hover/stat:bg-acc group-hover/stat:text-on-ink sm:right-4 sm:size-8"
                  >
                    <ChevronLeftIcon size={15} className="rotate-180" />
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </dl>
      {link && (
        <Link
          href={link.href}
          className="press flex min-h-[var(--touch-target)] shrink-0 items-center justify-center gap-1 border-t border-line-soft bg-surface-4 px-5 text-[13.5px] font-semibold text-acc transition-colors hover:bg-acc-soft md:border-l md:border-t-0"
        >
          {link.label}
          <ChevronLeftIcon size={15} aria-hidden className="rotate-180" />
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
    <div className="row-beam grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[var(--radius-inset)] bg-surface-4 p-3 transition-colors hover:bg-surface-2 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
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
