// /shops/join — 입점 신청 폼. 설계서 §11.
//
// (user) 무리 안에 있어 레이아웃이 로그인을 이미 검증한다. 가입은 하나로 유지하고
// 매장 소속은 가입 뒤에 붙는 관계다(설계서 §9) — 그래서 매장용 가입 화면을 따로 두지 않는다.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShopJoinForm } from "@/components/shops/join-form";
import { Page, PageHead } from "@/components/ui/page";
import { ROUTES } from "@/lib/routes";
import { SHOP_MESSAGES } from "@/lib/shops/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { findMyShop } from "@/server/services/shops";

export const metadata: Metadata = { title: SHOP_MESSAGES.joinTitle };

export default async function ShopJoinPage() {
  const user = await requireUserOrRedirect();
  const mine = await findMyShop(user.id);
  // 이미 낸 신청서가 있으면 폼이 아니라 상태 화면이 답이다. 고칠 수 있는 것은 반려된 신청서뿐이다
  const rejected = mine !== null && mine.status === "pending" && mine.statusReason !== null;
  if (mine && !rejected) redirect(ROUTES.shopsJoinStatus);

  return (
    <Page width="tight" gap={18}>
      <PageHead title={SHOP_MESSAGES.joinTitle} note={SHOP_MESSAGES.joinLead} />
      <ShopJoinForm current={mine} />
    </Page>
  );
}
