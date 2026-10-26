"use client";
// 글쓰기 단추(기획서 v2.0 4.2, S-14). 비로그인으로 누르면 로그인 화면으로 넘기지 않고 로그인 팝업(M-01)을 띄운 뒤,
// 로그인이 끝나 화면이 다시 열리면 그 글쓰기 화면으로 이어서 간다(components/auth/login-gate).
// 로그인 화면으로 넘기면 보던 게시판을 떠났다가 돌아와 같은 단추를 다시 눌러야 했다.
//
// 바탕은 평범한 링크다 — 자바스크립트가 붙기 전이나 공급자 밖에서는 글쓰기 주소로 그냥 가고,
// 그 화면의 (user) 레이아웃이 로그인을 다시 확인한다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { isPlainClick } from "@/components/ui/chip-nav";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

export function WriteLink({ href, children, variant = "primary", size = "md", className }: { href: string; children: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const router = useRouter();
  const gate = useLoginGate();
  // 동작 이름에 주소를 넣는다 — 리뷰 작성을 누르고 로그인했는데 홍보 작성 단추가 메모를 집으면 엉뚱한 칸이 열린다
  const action = `write:${href}`;
  const go = () => router.push(href);
  useResume(action, go);
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        gate(action, go);
      }}
      className={buttonClass({ variant, size, className })}
    >
      <PlusIcon size={16} />
      {children}
    </Link>
  );
}
