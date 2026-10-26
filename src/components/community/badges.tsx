// 게시판 말머리, 스포, 홍보 유형, 답변 대기 딱지(기획서 v2.0 4.4, 7장). 서버, 클라이언트 어디서든 쓴다.
import { Tag } from "@/components/ui/tag";
import { AWAITING_ANSWER_MAX_COMMENTS, CATEGORY_LABEL, CATEGORY_TONE, PROMO_TYPE_LABEL, PROMO_TYPE_TONE } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import type { PostRowDto } from "@/server/services/community";

export function CategoryTag({ category }: { category: PostRowDto["category"] }) {
  return <Tag tone={CATEGORY_TONE[category]}>{CATEGORY_LABEL[category]}</Tag>;
}

/** 한 줄에 붙는 딱지 묶음 — 카테고리, 리뷰의 스포 여부, 홍보 유형, 질문의 답변 대기 */
/** awaiting: 답변 대기 딱지. 이미 "답변 0" 딱지를 단 줄(라운지 홈 기다리는 질문)은 끈다 — 같은 말이 두 번 선다 */
export function PostTags({ post, showCategory = true, awaiting = true }: { post: Pick<PostRowDto, "category" | "spoiler" | "promoType" | "commentCount">; showCategory?: boolean; awaiting?: boolean }) {
  return (
    <>
      {showCategory && <CategoryTag category={post.category} />}
      {post.category === "review" && <Tag tone={post.spoiler ? "danger" : "acc"}>{post.spoiler ? M.spoilerOn : M.spoilerOff}</Tag>}
      {post.category === "promo" && post.promoType && <Tag tone={PROMO_TYPE_TONE[post.promoType]}>{PROMO_TYPE_LABEL[post.promoType]}</Tag>}
      {awaiting && post.category === "qna" && post.commentCount <= AWAITING_ANSWER_MAX_COMMENTS && <Tag tone="info">{M.awaitingAnswer}</Tag>}
    </>
  );
}
