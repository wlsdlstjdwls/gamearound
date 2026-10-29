// /admin/posts — 게시글관리(기획서 v2.0 2.2 운영진 "부적절한 글 숨김", 9.2 관리자 콘솔 "게시글 관리").
// 게임 게시판(리뷰, 공략, 홍보)과 라운지(개발일지, 질문 피드백)의 글, 댓글을 최신순으로 보고 숨기거나 되살린다.
//
// 큐가 아니라 목록이다 — 글은 승인 없이 바로 서고 신고 장치가 아직 없다(기획서 6.1 "신고는 협의").
// 그래서 메뉴 배지를 달지 않고, 오래된 글은 쪽 넘기기 대신 검색어로 서버에서 찾는다(줄 수 상한은 services/community/admin).
// 숨긴 구분을 따로 둔 이유: 되살리기는 숨긴 것을 찾아야 할 수 있다. 전체에 섞으면 백 줄 안에서 묻힌다.
//
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/posts-screen). 여기는 구분과 검색어를 읽고 줄을 한 모양으로 펴서 넘긴다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { PostsScreen, type PostAdminRow } from "@/components/admin/posts-screen";
import { POST_ADMIN_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";
import { CATEGORY_LABEL } from "@/lib/community/constants";
import { firstParam } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listAllCommentsForAdmin } from "@/server/services/indie";
import { listPostsForAdmin, POST_ADMIN_LIMIT, POST_ADMIN_TABS, type AdminCommentRowDto, type AdminPostRowDto, type PostAdminTab } from "@/server/services/community";

export const metadata: Metadata = { title: ADMIN_NAV.posts };

const TAB_LABEL: Record<PostAdminTab, string> = { posts: M.tabPosts, hidden: M.tabHidden, comments: M.tabComments, hiddenComments: M.tabHiddenComments };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function tabHref(tab: PostAdminTab): string {
  return tab === POST_ADMIN_TABS[0] ? ROUTES.adminPosts : `${ROUTES.adminPosts}?tab=${tab}`;
}

function postRow(r: AdminPostRowDto): PostAdminRow {
  return {
    key: `post-${r.id}`,
    kind: "post",
    id: r.id,
    status: r.status,
    text: r.title,
    href: r.href,
    category: CATEGORY_LABEL[r.category],
    game: r.game?.title ?? null,
    authorName: r.authorName,
    authorEmail: r.authorEmail,
    createdAt: r.createdAt,
    reaction: { views: r.viewCount, likes: r.likeCount, comments: r.commentCount },
    onPost: null,
  };
}

function commentRow(r: AdminCommentRowDto): PostAdminRow {
  return {
    key: `${r.kind}-${r.id}`,
    kind: r.kind,
    id: r.id,
    status: r.status,
    text: r.body,
    href: r.postHref,
    category: null,
    game: null,
    authorName: r.authorName,
    authorEmail: r.authorEmail,
    createdAt: r.createdAt,
    reaction: null,
    onPost: { title: r.postTitle, href: r.postHref, hidden: r.postStatus === "hidden" },
  };
}

export default async function AdminPostsPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const raw = firstParam(sp.tab);
  const tab: PostAdminTab = (POST_ADMIN_TABS as readonly string[]).includes(raw ?? "") ? (raw as PostAdminTab) : POST_ADMIN_TABS[0];
  const q = (firstParam(sp.q) ?? "").trim();
  const isComments = tab === "comments" || tab === "hiddenComments";
  const rows = isComments ? (await listAllCommentsForAdmin(tab === "hiddenComments", q)).map(commentRow) : (await listPostsForAdmin(tab === "hidden" ? "hidden" : "posts", q)).map(postRow);

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.posts} count={rows.length} note={rows.length >= POST_ADMIN_LIMIT ? M.limitNote(POST_ADMIN_LIMIT) : undefined} />
      {/* 구분, 검색어가 바뀌면 고른 줄, 체크를 비운다 — 다른 목록의 열쇠가 남아 엉뚱한 글을 처리하지 않게 */}
      <PostsScreen
        key={`${tab}-${q}`}
        rows={rows}
        mode={isComments ? "comments" : "posts"}
        tab={tab}
        tabs={POST_ADMIN_TABS.map((t) => ({ value: t, label: TAB_LABEL[t], href: tabHref(t) }))}
        q={q}
        baseHref={tabHref(tab)}
      />
    </>
  );
}
