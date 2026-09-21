// 접었다 펴는 마디 — 제목 줄을 누르면 내용이 열린다.
//
// details 로 쓰는 이유: 열림 상태는 이 마디 하나만 아는 값이라 상태를 위로 올릴 일이 없고,
// 그러면 이 파일이 서버 컴포넌트로 남는다. 상세 화면은 이미 클라이언트 조각이 넷이라
// 여기까지 "use client" 를 붙이면 접기만 하려고 번들이 또 는다.
//
// 기본을 접어 두는 자리(구동 사양, 추가 콘텐츠)의 공통점: 한 번 확인하면 끝나는 질문이고,
// 펴 두면 그 아래 마디들이 화면 두세 개 밖으로 밀린다. 값 자체가 결론인 마디(가격)는 접지 않는다.
import { ChevronDownIcon } from "@/components/ui/icons";
import { SECTION_SIZE, type SectionSize } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export function Collapsible({
  id,
  title,
  note,
  size = "section",
  defaultOpen = false,
  className,
  children,
}: {
  id?: string;
  title: React.ReactNode;
  /** 제목 옆 회색 보조 문구(건수 등). 접힌 상태에서 "안에 뭐가 있나" 를 말하는 유일한 자리다 */
  note?: React.ReactNode;
  size?: SectionSize;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className={cn("group flex flex-col", className)}>
      {/* list-none 둘 다 필요하다 — 사파리는 ::-webkit-details-marker 로만 세모를 지운다 */}
      <summary className="tap flex cursor-pointer list-none items-baseline justify-between gap-3 py-1 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 id={id} className={SECTION_SIZE[size]}>
            {title}
          </h2>
          {note && <span className="text-[13px] text-dim">{note}</span>}
        </span>
        {/* 글자를 쓰지 않는 이유: "펼치기" 와 "접기" 를 상태에 따라 갈아 끼우면 같은 자리의 말이
            누를 때마다 바뀌어 읽는 사람이 어느 쪽이 지금인지 두 번 생각한다. 세모는 방향만 말한다 */}
        <ChevronDownIcon
          aria-hidden
          className="mt-1 size-4 shrink-0 text-dim transition-transform duration-base group-open:rotate-180"
        />
      </summary>
      <div className="pt-3.5">{children}</div>
    </details>
  );
}
