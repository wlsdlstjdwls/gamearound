// 전역 404 — notFound() 및 존재하지 않는 경로
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span aria-hidden className="text-5xl">
        🔦
      </span>
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-md text-sm text-slate-400">주소가 잘못됐거나 아직 수집되지 않은 게임일 수 있습니다. 제목으로 다시 검색해 보세요.</p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
          홈으로
        </Link>
        <Link href="/search" className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:border-amber-400">
          검색
        </Link>
      </div>
    </div>
  );
}
