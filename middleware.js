import { next } from '@vercel/functions';

const SESSION_COOKIE = 'bi_session';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';

  for (const cookie of cookieHeader.split(';')) {
    const [key, ...valueParts] = cookie.trim().split('=');

    if (key === name) {
      return valueParts.join('=');
    }
  }

  return null;
}

function base64UrlToBytes(value) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded =
    normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function base64UrlToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function verifySession(token, secret) {
  try {
    const parts = token.split('.');

    if (parts.length !== 2) {
      return false;
    }

    const [payload, signature] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      encoder.encode(payload)
    );

    if (!validSignature) {
      return false;
    }

    const session = JSON.parse(base64UrlToText(payload));

    return (
      typeof session.exp === 'number' &&
      session.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    return new Response('Server configuration error', {
      status: 500,
    });
  }

  const token = getCookie(request, SESSION_COOKIE);

  if (!token || !(await verifySession(token, sessionSecret))) {
    const loginUrl = new URL('/login.html', request.url);

    return Response.redirect(loginUrl, 302);
  }

  return next();
}

export const config = {
  matcher: ['/', '/index.html'],
};
