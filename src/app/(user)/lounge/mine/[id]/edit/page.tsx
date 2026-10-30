// /lounge/mine/[id]/edit — 내 글 고치기(2026-10-30). 본문은 components/community/post-edit-page 가 그린다(게시판, 라운지 공용).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditPage } from "@/components/community/post-edit-page";
import { isPostId } from "@/lib/community/constants";
import { POST_EDIT_MESSAGES as M } from "@/lib/community/messages";

export const metadata: Metadata = { title: M.editTitle, robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  if (!isPostId(id)) notFound();
  return <PostEditPage id={id} lounge={true} />;
}
