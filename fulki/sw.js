const CACHE = 'fulki-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add(self.registration.scope + 'fulki.html'))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

const timers    = {};
const lastFired = {};
const ICON      = self.registration.scope + 'DSCF3047.JPG';

self.addEventListener('message', e => {
  const { type, data } = e.data || {};

  if (type === 'SCHEDULE_PREDICTIONS') {
    clearTimeout(timers.pee);
    clearTimeout(timers.poop);
    const now = Date.now();

    const schedule = (key, eventMs, title, body) => {
      if (!eventMs) return;
      const delay = eventMs - 30 * 60000 - now;
      if (delay < -2 * 60000 || delay > 8 * 3600000) return; // skip if >30min past or >8h away
      const fireAt = Math.max(0, delay);
      timers[key] = setTimeout(() => {
        if (lastFired[key] && Date.now() - lastFired[key] < 20 * 60000) return;
        lastFired[key] = Date.now();
        self.registration.showNotification(title, { body, icon: ICON, tag: key, renotify: true });
      }, fireAt);
    };

    schedule('pee',  data.peeMs,  '🐾 Pee time soon!',  'Fulki will need to go in about 30 minutes');
    schedule('poop', data.poopMs, '💩 Poop time soon!', 'Fulki will need to go in about 30 minutes');
  }

  if (type === 'SCHEDULE_PLAY') {
    clearTimeout(timers.play7);
    clearTimeout(timers.play15);
    const elapsed = (Date.now() - data.startTime) / 60000;
    const delay7  = Math.max(0, (7  - elapsed) * 60000);
    const delay15 = Math.max(0, (15 - elapsed) * 60000);

    if (delay7 > 1000) {
      timers.play7 = setTimeout(() => {
        self.registration.showNotification('🎾 Active Play — 7 min', {
          body: 'Time for a water break! 💧', icon: ICON, tag: 'play-7'
        });
      }, delay7);
    }

    timers.play15 = setTimeout(() => {
      self.registration.showNotification('🎾 Time to stop! 🛑', {
        body: "It's been 15 minutes — time to wind Fulki down", icon: ICON, tag: 'play-15'
      });
      self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'VIBRATE' })));
    }, delay15);
  }

  if (type === 'CANCEL_PLAY') {
    clearTimeout(timers.play7);
    clearTimeout(timers.play15);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('fulki') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(self.registration.scope + 'fulki.html');
    })
  );
});
