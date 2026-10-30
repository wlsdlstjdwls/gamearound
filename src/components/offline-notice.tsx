"use client";
// 인터넷이 끊겼을 때의 알림 띠(2026-10-30, 사용자: "네트워크 장애도 이쁘게").
//
// 끊기면 눌러도 아무 일이 안 일어난다 — 단추가 고장 난 것으로 읽힌다. 화면을 갈아엎지 않고 바닥에 띠 하나만 띄운다:
// 이미 받아 둔 화면은 계속 읽을 수 있어서다. 다시 붙으면 "다시 연결됐어요" 를 잠깐 보여 주고 걷는다.
// 그림은 장애 판(ui/status-panel)과 같은 깜빡이는 손전등이다 — 같은 사고는 같은 얼굴이다.
// 서버 장애(DB 가 안 열림)는 여기 몫이 아니다. 그건 결과 자리의 DbUnavailable 이 말한다 — 이 띠는 브라우저가 아는 "내 쪽 회선" 만 본다.
import { useEffect, useState } from "react";
import { BrandSymbol } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { OFFLINE_MESSAGES as M } from "@/lib/messages";

/** "다시 연결됐어요" 를 보여 주는 시간. 읽을 만큼만 머문다 — 토스트(ui/toast)와 같은 결 */
const BACK_ONLINE_MS = 2600;

type State = "online" | "offline" | "back";

export function OfflineNotice() {
  const [state, setState] = useState<State>("online");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = () => {
      clearTimeout(timer);
      setState("offline");
    };
    const on = () => {
      setState((s) => (s === "offline" ? "back" : s));
      timer = setTimeout(() => setState("online"), BACK_ONLINE_MS);
    };
    if (!navigator.onLine) off();
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);
  if (state === "online") return null;
  const offline = state === "offline";
  return (
    <div role={offline ? "alert" : "status"} className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-bottom)] z-[60] flex justify-center px-4">
      <p
        className={cn(
          "animate-rise pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-2.5 pr-5 text-[13.5px] font-semibold shadow-3",
          offline ? "bg-ink text-on-ink" : "bg-acc text-on-ink",
        )}
      >
        <span aria-hidden className={cn("grid size-8 place-items-center rounded-full bg-surface", offline && "beam-flicker")}>
          <BrandSymbol size={20} />
        </span>
        <span className="flex flex-col leading-tight">
          {offline ? M.offline : M.back}
          {offline && <span className="text-[11.5px] font-medium opacity-75">{M.offlineHint}</span>}
        </span>
      </p>
    </div>
  );
}
