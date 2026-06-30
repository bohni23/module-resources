import webpush from 'web-push';

const TTL = 3 * 24 * 3600; // 3 days

function initWebPush(env) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export default {
  // Receives schedule updates from the PWA
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': 'https://bohni23.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')   return new Response('', { status: 405 });

    let body;
    try { body = await request.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    const { deviceId, subscription, peeMs, poopMs } = body;
    if (!deviceId || !subscription?.endpoint) return new Response('Bad request', { status: 400, headers: cors });

    await env.SCHEDULES.put(deviceId, JSON.stringify({ subscription, peeMs, poopMs }), { expirationTtl: TTL });
    return new Response('OK', { headers: cors });
  },

  // Runs every minute — sends any due notifications
  async scheduled(event, env) {
    initWebPush(env);
    const now = Date.now();
    const { keys } = await env.SCHEDULES.list();

    for (const { name: id } of keys) {
      const data = await env.SCHEDULES.get(id, 'json');
      if (!data?.subscription) continue;

      let updated = false;

      const notifs = [
        ['peeMs',  '🐾 Pee time soon!',  'Fulki will need to go in about 30 minutes'],
        ['poopMs', '💩 Poop time soon!', 'Fulki will need to go in about 30 minutes'],
      ];

      for (const [field, title, body] of notifs) {
        if (!data[field]) continue;
        // Fire if we're within 1 min early to 3 min late of the 30-min-before mark
        const delay = data[field] - 30 * 60000 - now;
        if (delay <= 60000 && delay > -3 * 60000) {
          try {
            await webpush.sendNotification(
              data.subscription,
              JSON.stringify({ title, body }),
              { TTL: 300 }
            );
          } catch (e) {
            // 410 Gone = subscription expired, remove it
            if (e.statusCode === 410) { await env.SCHEDULES.delete(id); break; }
          }
          data[field] = null;
          updated = true;
        }
      }

      if (updated) await env.SCHEDULES.put(id, JSON.stringify(data), { expirationTtl: TTL });
    }
  }
};
