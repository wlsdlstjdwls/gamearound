// 폼 상단/하단 상태 메시지 — 에러는 shake, 성공은 rise. key를 바꿔 같은 메시지도 애니메이션이 다시 돈다.
import { cn } from "@/lib/cn";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";

export function FormMessage({ tone, children, replayKey }: { tone: "error" | "success" | "info"; children: React.ReactNode; replayKey?: string | number }) {
  const isError = tone === "error";
  return (
    <div
      key={replayKey}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2 rounded-[var(--radius-sm)] border px-3.5 py-3 text-[13px]",
        isError && "animate-shake border-danger/35 bg-danger-soft text-danger",
        tone === "success" && "animate-rise border-ok/35 bg-ok-soft text-ok",
        tone === "info" && "animate-rise border-line-strong bg-surface-4 text-mut",
      )}
    >
      {isError ? <AlertCircleIcon size={16} className="mt-0.5 shrink-0" /> : <CheckIcon size={16} className="mt-0.5 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
