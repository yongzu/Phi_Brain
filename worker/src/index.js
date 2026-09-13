// Phi Brain API (Cloudflare Worker). Step 1 of the online move: health check,
// sign-in and the login lock. Data endpoints are added in later steps and all
// sit behind requireSession().
import { verifyGoogleIdToken, googleKeys, signSession, verifySession, AuthError } from './auth.js';

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

async function requireSession(request, env) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m ? verifySession(env.SESSION_SECRET, m[1], { allowedEmail: env.ALLOWED_EMAIL }) : null;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const json = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
    });
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        await env.DB.prepare('SELECT 1').first();
        return json(200, { ok: true });
      }

      // exchange a Google ID token (from the sign-in button) for our session token
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const { credential } = await request.json().catch(() => ({}));
        if (!credential) return json(400, { error: 'missing_credential' });
        const { email } = await verifyGoogleIdToken(credential, {
          clientId: env.GOOGLE_CLIENT_ID, allowedEmail: env.ALLOWED_EMAIL, getKeys: googleKeys,
        });
        const { token, exp } = await signSession(env.SESSION_SECRET, { email });
        return json(200, { token, email, expiresAt: exp * 1000 });
      }

      // ---- everything below requires a valid session ----
      const session = await requireSession(request, env);
      if (!session) return json(401, { error: 'unauthorized' });

      if (url.pathname === '/api/me' && request.method === 'GET') return json(200, { email: session.email });

      return json(404, { error: 'not_found' });
    } catch (err) {
      if (err instanceof AuthError) return json(403, { error: err.reason });
      console.error(err);
      return json(500, { error: 'internal_error' });
    }
  },
};
