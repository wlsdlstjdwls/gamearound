// 전역 404 — notFound() 및 존재하지 않는 경로
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-[460px] text-[13.5px] leading-[1.75] text-mut">
        주소가 잘못됐거나 아직 수집되지 않은 게임일 수 있습니다. 제목으로 다시 검색해 보세요.
      </p>
      <div className="mt-3 flex gap-2">
        <Link href={ROUTES.home} className={buttonClass()}>
          홈으로
        </Link>
        <Link href={ROUTES.game} className={buttonClass({ variant: "secondary" })}>
          게임 목록
        </Link>
      </div>
    </div>
  );
}
