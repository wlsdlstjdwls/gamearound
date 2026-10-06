// /indie/mine — 내가 쓴 인디 홍보 글. 고치기로 가는 유일한 길이라 숨김 사유와 커버 유무를 여기서 바로 말한다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, ROW, ROWS } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_MESSAGES } from "@/lib/indie/messages";
import { indieEditPath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: M.mineTitle, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IndieMinePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [posts, sp] = await Promise.all([listMyIndiePosts(user.id), searchParams]);
  const full = posts.length >= INDIE_POSTS_PER_USER_MAX;

  return (
    <Page width="tight" gap={18}>
      <PageHead
        title={M.mineTitle}
        action={
          !full && (
            <Link href={ROUTES.indieNew} className={buttonClass({ variant: "primary" })}>
              {INDIE_MESSAGES.cta}
            </Link>
          )
        }
      />
      {firstParam(sp.full) && full && <FormMessage tone="info">{M.tooManyPosts(INDIE_POSTS_PER_USER_MAX)}</FormMessage>}

      {posts.length === 0 ? (
        <EmptyState title={M.mineEmpty} description={INDIE_MESSAGES.lead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.cta }} />
      ) : (
        <ul className={ROWS}>
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={indieEditPath(p.id)} className={cn(ROW, "flex flex-col gap-1 py-3")}>
                <span className="flex items-center gap-2">
                  <IndieStageBadge stage={p.stage} />
                  <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{p.title}</span>
                </span>
                <span className="text-[12.5px] text-dim">{formatDate(p.updatedAt)}</span>
                {p.status !== "published" && (
                  <span className="text-[12.5px] text-warn">
                    {INDIE_MESSAGES.hiddenNotice}
                    {p.statusReason && ` ${p.statusReason}`}
                  </span>
                )}
                {p.status === "published" && !p.hasCover && <span className="text-[12.5px] text-mut">{INDIE_MESSAGES.noCoverNotice}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
