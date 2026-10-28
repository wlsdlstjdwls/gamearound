// 게시판 말머리, 스포, 홍보 유형, 답변 대기 딱지(기획서 v2.0 4.4, 7장). 서버, 클라이언트 어디서든 쓴다.
import { MakerBadge } from "@/components/membership/maker-badge";
import { CheckIcon } from "@/components/ui/icons";
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
      {/* 곁딱지는 회색이다. 색은 말머리(파랑)와 "스포 있음"(빨강, 읽기 전에 알아야 하는 경고) 둘에만 남긴다(2026-10-28 사용자 "알록달록") */}
      {post.category === "review" && <Tag tone={post.spoiler ? "danger" : "neutral"}>{post.spoiler ? M.spoilerOn : M.spoilerOff}</Tag>}
      {post.category === "promo" && post.promoType && <Tag tone={PROMO_TYPE_TONE[post.promoType]}>{PROMO_TYPE_LABEL[post.promoType]}</Tag>}
      {awaiting && post.category === "qna" && post.commentCount <= AWAITING_ANSWER_MAX_COMMENTS && <Tag tone="neutral">{M.awaitingAnswer}</Tag>}
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

/**
 * 작성자 이름 + "개발자" 배지(목업 brow, postv 의 .dv). 배지는 승인된 인디 게임을 공개 중인 글쓴이에게만 선다(services/community/columns).
 * 이름은 잘려도 배지는 남는다(shrink-0) — 긴 닉네임 때문에 "확인된 개발자" 라는 말이 사라지면 안 된다.
 * 체크 표시는 글자(✔)가 아니라 아이콘이다 — 글꼴마다 이모지로 바뀌어 색이 제멋대로 칠해진다.
 * 면을 채운 초록 딱지를 걷고 파랑 체크 + 글자만 둔다(2026-10-28 사용자 "개발자 표시 뱃지도"). 줄의 말머리 딱지와 겹쳐 보이지 않게
 * 인증 표시처럼 이름 옆에 붙는 글자로 읽힌다.
 */
export function AuthorName({ post, className }: { post: Pick<PostRowDto, "authorName" | "authorIsDeveloper" | "authorIsMaker">; className?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className={className ?? "truncate"}>{post.authorName}</span>
      {post.authorIsDeveloper && (
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[11.5px] font-bold leading-none text-acc">
          <CheckIcon size={11} aria-hidden />
          {M.developerBadge}
        </span>
      )}
      {post.authorIsMaker && <MakerBadge />}
    </span>
  );
}
