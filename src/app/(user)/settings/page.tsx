// /settings — 계정 정보, 푸시 알림 토글 (§7, §10)
// 알림 동작 안내를 여기 두지 않는 이유: 같은 문구가 /alerts 아래에도 있어 두 번 읽히고,
// 설정 화면에서 할 일은 "켜고 끄는 것" 이라 규칙 설명은 알림 목록 쪽이 제자리다.
//
// 2026-09-21 리디자인: 마디마다 흰 판을 세우던 것을 걷었다. 설정은 마디가 넷인데 판이 넷이면
// 화면이 상자 목록으로 읽히고, 정작 "지금 어떤 값인가" 는 상자 안에서 작게 적힌다.
// 지금은 마디 제목(18px)과 그 아래 헤어라인 표가 전부다.
import type { Metadata } from "next";
import { PushToggle } from "@/components/push-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Page, PageHead, ROWS, SectionHead } from "@/components/ui/page";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countMyPushSubscriptions } from "@/server/services/push";

export const metadata: Metadata = { title: "설정" };

/** 값 한 줄 — 왼쪽은 이름, 오른쪽은 값. 표가 아니라 줄이라 라벨 폭을 고정하지 않는다 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-[13px]">
      <dt className="shrink-0 text-[13px] text-dim">{label}</dt>
      <dd className="break-all text-right text-[13.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  // 나란히 쏜다 — 줄을 세우면 Neon 왕복(us-east-1, 약 220ms)을 두 번 기다린다
  const [user, pushCount] = await Promise.all([requireUserOrRedirect(), countMyPushSubscriptions()]);

  return (
    <Page width="tight" gap={34}>
      <PageHead title="설정" />

      <section className="flex flex-col gap-3.5">
        <SectionHead title="계정" size="sub" action={<SignOutButton />} />
        <dl className={ROWS}>
          <Row label="닉네임" value={user.displayName ?? "(미설정)"} />
          <Row label="이메일" value={user.email} />
          <Row label="권한" value={ROLE_LABEL[user.role] ?? user.role} />
          <Row label="가입일" value={formatDate(user.createdAt)} />
        </dl>
        <p className="text-[11.5px] text-dim">닉네임, 비밀번호 변경은 곧 추가됩니다.</p>
      </section>

      <PushToggle initialCount={pushCount} />

      <ThemeToggle />
    </Page>
  );
}
