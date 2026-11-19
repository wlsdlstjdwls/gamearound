// 관리자 진입 인사의 틀(덮개 + 로고 + 문구 자리). 로그인 화면과 인사 화면이 같은 틀을 쓴다.
//
// 왜 둘이 같이 쓰나(2026-11-19 사용자 "그 사이사이에 계속 다른 화면이 나오거든"): 로그인이 성공하면 문서를 새로 연다.
// 그 사이 로그인 칸이 "들어가는 중" 칸으로 바뀌고, 빈 화면이 지나고, 인사 화면이 떴다 — 세 장면이 따로 보였다.
// 이제 로그인이 성공하는 순간 로그인 화면이 이 틀(로고 + 첫 문구)을 덮고, 새 문서의 인사 화면도 같은 자리, 같은 모양으로 시작한다.
// 그래서 문서가 바뀌어도 화면은 한 장면으로 이어진다. 위치가 한 칸이라도 어긋나면 튀어 보이니 두 화면 모두 이 틀만 쓴다.
import { BrandLockup } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { GREETING_MESSAGES as M } from "@/lib/admin/messages";

/** 워드마크 심볼 폭. 로그인 화면 로고(28)보다 크게 — 이 화면의 주인공이다 */
const LOCKUP_SIZE = 72;

export function GreetFrame({ backdrop, mark, className, children, ...rest }: { backdrop?: React.ReactNode; mark?: string; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("admin-greet fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-bg px-4 text-ink", className)} {...rest}>
      {backdrop}
      <div className="admin-greet-body relative flex flex-col items-center gap-6">
        <BrandLockup size={LOCKUP_SIZE} className={mark} />
        {/* 문구 자리는 높이를 고정하고 한 칸에 겹쳐 쌓는다 — 문구가 바뀔 때 로고가 위아래로 밀리지 않게 */}
        <div className="grid min-h-28 w-full max-w-xl justify-items-center text-center [&>*]:[grid-area:1/1]">{children}</div>
      </div>
    </div>
  );
}

/**
 * 늘 깔려 있는 숨은 덮개(루트 레이아웃). html 에 진입 인사 표시가 찍힌 문서에서만 드러난다(lib/admin/greeting 의 ADMIN_GREET_INIT_SCRIPT, globals.css).
 * 인사 화면(z 80)이 오면 그 밑에 깔리고 인사 화면이 표시를 지운다. 인사 화면이 끝내 안 오면(권한 없음 등) 스스로 옅어진다(globals.css)
 */
export function GreetCurtain() {
  return (
    <GreetFrame aria-hidden className="admin-greet-curtain z-[79]">
      <p className="text-[15px] text-mut">{M.phrases[0]}</p>
    </GreetFrame>
  );
}

/**
 * 로그인 화면이 성공 순간 덮는 첫 장면. 인사 화면(entry-greeting)의 첫 모습과 같다 — 로고 + 첫 문구.
 * 로고는 여기서만 커지며 들어오고, 새 문서의 인사 화면은 다 커진 이 모양에서 그대로 이어 받는다
 */
export function GreetIntro() {
  return (
    <GreetFrame mark="admin-greet-mark" aria-live="polite" role="status">
      <p className="animate-rise text-[15px] text-mut">{M.phrases[0]}</p>
    </GreetFrame>
  );
}
