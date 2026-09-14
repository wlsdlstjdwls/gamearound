"use client";
// 웹푸시 구독 토글 (§7). SW 등록 → 권한 요청 → pushManager.subscribe → POST /api/push/subscribe
import { useEffect, useState } from "react";
import { cardClass } from "@/components/ui/page";

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIosNotStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !standalone;
}

async function detectInitialStatus(): Promise<{ status: Status; iosHint: boolean }> {
  const iosHint = isIosNotStandalone();
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { status: "unsupported", iosHint };
  }
  if (Notification.permission === "denied") return { status: "denied", iosHint };
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return { status: sub ? "subscribed" : "unsubscribed", iosHint };
  } catch {
    return { status: "unsubscribed", iosHint };
  }
}

export function PushToggle({ initialCount }: { initialCount: number }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iosHint, setIosHint] = useState(false);

  // 브라우저 지원 여부, 권한, 기존 구독을 비동기로 판정한 뒤 콜백에서 상태 반영 (외부 시스템 구독)
  useEffect(() => {
    let cancelled = false;
    detectInitialStatus().then((r) => {
      if (cancelled) return;
      setIosHint(r.iosHint);
      setStatus(r.status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error("서버에 VAPID 공개키가 설정되어 있지 않습니다");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        throw new Error("알림 권한이 허용되지 않았습니다");
      }
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `구독 저장 실패 (${res.status})`);
      }
      setStatus("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "구독에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "해제에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  const on = status === "subscribed";
  const disabled = busy || status === "checking" || status === "unsupported" || status === "denied";

  return (
    <section className={cardClass("flex flex-col gap-3 p-5")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-ink">웹푸시 알림</h2>
          <p className="text-[12.5px] text-mut">
            {status === "checking" && "상태 확인 중…"}
            {status === "unsupported" && "이 브라우저는 웹푸시를 지원하지 않습니다."}
            {status === "denied" && "브라우저에서 알림 권한이 차단되어 있습니다. 사이트 설정에서 허용한 뒤 다시 시도하세요."}
            {status === "subscribed" && "이 기기에서 할인 알림을 받고 있습니다."}
            {status === "unsubscribed" && "이 브라우저에서 할인 알림 받기"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="웹푸시 알림"
          disabled={disabled && !on}
          onClick={on ? unsubscribe : subscribe}
          className={`press flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-base disabled:opacity-60 ${
            on ? "bg-ink" : "bg-line-strong"
          }`}
        >
          <span
            aria-hidden
            className={`h-5 w-5 rounded-full bg-surface transition-transform duration-base ease-out-emph ${on ? "translate-x-[18px]" : ""}`}
          />
        </button>
      </div>

      <p className="rounded-[9px] bg-surface-4 px-3.5 py-[11px] text-[12.5px] text-mut">
        연결된 기기 {initialCount}대 | 다른 브라우저/기기에서도 각각 켜야 합니다.
      </p>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      {iosHint && (
        <p className="rounded-[9px] bg-warn-soft px-3.5 py-[11px] text-[12px] leading-[1.6] text-warn">
          iOS Safari는 공유 메뉴의 &ldquo;홈 화면에 추가&rdquo;로 설치한 뒤 홈 화면 아이콘으로 실행한 경우에만 웹푸시를 받을 수 있습니다.
        </p>
      )}
    </section>
  );
}
