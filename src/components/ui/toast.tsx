"use client";
// 토스트 — 하단 가운데 브랜드색 알약, 짧은 안내 한 줄(기획서 v2.0 4.3: 찜, 등록, 프로필 변경 등).
// 화면 어디서든 useToast()("찜 목록에 담았어요") 한 줄로 띄운다. 공급자는 루트 레이아웃에 한 번 선다.
//
// 한 번에 하나만 보인다 — 연달아 누르면 앞 문구를 갈아 끼운다. 쌓아 올리면 같은 말이 겹쳐 세 줄이 된다.
// 낭독기에는 role="status"(aria-live polite)가 같은 말을 한다.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** 떠 있는 시간. 한국어 한 줄(15자 안팎)을 두 번 읽을 수 있는 길이 — 더 길면 다음 동작을 가린다 */
const TOAST_VISIBLE_MS = 2400;

type Toast = { id: number; text: string };
const ToastContext = createContext<((text: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string) => {
    seq.current += 1;
    setToast({ id: seq.current, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), TOAST_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
        {toast && (
          // key 로 문구마다 새로 세워 등장 애니메이션이 다시 돈다
          <p key={toast.id} className="animate-rise rounded-full bg-acc px-5 py-2.5 text-[14px] font-semibold text-on-ink shadow-3">
            {toast.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** 공급자 밖(관리자 셸 등)에서 불려도 깨지지 않는다 — 그때는 아무 일도 안 한다 */
export function useToast(): (text: string) => void {
  return useContext(ToastContext) ?? noop;
}

function noop() {}
