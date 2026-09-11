export default function ForbiddenPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">403 · 접근 권한이 없습니다</h1>
      <p className="mt-2 text-slate-400">이 페이지는 관리자 또는 업체 계정만 볼 수 있습니다.</p>
    </div>
  );
}
