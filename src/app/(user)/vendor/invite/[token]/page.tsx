// /vendor/invite/[token] — 직원 초대 수락. 설계서 §9.
//
// 로그인은 (user) 레이아웃이 요구한다(가입 전이면 로그인 화면이 이 주소로 돌려보낸다).
// 받을 수 없는 초대(만료, 사용됨, 다른 계정)는 버튼을 세우지 않고 이유만 적는다 — 눌러 봐야 실패할 버튼을 두지 않는다.
// 판정은 액션이 다시 한다. 화면의 판정은 안내일 뿐이다.
import type { Metadata } from "next";
import { InviteAccept } from "@/components/shops/invite-accept";
import { FormMessage } from "@/components/ui/form-message";
import { Panel, Page, PageHead } from "@/components/ui/page";
import { VENDOR_MESSAGES } from "@/lib/shops/listing-messages";
import { STAFF_MESSAGES as M } from "@/lib/shops/staff-messages";
import { judgeInvite } from "@/lib/shops/staff-schemas";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { findInviteByToken, type ShopStaffRole } from "@/server/services/shops";

type Props = { params: Promise<{ token: string }> };

// 토큰이 주소에 있다 — 검색엔진이 긁어 갈 자리가 아니다
export const metadata: Metadata = { title: M.acceptTitle, robots: { index: false, follow: false } };

const ROLE_LABEL: Record<ShopStaffRole, string> = {
  owner: VENDOR_MESSAGES.roleOwner,
  manager: VENDOR_MESSAGES.roleManager,
  staff: VENDOR_MESSAGES.roleStaff,
};

const VERDICT_MESSAGE = {
  used: M.acceptUsed,
  expired: M.acceptExpired,
  mismatch: M.acceptMismatch,
} as const;

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const user = await requireUserOrRedirect();
  const invite = await findInviteByToken(token);

  if (!invite) {
    return (
      <Page width="tight" gap={16}>
        <PageHead title={M.acceptTitle} />
        <FormMessage tone="error">{M.acceptNotFound}</FormMessage>
      </Page>
    );
  }

  const verdict = judgeInvite(invite, user.email, new Date());

  return (
    <Page width="tight" gap={16}>
      <PageHead title={M.acceptTitle} note={M.acceptLead} />
      <Panel className="flex flex-col gap-3 px-4 py-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
          <dt className="text-dim">{M.acceptShop}</dt>
          <dd className="font-semibold text-ink">{invite.shopName}</dd>
          <dt className="text-dim">{M.acceptRole}</dt>
          <dd className="text-ink">{ROLE_LABEL[invite.role]}</dd>
          <dt className="text-dim">{M.acceptEmail}</dt>
          <dd className="text-ink">{invite.email}</dd>
        </dl>
        {verdict === "ok" ? <InviteAccept token={token} /> : <FormMessage tone="error">{VERDICT_MESSAGE[verdict]}</FormMessage>}
      </Panel>
    </Page>
  );
}
