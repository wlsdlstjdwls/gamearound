// /settings — 계정 정보, 푸시 알림 토글, 알림 동작 안내 (§7, §10)
import type { Metadata } from "next";
import { requireUser } from "@/server/services/users";
import { countPushSubscriptions } from "@/server/services/push";
import { PushToggle } from "@/components/push-toggle";

export const metadata: Metadata = { title: "설정" };

const ROLE_LABEL: Record<string, string> = { user: "일반", game_company: "게임업체", seller: "판매업체", admin: "관리자" };

export default async function SettingsPage() {
  const user = await requireUser();
  const pushCount = await countPushSubscriptions(user.id);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">설정</h1>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="font-semibold">계정</h2>
        <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
          <dt className="text-slate-400">표시 이름</dt>
          <dd>{user.displayName ?? "(미설정)"}</dd>
          <dt className="text-slate-400">권한</dt>
          <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
          <dt className="text-slate-400">가입일</dt>
          <dd>{user.createdAt.toLocaleDateString("ko-KR")}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-500">프로필·비밀번호·연결 계정은 상단 프로필 아이콘 → 계정 관리에서 변경할 수 있습니다.</p>
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
