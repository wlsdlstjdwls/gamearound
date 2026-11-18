// 소식 블록 공통 조각 — 흰 판, 블록 머리, 빈 줄, 딱지 줄, 제목 줄. 줄 블록(lists)과 라운지 홈 블록(lounge/home-blocks)이 같이 쓴다.
// news-blocks 한 파일이 300줄을 넘어 폴더로 갈랐다(2026-11-18). 부르는 쪽 import 경로는 index.ts 가 지킨다.
import Link from "next/link";
import { PostTags } from "@/components/community/badges";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatAgo } from "@/lib/format";
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
      {count !== undefined && count > 0 && <span className="text-[13px] font-semibold text-mut">{M.totalCount(count)}</span>}
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

export function EmptyRow({ title, lead }: { title: string; lead: string }) {
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
export function MetaLine({ flag, post, now }: { flag?: React.ReactNode; post: PostRowDto; now: number }) {
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
export function TitleLine({ post, awaiting = true }: { post: PostRowDto; awaiting?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <PostTags post={post} showCategory={false} awaiting={awaiting} />
      <span className="min-w-0 truncate text-[15.5px] font-bold tracking-[-0.02em] text-ink group-hover:text-acc">{post.title}</span>
    </span>
  );
}
