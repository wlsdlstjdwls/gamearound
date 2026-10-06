// /indie/mine/[id] — 인디 홍보 글 고치기. 그림 올리기가 사는 자리이기도 하다(post-form 머리 주석).
//
// 주인이 아니면 403 이 아니라 404 다 — 남의 글 id 를 넣어 보는 사람에게 "있긴 하다" 를 알려 줄 이유가 없다.
// 관리자는 통과한다(숨기기 전에 손볼 일이 있다). 실제 쓰기 권한은 서비스가 질의 조건으로 다시 본다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteIndiePost } from "@/components/indie/delete-post";
import { IndieImageManager } from "@/components/indie/image-manager";
import { IndiePostForm } from "@/components/indie/post-form";
import { BackLink } from "@/components/ui/back-link";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { firstParam } from "@/lib/games-query";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { indiePath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getIndiePostBySlug, getIndiePostSlugById } from "@/server/services/indie";

export const metadata: Metadata = { title: M.editTitle, robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function IndieEditPage({ params, searchParams }: Props) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireUserOrRedirect()]);
  // 꼴이 안 맞는 id 로 DB 에 uuid 캐스트 오류를 내지 않는다
  if (!UUID.test(id)) notFound();
  const slug = await getIndiePostSlugById(id);
  const post = slug ? await getIndiePostBySlug(slug) : null;
  if (!post || (post.authorUserId !== user.id && user.role !== "admin")) notFound();

  return (
    <Page width="tight" gap={24}>
      <BackLink href={ROUTES.indieMine}>{M.mineTitle}</BackLink>
      <PageHead
        title={M.editTitle}
        action={
          <Link href={indiePath(post.slug)} className="tap inline-flex items-center text-[13px] text-acc hover:underline">
            {M.view}
          </Link>
        }
      />
      {firstParam(sp.created) && <FormMessage tone="success">{M.created}</FormMessage>}

      <section aria-labelledby="indie-images" className="flex flex-col gap-3">
        <SectionHead id="indie-images" title={M.imagesTitle} note={M.imagesLead} />
        <IndieImageManager postId={post.id} title={post.title} images={post.images} />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <IndiePostForm post={post} />
      </section>

      <section className="border-t border-line pt-6">
        <DeleteIndiePost postId={post.id} />
      </section>
    </Page>
  );
}
