// 글쓰기(기획서 v2.0 S-14). 로그인 필수 영역((user) 레이아웃이 세션을 확인한다). ?category= 로 고른 채 연다.
import type { Metadata } from "next";
import { PostForm } from "@/components/community/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";

export const metadata: Metadata = { title: M.writeTitle, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WritePage({ searchParams }: Props) {
  const raw = (await searchParams).category;
  const wanted = Array.isArray(raw) ? raw[0] : raw;
  const initial = LOUNGE_CATEGORIES.find((c) => c === wanted) ?? "devlog";
  return (
    <Page width="tight" gap={20}>
      <PageHead title={M.writeTitle} />
      <PostForm categories={LOUNGE_CATEGORIES} initial={initial} />
    </Page>
  );
}
