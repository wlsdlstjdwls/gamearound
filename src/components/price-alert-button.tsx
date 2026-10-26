"use client";
// 가격 알림 버튼 + 설정 팝업(기획서 v2.0 M-02, 6.3). 상세 화면(S-05)에서 연다.
//   - 알림 받을 플랫폼을 고른다(여러 개, 칸마다 지금 가격). 하나도 안 고르면 저장이 꺼진다.
//   - 받는 방법은 웹 알림과 이메일 중 하나.
//   - 저장하면 토스트, 가격 알림 목록(/alerts)에 반영된다. 비로그인이면 로그인 팝업 뒤 이 팝업이 이어서 열린다.
// 목표가, 할인율 같은 세밀한 조건은 알림 화면의 폼이 맡는다 — 팝업은 "내려가면 알려 줘" 한 가지다.
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { Button, buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { getGameAlertAction, saveGameAlertAction } from "@/app/(user)/alerts/actions";
import { PRICE_ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { Currency, Platform } from "@/server/db/schema";

export type AlertPlatformOption = { platform: Platform; currentPrice: number | null; currency: Currency };
type Channel = "web" | "email";

/**
 * label, variant, size 는 같은 팝업을 다른 자리에서 열 때 쓴다(2026-10-26 상세 개편) — 할인 예측의 "알림 설정하기",
 * 출시 예정 카드의 "출시 알림 받기" 가 모두 이 팝업(M-02)이다. 팝업을 따로 만들면 저장 규칙이 둘로 갈린다.
 */
export function PriceAlertButton({
  gameId,
  gameSlug,
  options,
  className,
  label = M.cta,
  variant = "accent",
  size = "lg",
  slot,
}: {
  gameId: string;
  gameSlug: string;
  options: AlertPlatformOption[];
  className?: string;
  label?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 한 화면에 이 버튼이 여럿일 때 로그인 뒤 "누른 그 버튼" 의 팝업만 이어 열리게 가르는 꼬리표 */
  slot?: string;
}) {
  const gate = useLoginGate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Platform[]>([]);
  const [channel, setChannel] = useState<Channel>("web");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const action = slot ? `alert:${gameId}:${slot}` : `alert:${gameId}`;
  const all = options.map((o) => o.platform);
  /** 팝업을 연 뒤 사람이 칸을 건드렸는가 — 그 뒤에 도착한 기존 알림 값이 고른 것을 덮지 않게 한다 */
  const touched = useRef(false);

  // 새 알림이면 아무것도 고르지 않은 채로 연다(목업 M-02). 전에는 전부 고른 채로 열었는데, 그러면 저장만 눌러도
  // 사람이 고르지 않은 플랫폼까지 알림이 걸린다. 이미 걸린 알림이 있으면 그 값으로 채운다
  const openPopup = async () => {
    touched.current = false;
    setError(null);
    setPicked([]);
    setChannel("web");
    setOpen(true);
    const current = await getGameAlertAction(gameId, all);
    if (current && !touched.current) {
      setPicked(current.platforms);
      setChannel(current.channel);
    }
  };
  useResume(action, () => void openPopup());

  const toggle = (p: Platform) => {
    touched.current = true;
    setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };
  const save = () =>
    startSave(async () => {
      const r = await saveGameAlertAction({ gameId, platforms: picked, channel });
      if (!r?.ok) return setError(r && !r.ok ? r.error : M.failed);
      setOpen(false);
      toast(M.saved);
    });

  return (
    <>
      <button type="button" onClick={() => gate(action, () => void openPopup())} className={buttonClass({ variant, size, className })}>
        {label}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={M.title}>
        <div className="flex flex-col gap-5 sm:w-[400px]">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold text-ink">{M.platformsLegend}</legend>
            {options.map((o) => (
              <Checkbox
                key={o.platform}
                checked={picked.includes(o.platform)}
                onChange={() => toggle(o.platform)}
                className={cn("min-h-[var(--touch-target)] items-center rounded-xl px-3.5 shadow-hair transition-colors [&>span:last-child]:flex [&>span:last-child]:flex-1 [&>span:last-child]:items-center", picked.includes(o.platform) ? "bg-acc-soft" : "bg-surface-2")}
              >
                <span className="flex-1 text-[14px] font-semibold text-ink">{PLATFORM_LABEL[o.platform] ?? o.platform}</span>
                <span className="text-[13.5px] tabular-nums text-mut">{o.currentPrice === null ? M.noPrice : formatPrice(o.currentPrice, o.currency)}</span>
              </Checkbox>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold text-ink">{M.channelLegend}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["web", "email"] as const).map((c) => (
                <label key={c} className={cn("flex min-h-[var(--touch-target)] cursor-pointer items-center justify-center rounded-xl text-[14px] font-semibold shadow-hair transition-colors", channel === c ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink-2")}>
                  <input type="radio" name="alert-channel" value={c} checked={channel === c} onChange={() => {
                      touched.current = true;
                      setChannel(c);
                    }} className="sr-only" />
                  {M.channel[c]}
                </label>
              ))}
            </div>
            {channel === "email" && <p className="text-[12.5px] leading-[1.6] text-dim">{M.emailNote}</p>}
          </fieldset>
          {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
          <div className="flex flex-col gap-2">
            <Button size="lg" fullWidth disabled={picked.length === 0} loading={saving} onClick={save}>
              {M.save}
            </Button>
            <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(gameSlug)}`} className="py-2 text-center text-[13px] text-mut hover:text-ink">
              {M.advanced}
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
