// 수집 실행의 에러 맛보기 상자 — 수집현황, 수집이력조회 상세가 같은 꼴로 쓴다(AGENTS §3).
// 전문을 다 펴 두고 길면 상자 안에서만 굴린다 — 앞 표는 칸 폭 때문에 300자, 두 줄에서 잘랐다.
// 고정폭 글꼴은 쓰지 않는다 — 한글이 섞인 에러 문구는 고정폭에서 낱자 사이가 벌어져 안 읽혔다.
// 상태, 이벤트가 없어 "use client" 를 붙이지 않는다.
import { FULL_ROW } from "@/components/admin/screen/form-grid";
import { cn } from "@/lib/cn";

export function SyncErrorSample({ text }: { text: string }) {
  return (
    <div className={cn(FULL_ROW, "max-h-[280px] overflow-auto rounded-xl bg-surface-2 px-3.5 py-2.5")}>
      <p className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.6] text-danger">{text}</p>
    </div>
  );
}
