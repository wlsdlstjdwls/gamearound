// /admin/effects — 화면 연출(2026-10-28, 사용자 "이 효과는 관리자가 설정할 수 있게"). 지금은 명예의 전당 1위 인트로 하나다.
// 연출이 늘면 같은 화면에 판을 하나씩 더한다(값은 site_settings 의 키 하나씩).
import type { Metadata } from "next";
import { FameIntroForm } from "@/components/admin/fame-intro-form";
import { PageHead, sectionCardClass } from "@/components/ui/page";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { FAME_INTRO_ADMIN_MESSAGES as M } from "@/lib/indie/fame-intro";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getFameIntroSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: ADMIN_NAV.effects };

export default async function AdminEffectsPage() {
  await requireRoleOrForbid("admin");
  const settings = await getFameIntroSettings();
  return (
    <div className="flex flex-col gap-5">
      <PageHead title={ADMIN_NAV.effects} />
      <section aria-labelledby="fame-intro-head" className={sectionCardClass("flex max-w-[680px] flex-col gap-4")}>
        <div className="flex flex-col gap-1">
          <h2 id="fame-intro-head" className="text-[15px] font-bold text-ink">
            {M.sectionTitle}
          </h2>
          <p className="text-[13px] leading-[1.6] text-mut">{M.lead}</p>
        </div>
        <FameIntroForm initial={settings} />
      </section>
    </div>
  );
}
