// 프로그램 이동 단추 — 한 관리 화면에서 다른 관리 화면(프로그램)으로 건너가는 자리(2026-10-30 사용자 "프로그램 이동 버튼 UI 공통화, 앞으로 이렇게").
// 백오피스 고객상세정보 맨 위 단추 줄(주문이력, 상담처리...)처럼 낱말은 **건너갈 화면 이름 그대로**다 — "~에서 고치기" 같은 설명을 붙이지 않는다.
// 이름은 ADMIN_NAV(메뉴와 같은 말)에서 가져온다. 바깥 사이트로 가는 링크(공개 화면, 스토어)는 프로그램이 아니라 여기 오지 않는다.
// 서버, 클라이언트 어디서나 쓰도록 "use client" 를 붙이지 않는다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ProgramLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(buttonClass({ variant: "secondary", size: "sm" }), "whitespace-nowrap", className)}>
      {children}
    </Link>
  );
}
