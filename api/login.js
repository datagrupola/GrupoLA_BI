const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas
const SESSION_COOKIE = 'bi_session';

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

async function sign(value, secret) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'POST',
        },
      });
    }

    const expectedPassword = process.env.BI_PASSWORD;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!expectedPassword || !sessionSecret) {
      console.error('Missing BI_PASSWORD or SESSION_SECRET');

      return new Response('Server configuration error', {
        status: 500,
      });
    }

    const formData = await request.formData();
    const submittedPassword = String(formData.get('password') ?? '');

    if (submittedPassword !== expectedPassword) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/login.html?error=1',
          'Cache-Control': 'no-store',
        },
      });
    }

    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

    const payload = textToBase64Url(
      JSON.stringify({
        exp: expiresAt,
      })
    );

    const signature = await sign(payload, sessionSecret);
    const token = `${payload}.${signature}`;

    const cookie = [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ].join('; ');

    return new Response(null, {
      status: 303,
      headers: {
        Location: '/',
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
      },
    });
  },
};