// /settings — 계정 정보, 푸시 알림 토글 (§7, §10)
// 알림 동작 안내를 여기 두지 않는 이유: 같은 문구가 /alerts 아래에도 있어 두 번 읽히고,
// 설정 화면에서 할 일은 "켜고 끄는 것" 이라 규칙 설명은 알림 목록 쪽이 제자리다.
//
// 2026-09-21 리디자인: 마디마다 흰 판을 세우던 것을 걷었다. 설정은 마디가 넷인데 판이 넷이면
// 화면이 상자 목록으로 읽히고, 정작 "지금 어떤 값인가" 는 상자 안에서 작게 적힌다.
// 지금은 마디 제목(18px)과 그 아래 헤어라인 표가 전부다.
//
// 개인화 마디(온보딩 5회차): 온보딩 intro 가 "받은 값은 설정에서 언제든 보고 지울 수 있어요" 라고
// 약속했다. 그 약속을 지키는 자리다. 칸마다 고치는 링크와 그 이유는 components/settings/personalization-section 에 있다.
// 온보딩을 안 보는 계정(관리자 등)에게는 마디를 그리지 않는다 — 누르면 온보딩 레이아웃이 홈으로 돌려보낸다.
//
// 2026-10-27 다시 판으로(사용자: "설정 화면도 보기 쉽게 UI 개선"). 헤어라인 표 넷이 한 기둥에 이어져 어디서 마디가 갈리는지 안 보였다.
// 넓은 화면은 두 기둥이다 — 왼쪽에 나(프로필 판, 따라 내려온다), 오른쪽에 바꿀 수 있는 것(개인화, 알림, 화면)이 판 한 장씩 차례로 떠오른다.
import type { Metadata } from "next";
import { PushToggle } from "@/components/push-toggle";
import { WishSaleToggle } from "@/components/alerts/wish-sale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PersonalizationSection } from "@/components/settings/personalization-section";
import { Page, PageHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { stagger } from "@/lib/motion";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { countMyPushSubscriptions } from "@/server/services/push";
import { canPersonalize, getMyProfile, listGenreChoices, listSubscriptionChoices } from "@/server/services/profiles";

export const metadata: Metadata = { title: "설정" };

/** 오른쪽 기둥의 판 한 장. 안의 마디(개인화, 푸시, 테마)가 제 제목을 갖고 있어 판은 면과 여백만 준다 */
const CARD = "enter-item rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)] sm:p-6";

/** 프로필 판의 값 한 줄 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[12.5px] text-dim">{label}</dt>
      <dd className="break-all text-right text-[13px] font-semibold text-ink">{value}</dd>
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
    <Page gap={20}>
      <PageHead title="설정" />

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 나 — 프로필 판. 넓은 화면에서는 오른쪽을 읽는 동안 따라 내려온다 */}
        <section aria-label="계정" className="enter-item flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)] lg:sticky lg:top-[calc(var(--header-h)+16px)]" style={stagger(0)}>
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-acc-soft text-[22px] font-extrabold text-acc">
              {(user.displayName ?? user.email).slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[18px] font-extrabold tracking-[-0.03em] text-ink">{user.displayName ?? "(미설정)"}</p>
              <p className="truncate text-[12.5px] text-mut">{user.email}</p>
            </div>
          </div>
          <dl className="flex flex-col divide-y divide-line-soft border-y border-line-soft">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-[12.5px] text-dim">권한</dt>
              <dd>
                <Tag>{ROLE_LABEL[user.role] ?? user.role}</Tag>
              </dd>
            </div>
            <Row label="가입일" value={formatDate(user.createdAt)} />
          </dl>
          <SignOutButton />
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          {canPersonalize(user.role) && (
            <div className={CARD} style={stagger(1)}>
              <PersonalizationSection profile={profile} names={{ genres, subscriptions }} />
            </div>
          )}
          <div className={CARD} style={stagger(2)}>
            <PushToggle initialCount={pushCount} />
            {/* 무엇을 받을지(찜 할인)는 어디로 받을지(푸시) 바로 밑이다 — 같은 판에 두어야 "켰는데 왜 안 오지" 를 한자리에서 푼다 */}
            <WishSaleToggle initialOn={user.wishSaleAlertsOffAt === null} className="mt-4" />
          </div>
          <div className={CARD} style={stagger(3)}>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Page>
  );
}
