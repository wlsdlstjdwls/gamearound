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
        "flex items-start gap-2 rounded-[var(--radius-md)] border px-3.5 py-3 text-sm",
        isError && "animate-shake border-danger/40 bg-danger/10 text-red-200",
        tone === "success" && "animate-rise border-ok/40 bg-ok/10 text-emerald-200",
        tone === "info" && "animate-rise border-acc/30 bg-acc/10 text-amber-100",
      )}
    >
      {isError ? <AlertCircleIcon size={16} className="mt-0.5 shrink-0" /> : <CheckIcon size={16} className="mt-0.5 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
