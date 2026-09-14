/* gamearound Service Worker — 웹푸시 수신 전용(§7). 오프라인 캐시는 홈 셸 최소만. */
// 이름 문자열은 src/lib/site.ts 의 SITE.name 과 맞춘다 (SW 는 번들 밖이라 import 불가).
const SITE_NAME = "gamearound";
const CACHE_NAME = `${SITE_NAME}-shell-v1`;
const SHELL_URLS = ["/"];

self.addEventListener("install", (event) => {
  // 즉시 활성화. 홈 셸은 실패해도 설치를 막지 않음
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 네트워크 우선. 오프라인이고 내비게이션 요청이면 홈 셸로 폴백
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/").then((r) => r || Response.error())));
});

// 푸시 payload: { title, body, icon?, url? }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: SITE_NAME, body: event.data ? event.data.text() : "" };
  }
  const title = data.title || `${SITE_NAME} 할인 알림`;
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 클릭 시 해당 URL 탭이 열려 있으면 포커스, 아니면 새 창
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
