const SESSION_COOKIE = 'bi_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function bytesToBase64Url(bytes) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

async function sign(value, secret) {
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(secret) {
  const payload = textToBase64Url(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })
  );
  const signature = await sign(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(token, secret) {
  try {
    const parts = token.split('.');

    if (parts.length !== 2) {
      return false;
    }

    const [payload, signature] = parts;
    const key = await importHmacKey(secret, ['verify']);
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload)
    );

    if (!validSignature) {
      return false;
    }

    const session = JSON.parse(base64UrlToText(payload));

    return typeof session.exp === 'number' && session.exp > Date.now();
  } catch {
    return false;
  }
}

export const sessionConfig = {
  cookieName: SESSION_COOKIE,
  ttlSeconds: SESSION_TTL_SECONDS,
};
