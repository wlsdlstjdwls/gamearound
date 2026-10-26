"use client";
// 가격 알림 버튼 + 설정 팝업(기획서 v2.0 M-02, 6.3). 상세 화면(S-05)에서 연다.
//   - 알림 받을 플랫폼을 고른다(여러 개, 칸마다 지금 가격). 하나도 안 고르면 저장이 꺼진다.
//   - 받는 방법은 웹 알림과 이메일 중 하나.
//   - 저장하면 토스트, 가격 알림 목록(/alerts)에 반영된다. 비로그인이면 로그인 팝업 뒤 이 팝업이 이어서 열린다.
//   - 머리에 게임명과 "어떤 때 알려 주나" 한 줄, 바닥에 취소와 (걸린 알림이 있으면) 알림 삭제(목업 alm).
//     출시 예정 게임의 "출시 알림 받기" 로 열면(kind="release") 제목과 안내가 출시 쪽 말로 바뀌고 가격 칸을 숨긴다 —
//     아직 팔지 않는 값을 적으면 "지금 그 값에 판다" 로 읽힌다.
// 목표가, 할인율 같은 세밀한 조건은 알림 화면의 폼이 맡는다 — 팝업은 "내려가면 알려 줘" 한 가지다.
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { Button, buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { deleteAlertAction, getGameAlertAction, saveGameAlertAction } from "@/app/(user)/alerts/actions";
import { PRICE_ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { Currency, Platform } from "@/server/db/schema";

export type AlertPlatformOption = { platform: Platform; currentPrice: number | null; currency: Currency };
type Channel = "web" | "email";
/** 팝업이 무슨 알림을 거는가. 저장 규칙은 같고 말만 다르다 */
export type AlertKind = keyof typeof M.title;

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
  kind = "price",
  gameTitle,
}: {
  gameId: string;
  gameSlug: string;
  /** 팝업 머리에 적을 게임명. 안 주면 안내 한 줄만 선다 */
  gameTitle?: string;
  kind?: AlertKind;
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
  /** 이 게임에 이미 걸린 알림 행. 비어 있으면 "알림 삭제" 를 세우지 않는다 */
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [, startRemove] = useTransition();
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
    setExistingIds([]);
    setOpen(true);
    const current = await getGameAlertAction(gameId, all);
    setExistingIds(current?.ids ?? []);
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
      toast(M.saved[kind]);
    });
  // 누른 순간 닫고 토스트부터 띄운다(AGENTS §6). 지우기는 행마다 기존 액션을 부른다 — 하나라도 실패하면
  // 팝업을 다시 열어 서버에 남은 그대로를 보여 주고 실패 문구를 단다(일부만 지워졌어도 남은 것이 칸에 선다)
  const remove = () => {
    const ids = existingIds;
    if (ids.length === 0) return;
    setOpen(false);
    toast(M.removed);
    startRemove(async () => {
      const results = await Promise.all(ids.map((id) => deleteAlertAction(id)));
      if (results.every((r) => r?.ok)) return;
      await openPopup();
      setError(M.removeFailed);
    });
  };

  return (
    <>
      <button type="button" onClick={() => gate(action, () => void openPopup())} className={buttonClass({ variant, size, className })}>
        {label}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={M.title[kind]}>
        <div className="flex flex-col gap-5 sm:w-[400px]">
          <p className="text-[13.5px] leading-[1.6] text-mut">
            {gameTitle && <b className="font-bold text-ink">{gameTitle} | </b>}
            {M.lead[kind]}
          </p>
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
                {kind === "price" && <span className="text-[13.5px] tabular-nums text-mut">{o.currentPrice === null ? M.noPrice : formatPrice(o.currentPrice, o.currency)}</span>}
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
            <div className="flex gap-2">
              {existingIds.length > 0 && (
                <Button size="lg" variant="danger" className="flex-1" onClick={remove}>
                  {M.remove}
                </Button>
              )}
              <Button size="lg" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                {M.cancel}
              </Button>
              <Button size="lg" className="flex-1" disabled={picked.length === 0} loading={saving} onClick={save}>
                {M.save}
              </Button>
            </div>
            <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(gameSlug)}`} className="py-2 text-center text-[13px] text-mut hover:text-ink">
              {M.advanced}
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
