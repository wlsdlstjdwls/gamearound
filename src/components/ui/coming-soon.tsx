"use client";
// 준비 중 알림 — 아직 열지 않은 자리를 눌렀을 때 뜨는 판.
//
// **왜 빈 화면이나 글 한 줄이 아닌가**: 준비 중인 자리를 누르는 사람은 이미 그 일을 하러 온 사람이다.
// 아무 일도 안 일어나면 고장으로 읽고, 글자만 뜨면 "왜" 를 묻게 된다. 그래서 세 가지를 같은 자리에서 말한다 —
// 지금 상태(준비 중), 무엇이 되어 있고 무엇이 남았는지, 열리면 어디로 오면 되는지.
//
// 그림이 움직이는 이유: 멈춘 그림은 빈 화면과 구별되지 않는다. 물결이 퍼지고 톱니가 도는 것만으로
// "돌아가고 있다" 가 읽힌다. 톱니는 느리다(6초) — 빠르면 스피너로 읽히는데, 여기서 기다리는 건
// 사용자가 아니라 우리다. 키프레임과 시간은 globals.css 에 있다(임의 숫자 금지, AGENTS §6).
import { Sheet } from "@/components/ui/sheet";
import { buttonClass } from "@/components/ui/button";
import { COMING_SOON } from "@/lib/messages/coming-soon";

/** 물결 둘의 시작 어긋남(ms). 둘이 같이 나가면 물결 사이가 끊겨 심장박동처럼 보인다 */
const RIPPLE_DELAYS = [0, 1400];

/** 톱니. 스피너가 아니라 "만드는 중" 을 뜻하므로 이가 굵고 느리다 */
function GearIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden className="soon-gear">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 14.2a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 0 1-3.6 0v-.1a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4a1.8 1.8 0 0 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06a1.8 1.8 0 1 1 2.55-2.55l.06.06a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V4a1.8 1.8 0 0 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9H20a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 물결이 퍼지는 원판. 크기는 고정 112px — 시트 안에서 세로를 많이 먹지 않으면서 그림으로 읽히는 최소값 */
function SoonGraphic() {
  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center">
      {RIPPLE_DELAYS.map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="soon-ripple absolute inset-0 rounded-full bg-acc"
          style={{ "--stagger": `${delay}ms` } as React.CSSProperties}
        />
      ))}
      {/* 가운데 원은 물결과 다른 축으로만 움직인다 — 같은 축이면 둘이 한 덩어리로 커졌다 작아진다 */}
      <span className="soon-float relative flex size-[62px] items-center justify-center rounded-full bg-acc text-on-ink">
        <GearIcon />
      </span>
    </div>
  );
}

export interface ComingSoonProps {
  /** 시트 머리에 적을 이름. 누른 자리의 이름과 **같은 말**이어야 한다 */
  title: string;
  /** 굵게 서는 한 줄 — 무엇이 아직인지 */
  lead: string;
  /** 왜 아직인지, 열리면 어떻게 되는지 */
  body: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComingSoon({ title, lead, body, open, onOpenChange }: ComingSoonProps) {
  return (
    <Sheet title={title} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col items-center gap-5 px-2 pb-2 pt-5 text-center">
        <SoonGraphic />
        <div className="flex flex-col items-center gap-2.5">
          <span className="inline-flex items-center rounded-full bg-acc-soft px-3 py-1 text-[12px] font-bold tracking-[0.02em] text-acc">
            {COMING_SOON.badge}
          </span>
          <p className="text-[18px] font-bold leading-[1.45] tracking-[-0.025em] text-ink">{lead}</p>
          <p className="max-w-[400px] text-[13.5px] leading-[1.75] text-mut">{body}</p>
        </div>
        <button type="button" onClick={() => onOpenChange(false)} className={buttonClass({ variant: "secondary", className: "mt-1" })}>
          {COMING_SOON.close}
        </button>
      </div>
    </Sheet>
  );
}
