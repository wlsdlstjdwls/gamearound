// 내 활동(기획서 v2.0 S-24): 프로필(닉네임, 사진 변경, 기본 이미지로), 탭 둘(내가 쓴 글, 저장한 글). 줄을 누르면 글 상세.
// 로그인 필수 영역((user) 레이아웃이 세션을 확인한다). 사용자 메뉴의 맨 위 항목이다.
//
// 폭은 서비스 기본 폭이다(목업 actPage 는 본문 폭 그대로). 좁은 폭(tight)이던 때는 글 목록 줄의 제목이 반쯤에서 잘렸다.
// 프로필 판만 좁은 폭 토큰으로 묶는다 — 사진과 단추 두 개뿐인 판이 1200 폭으로 늘어나면 오른쪽이 텅 빈다(목업 .pfc max-width).
// 목록은 게시판과 같은 한 쪽 20줄(기획서 4.3)이고, 탭을 바꾸면 1쪽부터다.
import type { Metadata } from "next";
import { PostList } from "@/components/community/post-list";
import { AvatarEditor } from "@/components/me/avatar-editor";
import { Pagination } from "@/components/pagination";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES } from "@/lib/community/messages";
import { ME_MESSAGES as M } from "@/lib/me/constants";
import { readPageParam } from "@/lib/pagination";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyPosts, listMySavedPosts } from "@/server/services/community";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Tab = "posts" | "saved";

/** 탭과 쪽을 주소로. 1쪽과 기본 탭은 주소에서 뺀다 — 메뉴에서 들어온 주소와 같은 화면이 한 주소로 모인다 */
function meHref(tab: Tab, page = 1): string {
  const params = new URLSearchParams();
  if (tab === "saved") params.set("tab", "saved");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${ROUTES.me}?${qs}` : ROUTES.me;
}

export default async function MePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const sp = await searchParams;
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = rawTab === "saved" ? "saved" : "posts";
  const page = readPageParam(sp.page);
  const result = tab === "saved" ? await listMySavedPosts(page) : await listMyPosts(page);
  const name = user.displayName ?? user.email.split("@")[0];

  return (
    <Page gap={22}>
      <PageHead title={M.title} />
      <section className="max-w-[var(--page-w-tight)] rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-7">
        <AvatarEditor userId={user.id} name={name} initialUrl={user.avatarUrl} />
      </section>
      <NavPendingScope>
        <div role="group" aria-label={M.title} className="flex gap-1.5">
          <NavChip group="tab" current="page" href={meHref("posts")} active={tab === "posts"}>
            {M.tabPosts}
          </NavChip>
          <NavChip group="tab" current="page" href={meHref("saved")} active={tab === "saved"}>
            {M.tabSaved}
          </NavChip>
        </div>
        {/* 목록은 흰 판 한 장 안에(목업 actPage 의 .bcd) — 게시판 목록과 같은 줄 모양이다.
            빈 목록은 판을 세우지 않는다 — 흰 판 안에 회색 빈 상자가 또 앉아 두 겹이 됐고, 그만큼 화면이 길어져 쓸데없이 스크롤됐다(2026-10-28) */}
        <PendingRegion className={result.items.length > 0 ? "mt-3 flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair sm:p-4" : "mt-3 flex flex-col gap-3"}>
          <PostList
            bare
            posts={result.items}
            empty={tab === "saved" ? { title: M.savedEmpty, description: M.savedEmptyLead } : { title: M.postsEmpty, description: M.postsEmptyLead, action: { href: writePath(), label: COMMUNITY_MESSAGES.write } }}
          />
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => meHref(tab, p)} />
        </PendingRegion>
      </NavPendingScope>
    </Page>
  );
}
