"use client";
// 로그인 팝업(M-01)과 이어하기(기획서 v2.0 4.2, 6.2).
// 찜, 가격 알림, 글쓰기, 댓글, 좋아요, 저장처럼 로그인이 필요한 버튼은 gate("동작 이름", 실행) 로 감싼다.
//   - 로그인돼 있으면 바로 실행한다.
//   - 아니면 동작 이름을 메모하고(lib/auth/resume) 이 팝업을 연다. 로그인이 끝나면 페이지가 다시 열리고,
//     같은 이름의 버튼이 useResume 으로 메모를 꺼내 누르던 동작을 그대로 실행한다.
// 예전에는 로그인 화면으로 넘겼다. 그러면 보던 화면을 떠나고, 돌아와서 같은 버튼을 다시 눌러야 했다.
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/components/auth/session-provider";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Sheet } from "@/components/ui/sheet";
import { LOGIN_GATE_MESSAGES as M } from "@/lib/auth/messages";
import { rememberAction, takeAction } from "@/lib/auth/resume";

type Gate = (action: string, run: () => void) => void;
const GateContext = createContext<{ gate: Gate } | null>(null);

/** 로그인 뒤 돌아올 주소 = 지금 화면 그대로(주소 조건까지) */
function useHere(): string {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function GateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const here = useHere();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={M.title}>
      <div className="flex flex-col gap-5 pb-2 sm:w-[380px]">
        <p className="text-[14px] leading-[1.7] text-mut">{M.lead}</p>
        {/* 열 때만 그린다 — 닫혀 있는 동안 폼이 DOM 에 있으면 autoFocus 가 화면 뒤 칸으로 포커스를 끌어간다 */}
        {/* 계정 등록 링크는 폼이 이미 갖고 있다(아직 계정이 없나요?) — 여기서 한 줄 더 세우면 같은 말이 두 번 선다 */}
        {open && <SignInForm next={here} />}
      </div>
    </Sheet>
  );
}

export function LoginGateProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const gate = useCallback<Gate>(
    (action, run) => {
      if (user) return run();
      rememberAction(action);
      setOpen(true);
    },
    [user],
  );
  return (
    <GateContext.Provider value={{ gate }}>
      {children}
      {/* 돌아올 주소에 useSearchParams 를 쓰므로 Suspense 경계가 필요하다(정적 프리렌더) */}
      <Suspense fallback={null}>
        <GateDialog open={open} onOpenChange={setOpen} />
      </Suspense>
    </GateContext.Provider>
  );
}

/** 공급자 밖에서는 그냥 실행한다 — 서버 액션이 로그인 여부를 다시 확인하고 실패를 돌려준다 */
export function useLoginGate(): Gate {
  const ctx = useContext(GateContext);
  return ctx?.gate ?? ((_action, run) => run());
}

/**
 * 로그인 뒤 다시 열린 화면에서 누르던 동작을 실행한다. 세션을 확인한 뒤 한 번만 돈다.
 * ready 는 "실행해도 되는 상태"(예: 찜 여부를 읽어 온 뒤)다 — 그 전에 돌면 이미 찜한 게임을 풀어 버린다.
 */
export function useResume(action: string, run: () => void, ready = true): void {
  const { user, status } = useSession();
  const done = useRef(false);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (done.current || status !== "ready" || !user || !ready) return;
    done.current = true;
    if (takeAction(action)) runRef.current();
  }, [action, user, status, ready]);
}
