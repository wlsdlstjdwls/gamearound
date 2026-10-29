// 글쓰기(기획서 v2.0 S-14). 로그인 필수 영역((user) 레이아웃이 세션을 확인한다). ?category= 로 고른 채 연다.
// ?indie=<slug> 는 인디 상세 "개발일지 쓰기" 가 그 게임을 골라 둔 채 여는 값이다. 내 게임 목록에 없으면 폼이 버린다.
import type { Metadata } from "next";
import { PostForm } from "@/components/community/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { listMyIndieChoices } from "@/server/services/indie";
import { requireUser } from "@/server/services/users";

export const metadata: Metadata = { title: M.writeTitle, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WritePage({ searchParams }: Props) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const wanted = first(sp.category);
  const initial = LOUNGE_CATEGORIES.find((c) => c === wanted) ?? "devlog";
  const user = await requireUser();
  // 못 읽어도 글은 쓴다. 게임 고르는 칸만 접는다
  const indieChoices = await listMyIndieChoices(user.id).catch(() => []);
  return (
    <Page width="tight" gap={20}>
      <PageHead title={M.writeTitle} />
      <PostForm categories={LOUNGE_CATEGORIES} initial={initial} indieChoices={indieChoices} initialIndie={first(sp.indie) ?? ""} />
    </Page>
  );
}
