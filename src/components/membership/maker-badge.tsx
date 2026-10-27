// 메이커 꼬리표(2026-10-27, 기획서 4.3 메이커 멤버십 "프로필 인증 꼬리표"). 게시판 글쓴이, 인디 카드, 인디 상세가 같이 쓴다.
// 낱말을 "인증" 이 아니라 "메이커" 로 둔 이유는 lib/indie/stats-messages 의 MAKER_BADGE_MESSAGES 주석.
// 색은 "개발자" 배지(초록, 우리가 확인한 사실)와 다른 보라 — 둘이 나란히 서도 다른 말로 읽힌다. 뜻은 화면 읽기 프로그램에 덧붙인다.
import { Tag } from "@/components/ui/tag";
import { MAKER_BADGE_MESSAGES as M } from "@/lib/indie/stats-messages";

export function MakerBadge() {
  return (
    <Tag tone="plum">
      {M.label}
      <span className="sr-only">, {M.hint}</span>
    </Tag>
  );
}
