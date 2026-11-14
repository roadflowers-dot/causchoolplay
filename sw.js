// 앱 설치(홈 화면에 추가)를 위한 서비스 워커.
// 항상 인터넷에서 최신 파일을 먼저 받고, 인터넷이 끊겼을 때만 저장해 둔 파일을 씁니다.
const CACHE = "playground-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 이 사이트의 파일만 다룹니다. 로그인·데이터베이스 요청은 건드리지 않습니다.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/__/")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error()))
  );
});
