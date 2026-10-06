// /indie/new — 인디 홍보 글 쓰기. (user) 무리라 레이아웃이 로그인을 이미 본다.
// 글 수 상한에 닿은 사람에게는 폼 대신 내 글 목록을 보여 준다 — 다 적고 나서 "더 못 올려요" 를 듣게 하지 않는다.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndiePostForm } from "@/components/indie/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: M.newTitle, robots: { index: false } };

export default async function IndieNewPage() {
  const user = await requireUserOrRedirect();
  const mine = await listMyIndiePosts(user.id);
  if (mine.length >= INDIE_POSTS_PER_USER_MAX) redirect(`${ROUTES.indieMine}?full=1`);

  return (
    <Page width="tight" gap={18}>
      <PageHead title={M.newTitle} note={M.newLead} />
      <IndiePostForm />
    </Page>
  );
}
