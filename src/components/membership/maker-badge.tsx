// 메이커 꼬리표(2026-10-27, 기획서 4.3 메이커 멤버십 "프로필 인증 꼬리표"). 게시판 글쓴이, 인디 카드, 인디 상세가 같이 쓴다.
// 낱말을 "인증" 이 아니라 "메이커" 로 둔 이유는 lib/indie/stats-messages 의 MAKER_BADGE_MESSAGES 주석.
// "개발자" 표시(파랑 체크 글자)와 모양을 달리해 회색 얇은 테두리로 둔다 — 둘이 나란히 서도 다른 말로 읽히고, 면을 채운 색 딱지를 줄인다
// (2026-10-28 사용자 "배지가 알록달록"). 뜻은 화면 읽기 프로그램에 덧붙인다.
import { Tag } from "@/components/ui/tag";
import { MAKER_BADGE_MESSAGES as M } from "@/lib/indie/stats-messages";

export function MakerBadge() {
  return (
    <Tag tone="outline">
      {M.label}
      <span className="sr-only">, {M.hint}</span>
    </Tag>
  );
}
