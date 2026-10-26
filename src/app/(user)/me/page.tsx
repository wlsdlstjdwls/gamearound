// 내 활동(기획서 v2.0 S-24): 프로필(닉네임, 사진 바꾸기, 기본 이미지로), 탭 둘(내가 쓴 글, 저장한 글). 줄을 누르면 글 상세.
// 로그인 필수 영역((user) 레이아웃이 세션을 확인한다). 사용자 메뉴의 맨 위 항목이다.
import type { Metadata } from "next";
import { PostList } from "@/components/community/post-list";
import { AvatarEditor } from "@/components/me/avatar-editor";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES } from "@/lib/community/messages";
import { ME_MESSAGES as M } from "@/lib/me/constants";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyPosts, listMySavedPosts } from "@/server/services/community";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const raw = (await searchParams).tab;
  const tab = (Array.isArray(raw) ? raw[0] : raw) === "saved" ? "saved" : "posts";
  const posts = tab === "saved" ? await listMySavedPosts() : await listMyPosts();
  const name = user.displayName ?? user.email.split("@")[0];

  return (
    <Page width="tight" gap={22}>
      <PageHead title={M.title} />
      <section className="rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-7">
        <AvatarEditor userId={user.id} name={name} initialUrl={user.avatarUrl} />
      </section>
      <NavPendingScope>
        <div className="flex gap-1.5">
          <NavChip group="tab" current="page" href={ROUTES.me} active={tab === "posts"}>
            {M.tabPosts}
          </NavChip>
          <NavChip group="tab" current="page" href={`${ROUTES.me}?tab=saved`} active={tab === "saved"}>
            {M.tabSaved}
          </NavChip>
        </div>
        <PendingRegion className="mt-4">
          <PostList
            posts={posts}
            empty={tab === "saved" ? { title: M.savedEmpty, description: M.savedEmptyLead } : { title: M.postsEmpty, description: M.postsEmptyLead, action: { href: writePath(), label: COMMUNITY_MESSAGES.write } }}
          />
        </PendingRegion>
      </NavPendingScope>
    </Page>
  );
}
