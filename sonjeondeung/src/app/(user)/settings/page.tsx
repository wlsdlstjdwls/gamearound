// /settings — 계정 정보, 푸시 알림 토글, 알림 동작 안내 (§7, §10)
import type { Metadata } from "next";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countPushSubscriptions } from "@/server/services/push";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PushToggle } from "@/components/push-toggle";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const pushCount = await countPushSubscriptions(user.id);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">설정</h1>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">계정</h2>
          <SignOutButton />
        </div>
        <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
          <dt className="text-slate-400">닉네임</dt>
          <dd>{user.displayName ?? "(미설정)"}</dd>
          <dt className="text-slate-400">이메일</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="text-slate-400">권한</dt>
          <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
          <dt className="text-slate-400">가입일</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-500">닉네임·비밀번호 변경은 곧 추가됩니다.</p>
      </div>

      <PushToggle initialCount={pushCount} />

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <h2 className="font-semibold">알림 동작 안내</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          <li>가격 수집은 4시간 간격이며 정확한 시각을 보장하지 않습니다.</li>
          <li>알림은 할인율이 설정한 조건 이상이고 직전 수집보다 가격이 내려갔을 때 한 번만 발송됩니다.</li>
          <li>구독이 만료된 기기(브라우저 데이터 삭제 등)는 자동으로 정리되며, 다시 켜면 됩니다.</li>
        </ul>
      </div>
    </section>
  );
}
