// 예전 글 상세 주소(/board/p/<id>). 글은 이제 제 게시판 아래에 선다(/board/reviews/p/<id>, lib/community/constants 의 postPath).
// 이 주소를 지우지 않는 이유: 알림함에 쌓인 링크와 바깥에 퍼진 링크가 이 꼴을 들고 있다. 카테고리만 읽어 새 주소로 영구 이동한다 —
// 조회수는 넘겨받은 화면이 한 번만 올린다.
import { notFound, permanentRedirect } from "next/navigation";
import { DbUnavailablePage } from "@/components/db-unavailable";
import { isPostId, postPath } from "@/lib/community/constants";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { ROUTES } from "@/lib/routes";
import { getPostCategory } from "@/server/services/community";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!isPostId(id)) notFound();
  const category = await orDbDown(getPostCategory(id));
  // DB 가 안 열리면 없는 글(404)로 접지 않는다 — 다시 시도할 길을 둔다
  if (category === DB_DOWN) return <DbUnavailablePage retryHref={`${ROUTES.board}/p/${id}`} />;
  if (!category) notFound();
  permanentRedirect(postPath(id, category));
}
