const CLOUD_URL = (process.env.CLOUD_URL || 'https://us-central1-mmpns-9bdde.cloudfunctions.net/api').replace(/\/$/, '');
// JWT expires in 7 days; refresh after 6 days to stay safe
const TOKEN_TTL_MS = 6 * 24 * 60 * 60 * 1000;

let cachedToken = null;
let tokenFetchedAt = null;

const login = async () => {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;

  if (!username || !password) {
    throw new Error('ADMIN_USER and ADMIN_PASS must be set in .env');
  }

  const res = await fetch(`${CLOUD_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Cloud login failed: ${data.error || res.statusText}`);
  }

  cachedToken = data.token;
  tokenFetchedAt = Date.now();
  console.log('[auth] Logged in to cloud successfully');
  return cachedToken;
};

const getToken = async () => {
  const expired = !tokenFetchedAt || (Date.now() - tokenFetchedAt) > TOKEN_TTL_MS;
  if (!cachedToken || expired) {
    await login();
  }
  return cachedToken;
};

const cloudFetch = async (path, options = {}) => {
  const token = await getToken();
  const url = `${CLOUD_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Cloud request failed (${res.status}): ${json?.error || res.statusText}`);
  }
  return json;
};

// Schedule automatic token refresh
const startTokenRefreshTimer = () => {
  setInterval(async () => {
    try {
      await login();
    } catch (err) {
      console.error('[auth] Token refresh failed:', err.message);
    }
  }, TOKEN_TTL_MS);
};

module.exports = { getToken, cloudFetch, startTokenRefreshTimer };
