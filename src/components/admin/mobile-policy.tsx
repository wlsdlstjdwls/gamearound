"use client";
// 관리자 화면 휴대폰 정책을 화면 부품에 나르는 자리(2026-10-30). 표는 lib/admin/mobile, 기기 판정은 서버(server/device)가 레이아웃에서 한다.
// 부품은 useMobilePolicy().can("edit") 처럼 기능 이름만 묻는다 — 화면마다 "휴대폰인가 && 이 화면인가" 를 다시 조립하면
// 같은 질문에 답이 갈린다(fitin-bo 가 겪은 일, lib/admin/mobile 머리 주석).
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmptyNote } from "@/components/empty-state";
import { Button, buttonClass } from "@/components/ui/button";
import { ADMIN_MOBILE_MESSAGES as M } from "@/lib/admin/messages";
import { mobileCan, mobilePolicyOf, type MobileFeature, type MobilePolicy } from "@/lib/admin/mobile";
import { ROUTES } from "@/lib/routes";

const MobileContext = createContext(false);

export function AdminDeviceProvider({ mobile, children }: { mobile: boolean; children: React.ReactNode }) {
  return <MobileContext.Provider value={mobile}>{children}</MobileContext.Provider>;
}

export function useMobilePolicy(): { mobile: boolean; policy: MobilePolicy; can: (feature: MobileFeature) => boolean } {
  const mobile = useContext(MobileContext);
  const policy = mobilePolicyOf(usePathname());
  return { mobile, policy, can: (feature) => mobileCan(mobile, policy, feature) };
}

/** 휴대폰에서 닫은 화면이면 본문 대신 PC 안내를 세운다. 넓은 기기에서는 아무것도 하지 않는다 */
export function MobileGate({ children }: { children: React.ReactNode }) {
  const { mobile, policy } = useMobilePolicy();
  if (!mobile || policy.access !== "off") return children;
  return <MobileBlocked />;
}

function MobileBlocked() {
  const [note, setNote] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setNote(M.copied);
    } catch {
      setNote(M.copyFailed);
    }
  };
  return (
    <section className="flex flex-col gap-3 py-2">
      <EmptyNote title={M.blockedTitle}>{M.blockedBody}</EmptyNote>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" onClick={copy}>
          {M.copyUrl}
        </Button>
        <Link href={ROUTES.admin} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {M.toBoard}
        </Link>
        {note && (
          <p role="status" className="text-[12.5px] text-dim">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
