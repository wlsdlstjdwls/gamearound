// 값이 아직 없는 자리의 표시 — 둥근 연보라 바탕에 아이콘 하나 + 한 줄 문구.
// "-" 한 글자나 회색 낱말로 비워 두면 0원인지, 고장인지, 영영 없는 건지 읽는 사람이 가려야 했다(2026-10-07, 사용자 지적).
// 아이콘을 원 안에 두는 이유: 글자만 있으면 빈 타일이 여전히 "비어 있다" 로 읽힌다. 작은 면 하나가 그 자리를 채운다.
// 색은 브랜드 연보라(--acc-soft) — 빨강, 호박은 "문제" 라는 뜻이 붙어 있어 "기다리는 중" 에 쓰지 않는다.
import { cn } from "@/lib/cn";

export function PendingNote({ icon, children, size = "md", className }: { icon: React.ReactNode; children: React.ReactNode; size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold text-mut", size === "lg" ? "text-[16px]" : "text-[13px]", className)}>
      <span
        aria-hidden
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-acc-soft text-acc", size === "lg" ? "size-9" : "size-7")}
      >
        {icon}
      </span>
      {children}
    </span>
  );
}
