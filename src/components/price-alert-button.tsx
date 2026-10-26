"use client";
// 가격 알림 버튼 + 설정 팝업(기획서 v2.0 M-02, 6.3). 상세 화면(S-05)에서 연다.
//   - 알림 받을 플랫폼을 고른다(여러 개, 칸마다 지금 가격). 하나도 안 고르면 저장이 꺼진다.
//   - 받는 방법은 웹 알림과 이메일 중 하나.
//   - 저장하면 토스트, 가격 알림 목록(/alerts)에 반영된다. 비로그인이면 로그인 팝업 뒤 이 팝업이 이어서 열린다.
// 목표가, 할인율 같은 세밀한 조건은 알림 화면의 폼이 맡는다 — 팝업은 "내려가면 알려 줘" 한 가지다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { Button, buttonClass } from "@/components/ui/button";
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

export function PriceAlertButton({ gameId, gameSlug, options, className }: { gameId: string; gameSlug: string; options: AlertPlatformOption[]; className?: string }) {
  const gate = useLoginGate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Platform[]>([]);
  const [channel, setChannel] = useState<Channel>("web");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const action = `alert:${gameId}`;
  const all = options.map((o) => o.platform);

  // 열 때 이미 걸린 알림을 읽어 칸을 채운다. 없으면 전부 고른 채로 연다 — 대개 "어디서든 싸지면" 이다
  const openPopup = async () => {
    setError(null);
    setPicked(all);
    setChannel("web");
    setOpen(true);
    const current = await getGameAlertAction(gameId, all);
    if (current) {
      setPicked(current.platforms);
      setChannel(current.channel);
    }
  };
  useResume(action, () => void openPopup());

  const toggle = (p: Platform) => setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const save = () =>
    startSave(async () => {
      const r = await saveGameAlertAction({ gameId, platforms: picked, channel });
      if (!r?.ok) return setError(r && !r.ok ? r.error : M.failed);
      setOpen(false);
      toast(M.saved);
    });

  return (
    <>
      <button type="button" onClick={() => gate(action, () => void openPopup())} className={buttonClass({ variant: "accent", size: "lg", className })}>
        {M.cta}
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
                  <input type="radio" name="alert-channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="sr-only" />
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
