// 빈 결과/데이터 없음 안내 — 검색 결과 0건, 가격 이력 없음 등
import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center"
    >
      <span aria-hidden className="text-3xl">
        🔦
      </span>
      <p className="font-medium text-slate-200">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-400">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-2 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-300"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
