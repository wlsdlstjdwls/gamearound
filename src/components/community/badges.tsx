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

/**
 * 관련 게임 이름 딱지(목업 brow 의 줄 앞 게임 이름). 말머리와 섞이지 않게 색 없는 회색 면이다 — 색은 카테고리의 말이다.
 * 목록 줄은 줄 전체가 글 링크라 이 딱지는 링크가 아니다(링크 안 링크). 게임으로 가는 길은 글 상세의 "관련 게임" 이다.
 * 긴 이름이 제목 자리를 먹지 않게 폭을 묶고 자른다 — 잘린 이름은 줄을 눌러 상세에서 다 본다.
 */
export function GameChip({ title }: { title: string }) {
  return <span className="inline-block min-w-0 max-w-[9rem] shrink truncate rounded-[5px] bg-surface-2 px-1.5 py-[3px] align-middle text-[11.5px] font-semibold leading-none text-ink-2 sm:max-w-[12rem]">{title}</span>;
}
