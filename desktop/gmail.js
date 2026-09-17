// Gmail consent stays in the system browser; only a result marker returns to the app.
const RESULTS = new Set(['connected', 'denied', 'scope_missing', 'no_refresh_token', 'error']);

function consentUrl(raw) {
  if (typeof raw !== 'string') throw new Error('Invalid Gmail consent URL');
  const u = new URL(raw);
  if (u.origin !== 'https://accounts.google.com' || u.username || u.password ||
      u.pathname !== '/o/oauth2/v2/auth' ||
      u.searchParams.get('redirect_uri') !== 'https://api.phibrain.workers.dev/auth/google/callback' ||
      u.searchParams.get('scope') !== 'https://www.googleapis.com/auth/gmail.readonly' ||
      u.searchParams.get('response_type') !== 'code' || !u.searchParams.get('state')) {
    throw new Error('Invalid Gmail consent URL');
  }
  return u.toString();
}

function returnPage(raw, appUrl) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'phibrain:' || u.hostname !== 'gmail' || u.username || u.password ||
        u.port || u.pathname || u.hash || [...u.searchParams.keys()].length !== 1 ||
        !RESULTS.has(u.searchParams.get('gmail'))) return null;
    const page = new URL(appUrl);
    page.searchParams.set('gmail', u.searchParams.get('gmail'));
    page.hash = 'assignment';
    return page.toString();
  } catch { return null; }
}

module.exports = { consentUrl, returnPage };
