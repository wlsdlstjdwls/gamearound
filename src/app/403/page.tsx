import { PageHead } from "@/components/ui/page";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <PageHead title="403 | 접근 권한이 없습니다" />
      <p className="text-[13.5px] text-mut">이 페이지는 관리자 또는 업체 계정만 볼 수 있습니다.</p>
    </div>
  );
}
