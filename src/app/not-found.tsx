// 전역 404 — notFound() 및 존재하지 않는 경로
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page";
import { NOT_FOUND_MESSAGES } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <PageHead title={NOT_FOUND_MESSAGES.title} />
      <p className="max-w-[460px] text-[13.5px] leading-[1.75] text-mut">{NOT_FOUND_MESSAGES.body}</p>
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
