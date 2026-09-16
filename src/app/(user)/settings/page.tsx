// /settings — 계정 정보, 푸시 알림 토글 (§7, §10)
// 알림 동작 안내를 여기 두지 않는 이유: 같은 문구가 /alerts 아래에도 있어 두 번 읽히고,
// 설정 화면에서 할 일은 "켜고 끄는 것" 이라 규칙 설명은 알림 목록 쪽이 제자리다.
import type { Metadata } from "next";
import { PushToggle } from "@/components/push-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, Page, PageHead } from "@/components/ui/page";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countMyPushSubscriptions } from "@/server/services/push";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  // 나란히 쏜다 — 줄을 세우면 Neon 왕복(us-east-1, 약 220ms)을 두 번 기다린다
  const [user, pushCount] = await Promise.all([requireUserOrRedirect(), countMyPushSubscriptions()]);

  return (
    <Page width="tight" gap={18}>
      <PageHead title="설정" />

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[14px] font-bold text-ink">계정</h2>
          <SignOutButton />
        </div>
        <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3.5 gap-y-[9px] text-[13px]">
          <dt className="text-dim">닉네임</dt>
          <dd className="text-ink">{user.displayName ?? "(미설정)"}</dd>
          <dt className="text-dim">이메일</dt>
          <dd className="break-all text-ink">{user.email}</dd>
          <dt className="text-dim">권한</dt>
          <dd className="text-ink">{ROLE_LABEL[user.role] ?? user.role}</dd>
          <dt className="text-dim">가입일</dt>
          <dd className="text-ink">{formatDate(user.createdAt)}</dd>
        </dl>
        <p className="text-[11.5px] text-dim">닉네임, 비밀번호 변경은 곧 추가됩니다.</p>
      </Card>

      <ThemeToggle />

      <PushToggle initialCount={pushCount} />
    </Page>
  );
}
