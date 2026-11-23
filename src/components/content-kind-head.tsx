// 자식 화면(DLC, 에디션, 번들, 체험판)의 표시 둘 — 종류 딱지(커버 위)와 본편으로 가는 판(오른쪽 기둥 위).
//
// 왜 필요한가: 자식도 games 행이라 본편과 **똑같이 생긴** 상세 화면을 갖는다.
// 그래서 DLC 상세만 보면 "왜 이 게임은 1,900원이지", "왜 플레이타임이 없지" 로 읽히고,
// 본편으로 돌아갈 길도 브레드크럼의 "게임 목록으로" 하나뿐이라 목록을 거쳐 다시 찾아야 했다.
//
// 본편 링크는 부모를 아는 자식에게만 건다 — 스토어가 부모를 안 알려 준 DLC 가 18,642건이다.
// 본편이 없으면 배지만 선다. 둘 다 없는 본편 화면에서는 이 컴포넌트가 아무것도 그리지 않는다.
//
// 2026-11-23 사용자 "본편 이동 버튼 표현 방식 다르게, 추가 콘텐츠 뱃지도", 이어서 "다른 쪽에 표현 가능?". 전에는 둘 다 제목 위 한 줄이라
// 회색 꼬리표와 테두리 단추가 제목, 장르와 한 덩어리로 읽혔다. 딱지는 커버 위로, 길은 오른쪽 기둥의 판 하나로 갈라 세운다.
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { CONTENT_KIND_LABEL, PARENT_LINK_LABEL } from "@/lib/games/messages";
import { gamePath } from "@/lib/routes";
import type { ContentType } from "@/server/db/schema";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

/**
 * 종류 딱지 — 커버 그림 왼쪽 위에 얹는다(2026-11-23 사용자 "추가 콘텐츠는 다른 쪽에 표현 가능?"). 제목 위 줄에 두니
 * 제목, 출시일 줄과 한 덩어리로 읽혔다. 그림 위 딱지는 목록 카드의 할인 배지와 같은 자리라 "이 상품의 성격" 으로 읽힌다
 */
export function ContentKindBadge({ contentType, className }: { contentType: ContentType; className?: string }) {
  if (contentType === "game") return null;
  return (
    <span className={cn("inline-flex h-6 items-center rounded-[var(--radius-xs)] bg-ink/85 px-2 text-[12px] font-bold text-on-ink backdrop-blur-sm", className)}>
      {CONTENT_KIND_LABEL[contentType]}
    </span>
  );
}

/**
 * 본편으로 가는 줄 — 가운데 기둥, 설명 바로 밑(같은 날 "본편 이동 버튼도 다른 쪽에", 이어서 "설명 아래에"). 제목 위 글자 링크는 제목과 겹쳐 읽혔고,
 * 오른쪽 기둥 맨 위, 커버 밑은 그 기둥만 길어져 세 기둥 바닥이 어긋났다. 회색 면 한 줄에 "본편" 이름표, 굵은 제목, 오른쪽 꺾쇠 — 줄 전체가 눌린다.
 * 흰 판은 옆 평론 점수 칸과 같아 구분이 안 됐고(같은 날 "다른 색으로"), 파랑 면도 해 봤는데 회색이 낫다고 했다(같은 날 "아까 그 회색이 나았다")
 * 제목을 그대로 적는다("본편 보기" 로는 어디로 가는지 모른다)
 */
export function ParentGameLink({ parent }: { parent: { slug: string; title: string } | null }) {
  if (!parent) return null;
  return (
    <Link
      href={gamePath(parent.slug)}
      className="press group/parent flex min-w-0 items-center gap-3 max-w-[620px] rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2.5 transition-colors duration-base hover:bg-surface-3"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11.5px] font-semibold text-dim">{PARENT_LINK_LABEL}</span>
        <Clamp className="text-[14px] font-bold text-ink underline-offset-4 group-hover/parent:underline">{parent.title}</Clamp>
      </span>
      <ChevronLeftIcon size={18} className="shrink-0 rotate-180 text-mut" />
    </Link>
  );
}
