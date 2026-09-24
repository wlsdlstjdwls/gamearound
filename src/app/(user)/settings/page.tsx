// /settings — 계정 정보, 푸시 알림 토글 (§7, §10)
// 알림 동작 안내를 여기 두지 않는 이유: 같은 문구가 /alerts 아래에도 있어 두 번 읽히고,
// 설정 화면에서 할 일은 "켜고 끄는 것" 이라 규칙 설명은 알림 목록 쪽이 제자리다.
//
// 2026-09-21 리디자인: 마디마다 흰 판을 세우던 것을 걷었다. 설정은 마디가 넷인데 판이 넷이면
// 화면이 상자 목록으로 읽히고, 정작 "지금 어떤 값인가" 는 상자 안에서 작게 적힌다.
// 지금은 마디 제목(18px)과 그 아래 헤어라인 표가 전부다.
//
// 개인화 마디(온보딩 5회차): 온보딩 intro 가 "받은 값은 설정에서 언제든 보고 지울 수 있어요" 라고
// 약속했다. 그 약속을 지키는 자리다. 값 고치기는 이 화면에 폼을 새로 세우지 않고 온보딩 단계로 보낸다 —
// 질문과 카드가 이미 거기 있고, 두 벌을 두면 한쪽 선택지가 뒤처진다(단계 화면은 지금 값을 미리 골라 둔다).
// 온보딩을 안 보는 계정(관리자 등)에게는 마디를 그리지 않는다 — 누르면 온보딩 레이아웃이 홈으로 돌려보낸다.
import type { Metadata } from "next";
import Link from "next/link";
import { PushToggle } from "@/components/push-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PersonalizationOff } from "@/components/settings/personalization-off";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, ROWS, SectionHead } from "@/components/ui/page";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { summarizeProfile } from "@/lib/onboarding/summary";
import { ROUTES, welcomeStepPath } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countMyPushSubscriptions } from "@/server/services/push";
import { getMyProfile, isOnboardingAudience, isPersonalized, listGenreChoices, listSubscriptionChoices } from "@/server/services/profiles";

const M = ONBOARDING_MESSAGES.settings;

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
  // 나란히 쏜다 — 줄을 세우면 Neon 왕복(us-east-1, 약 220ms)을 그 수만큼 기다린다.
  // 개인화 마디를 안 그리는 계정도 취향을 같이 읽는다: 역할을 먼저 보고 다시 쏘면 왕복이 하나 는다
  const [user, pushCount, profile, genres, subscriptions] = await Promise.all([
    requireUserOrRedirect(),
    countMyPushSubscriptions(),
    getMyProfile(),
    listGenreChoices(),
    listSubscriptionChoices(),
  ]);

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

      {isOnboardingAudience(user.role) && <PersonalizationSection profile={profile} names={{ genres, subscriptions }} />}

      <PushToggle initialCount={pushCount} />

      <ThemeToggle />
    </Page>
  );
}

type Profile = Awaited<ReturnType<typeof getMyProfile>>;

/**
 * 개인화 마디. 상태가 셋이다 — 꺼짐, 켜졌지만 온보딩 중간, 마침.
 * 중간에 멈춘 사람에게 "다시 답하기" 로 첫 단계를 보내면 이미 답한 칸을 또 넘겨야 해서 재개 지점(/welcome)으로 보낸다.
 */
function PersonalizationSection({ profile, names }: { profile: Profile; names: Parameters<typeof summarizeProfile>[1] }) {
  if (!isPersonalized(profile)) {
    return (
      <section className="flex flex-col gap-3.5">
        <SectionHead title={M.sectionTitle} size="sub" />
        <p className="text-[13px] leading-[1.6] text-mut">{M.offNote}</p>
        <Link href={welcomeStepPath("intro")} className={buttonClass({ size: "sm", className: "self-start" })}>
          {M.start}
        </Link>
      </section>
    );
  }

  const rows = summarizeProfile(profile, names);
  const finished = profile.onboardingDoneAt !== null;
  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title={M.sectionTitle} size="sub" />
      {rows.length > 0 ? (
        <dl className={ROWS}>
          {rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </dl>
      ) : (
        <p className="text-[13px] leading-[1.6] text-mut">{M.emptyNote}</p>
      )}
      {rows.length > 0 && <p className="text-[11.5px] text-dim">{M.usedFor}</p>}
      <div className="flex flex-wrap items-start gap-2">
        <Link href={finished ? welcomeStepPath("platforms") : ROUTES.welcome} className={buttonClass({ size: "sm", variant: "secondary" })}>
          {finished ? M.redo : M.resume}
        </Link>
        <PersonalizationOff />
      </div>
    </section>
  );
}
