// 글 고치기 화면 본문(2026-10-30). 게시판 글은 /board/mine/<id>/edit, 라운지 글은 /lounge/mine/<id>/edit 가 이 하나를 그린다(lib/routes 의 postEditPath).
// 남의 글이거나 없는 글은 404 다 — "권한 없음" 을 따로 그리면 남의 글 id 가 있는지 없는지를 알려 주게 된다.
// 주소의 갈래와 글의 갈래가 다르면(라운지 주소로 게시판 글) 제 주소로 보낸다.
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/community/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { BOARD_CATEGORIES, isLoungeCategory, LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { POST_EDIT_MESSAGES as M } from "@/lib/community/messages";
import { splitPostBody } from "@/lib/community/post-body";
import { postEditPath } from "@/lib/routes";
import { getMyPostForEdit } from "@/server/services/community";
import { listMyIndieChoices } from "@/server/services/indie";
import { requireUserOrRedirect } from "@/server/auth/guards";

export async function PostEditPage({ id, lounge }: { id: string; lounge: boolean }) {
  const user = await requireUserOrRedirect();
  // 글과 내 인디 게임 목록은 서로 기다릴 일이 없다. 게임 목록은 라운지 글에만 쓰고, 못 읽어도 고치기는 연다
  const [post, indieChoices] = await Promise.all([getMyPostForEdit(id), lounge ? listMyIndieChoices(user.id).catch(() => []) : Promise.resolve([])]);
  if (!post) notFound();
  if (isLoungeCategory(post.category) !== lounge) redirect(postEditPath(id, !lounge));
  const { html, files } = splitPostBody(post.body);
  return (
    <Page width="tight" gap={20}>
      <PageHead title={M.editTitle} />
      <PostForm
        categories={lounge ? LOUNGE_CATEGORIES : BOARD_CATEGORIES}
        initial={post.category}
        indieChoices={indieChoices}
        initialIndie={post.indieSlug}
        edit={{
          id: post.id,
          title: post.title,
          html,
          // 바이트 수는 본문에 안 남는다 — 크기 글자(sizeLabel)로 다시 적는다(components/community/post-media)
          files: files.map((f) => ({ url: f.url, name: f.name, size: 0, sizeLabel: f.sizeLabel })),
          spoiler: post.category === "review" ? (post.spoiler ? "yes" : "no") : "",
          promoType: post.promoType ?? "",
          link: post.link ?? "",
          game: post.game,
        }}
      />
    </Page>
  );
}
