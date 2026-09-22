// 칸이 많은 표 하나를 가로로 미끄러지게 감싼다.
//
// 왜 필요한가(2026-09-22, 모바일 대응): 관리자 표들은 이미 `overflow-x-auto` 를 두르고 있었지만
// 안의 `table` 이 `w-full` 이라 **미끄러질 것이 없었다.** 칸 아홉 개짜리 실행 로그가 390px 안으로
// 줄어들면서 한 칸이 30px 남짓이 됐고, 시각도 소스 이름도 세로로 한 글자씩 끊겨 읽을 수 없었다.
// 최소 폭을 주어야 비로소 `overflow-x-auto` 가 제 일을 한다.
//
// 좁은 화면에서는 좌우로 화면 여백(Page 의 px-5)만큼 넘쳐 나간다 — 미는 표가 본문 여백 안에
// 갇혀 있으면 그 여백이 "여기서 끝" 으로 읽혀 옆에 더 있다는 사실이 가려진다.
import { cn } from "@/lib/cn";

export function TableScroll({
  /** 이 폭 아래로는 줄이지 않는다. 칸 수와 그 안에 들어갈 값의 길이로 정한다 */
  minWidth,
  className,
  children,
}: {
  minWidth: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0", className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
