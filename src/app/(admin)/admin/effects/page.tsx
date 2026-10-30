// /admin/effects — 전시관리(앞 이름 화면 연출, 2026-10-28, 사용자 "이 효과는 관리자가 설정할 수 있게"). 지금은 명예의 전당 1위 인트로 하나다.
// 화면 구성은 백오피스 등록 화면 꼴(components/admin/effects-screen, 2026-10-30). 여기는 저장된 값을 읽어 넘기기만 한다.
// 전시가 늘면 site_settings 키를 하나씩 더하고 그 화면 목록에 줄을 더한다.
import type { Metadata } from "next";
import { EffectsScreen } from "@/components/admin/effects-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getFameIntroSettings, SETTING_KEYS } from "@/server/services/settings";

export const metadata: Metadata = { title: ADMIN_NAV.effects };

export default async function AdminEffectsPage() {
  await requireRoleOrForbid("admin");
  const settings = await getFameIntroSettings();
  return <EffectsScreen code={SETTING_KEYS.fameIntro} initial={settings} />;
}
