// Puente TuttoFit ⇄ Strava (Cloudflare Worker)
// Guarda tu acceso a Strava fuera de la app y devuelve tus actividades a la app.
// Variables (Settings → Variables and Secrets):
//   STRAVA_CLIENT_ID      (texto)
//   STRAVA_CLIENT_SECRET  (secreto)
//   STRAVA_REFRESH_TOKEN  (secreto, el que obtienes en la guía)
//   APP_KEY               (secreto, una clave larga que inventas; la pegas también en la app)
//   ALLOW_ORIGIN          (texto, opcional; por defecto https://jorgetodo.github.io)
// Enlace KV opcional (recomendado): TOKENS, para guardar el refresh token cuando Strava lo renueva.

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || 'https://jorgetodo.github.io',
      'Access-Control-Allow-Headers': 'X-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!env.APP_KEY || req.headers.get('X-Key') !== env.APP_KEY) return new Response('forbidden', { status: 403, headers: cors });
    const url = new URL(req.url);
    if (url.pathname !== '/activities') return new Response('not found', { status: 404, headers: cors });

    const refresh = (env.TOKENS && (await env.TOKENS.get('refresh_token'))) || env.STRAVA_REFRESH_TOKEN;
    const tok = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: refresh }),
    }).then(r => r.json());
    if (!tok.access_token) return new Response('token error', { status: 502, headers: cors });
    if (env.TOKENS && tok.refresh_token && tok.refresh_token !== refresh) await env.TOKENS.put('refresh_token', tok.refresh_token);

    const after = url.searchParams.get('after') || '0';
    const out = [];
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { Authorization: 'Bearer ' + tok.access_token } });
      if (!r.ok) break;
      const list = await r.json();
      if (!list.length) break;
      for (const a of list) out.push({
        date: String(a.start_date_local || '').slice(0, 10),
        type: a.sport_type || a.type,
        name: a.name,
        km: (a.distance || 0) / 1000,
        min: (a.moving_time || 0) / 60,
        hr: a.average_heartrate || null,
      });
    }
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  },
};
