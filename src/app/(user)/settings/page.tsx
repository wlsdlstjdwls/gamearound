// /settings — 계정 정보, 푸시 알림 토글, 알림 동작 안내 (§7, §10)
import type { Metadata } from "next";
import { PushToggle } from "@/components/push-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, Page } from "@/components/ui/page";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { ALERT_RULE_TEXT, COLLECT_SCHEDULE_TEXT } from "@/lib/freshness";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countPushSubscriptions } from "@/server/services/push";

export const metadata: Metadata = { title: "설정" };

const NOTICE_ITEMS = [
  COLLECT_SCHEDULE_TEXT,
  ALERT_RULE_TEXT,
  "구독이 만료된 기기(브라우저 데이터 삭제 등)는 자동으로 정리되며, 다시 켜면 됩니다.",
];

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const pushCount = await countPushSubscriptions(user.id);

  return (
    <Page width="tight" gap={18}>
      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">설정</h1>

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[14px] font-bold text-ink">계정</h2>
          <SignOutButton />
        </div>
        <dl className="grid grid-cols-[88px_1fr] gap-x-3.5 gap-y-[9px] text-[13px]">
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

      <PushToggle initialCount={pushCount} />

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-[14px] font-bold text-ink">알림 동작</h2>
        <ul className="list-disc pl-5 text-[12.5px] leading-[1.7] text-mut">
          {NOTICE_ITEMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
