// 자식 화면(DLC, 에디션, 번들, 체험판)의 머리 줄 — 종류 배지와 본편으로 가는 버튼.
//
// 왜 필요한가: 자식도 games 행이라 본편과 **똑같이 생긴** 상세 화면을 갖는다.
// 그래서 DLC 상세만 보면 "왜 이 게임은 1,900원이지", "왜 플레이타임이 없지" 로 읽히고,
// 본편으로 돌아갈 길도 브레드크럼의 "게임 목록으로" 하나뿐이라 목록을 거쳐 다시 찾아야 했다.
//
// 본편 링크는 부모를 아는 자식에게만 건다 — 스토어가 부모를 안 알려 준 DLC 가 18,642건이다.
// 본편이 없으면 배지만 선다. 둘 다 없는 본편 화면에서는 이 컴포넌트가 아무것도 그리지 않는다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { CONTENT_KIND_LABEL, PARENT_LINK_LABEL } from "@/lib/games/messages";
import { gamePath } from "@/lib/routes";
import type { ContentType } from "@/server/db/schema";
import { Tag } from "@/components/ui/tag";

export function ContentKindHead({
  contentType,
  parent,
  className,
  style,
}: {
  contentType: ContentType;
  parent: { slug: string; title: string } | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const kind = contentType === "game" ? null : CONTENT_KIND_LABEL[contentType];
  if (!kind && !parent) return null;

  return (
    <div className={className} style={style}>
      <div className="flex flex-wrap items-center gap-2">
        {kind && (
          <Tag tight={false}>{kind}</Tag>
        )}
        {parent && (
          // 제목을 버튼 안에 그대로 적는다 - "본편 보기" 로만 적으면 어느 게임으로 가는지 누르기 전까지 모른다.
          // 긴 제목은 잘라 둔다(max-w) - 자르지 않으면 버튼 하나가 머리 줄을 통째로 차지한다
          <Link href={gamePath(parent.slug)} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <span className="text-dim">{PARENT_LINK_LABEL}</span>
            <span className="max-w-[240px] truncate font-medium">{parent.title}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
