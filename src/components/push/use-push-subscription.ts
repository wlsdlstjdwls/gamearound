"use client";
// 웹푸시 구독 상태와 켜기, 끄기(§7). SW 등록 → 권한 요청 → pushManager.subscribe → POST /api/push/subscribe.
// 설정의 토글(push-toggle)과 온보딩 알림 단계가 같이 쓴다 — 권한, 구독 순서를 두 벌로 두면
// 한쪽만 고쳐지는 날이 온다(규약 §3).
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { PUSH_MESSAGES as M } from "@/lib/push/messages";

export type PushStatus = "checking" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

/** 서비스 워커 주소. public/sw.js 와 맞춘다 */
const SW_URL = "/sw.js";

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

async function detectInitialStatus(): Promise<{ status: PushStatus; iosHint: boolean }> {
  const iosHint = isIosNotStandalone();
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { status: "unsupported", iosHint };
  }
  if (Notification.permission === "denied") return { status: "denied", iosHint };
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    return { status: sub ? "subscribed" : "unsubscribed", iosHint };
  } catch {
    return { status: "unsubscribed", iosHint };
  }
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("checking");
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
      if (!vapid) throw new Error(M.error.noVapid);
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        throw new Error(M.error.permission);
      }
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));
      const json = sub.toJSON();
      const res = await fetch(ROUTES.apiPushSubscribe, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? M.error.save(res.status));
      }
      setStatus("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : M.error.subscribe);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(ROUTES.apiPushSubscribe, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : M.error.unsubscribe);
    } finally {
      setBusy(false);
    }
  }

  return { status, busy, error, iosHint, subscribe, unsubscribe };
}
