"use client";
// 주간 맞춤 소식 스위치(설정 화면). 발송은 sync/news-digest, 고르기는 lib/news/digest.
// 밑에 맞춤 소식 화면 링크를 늘 둔다 — 켜기 전에 무엇이 오는지 먼저 볼 수 있어야 켤지 정한다.
import Link from "next/link";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { NEWS_DIGEST_MESSAGES as M } from "@/lib/news/messages";
import { ROUTES } from "@/lib/routes";
import { setNewsDigestAction } from "@/app/(user)/settings/actions";

export function NewsDigestToggle({ initialOn, className }: { initialOn: boolean; className?: string }) {
  return (
    <SettingSwitch
      initialOn={initialOn}
      title={M.title}
      onText={M.on}
      offText={M.off}
      failedText={M.failed}
      action={setNewsDigestAction}
      className={className}
      extra={() => (
        <Link href={ROUTES.newsMine} className="mt-1.5 inline-flex min-h-[44px] items-center text-[12.5px] font-semibold text-acc underline-offset-2 hover:underline">
          {M.seeMine}
        </Link>
      )}
    />
  );
}
