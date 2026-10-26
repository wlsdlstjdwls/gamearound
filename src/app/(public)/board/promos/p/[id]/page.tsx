// 홍보 글 상세(기획서 v2.0 S-15). 주소에 게시판을 넣어 하위 메뉴 띠와 경로가 제 게시판(홍보) 칸을 켠다(lib/community/constants 의 postPath).
// 틀은 components/community/post-detail. 사람마다 좋아요, 저장 상태가 달라 캐시하지 않는다.
import type { Metadata } from "next";
import { PostDetail } from "@/components/community/post-detail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "게시글" };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PostDetail id={id} lounge={false} category="promo" />;
}
