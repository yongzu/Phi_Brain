// Public client-side config (온라인 전환). Nothing here is secret: a Google OAuth
// client id is visible in every Google sign-in URL, and the API is locked to
// one account on the server side (worker/src/auth.js).
window.PHI_BRAIN_CONFIG = {
  apiBase: 'https://api.phibrain.workers.dev',
  googleClientId: "194798721220-a7sh03f02iam7tgh2p8gvn9qgqbfqt75.apps.googleusercontent.com",
};
