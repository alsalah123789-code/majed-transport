/* عامل الخدمة — يجعل التطبيق يعمل بلا إنترنت */
const V = 'majed-v25';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // قاعدة البيانات ومكتباتها: الشبكة فقط — لا تُخزَّن إجابات حسابية أبداً
  if (url.hostname.endsWith('supabase.co')) return;

  // ملفات التطبيق نفسه: من الذاكرة أولاً ثم تحديث صامت في الخلفية
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) caches.open(V).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // خطوط ومكتبات خارجية: من الذاكرة إن وُجدت وإلا الشبكة مع تخزين
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) caches.open(V).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => hit)));
});
