import { NextResponse } from 'next/server';

import { createSessionToken, sessionConfig } from '../../../lib/auth';

export async function POST(request) {
  const expectedPassword = process.env.BI_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!expectedPassword || !sessionSecret) {
    console.error('Missing BI_PASSWORD or SESSION_SECRET');
    return new Response('Server configuration error', { status: 500 });
  }

  const formData = await request.formData();
  const submittedPassword = String(formData.get('password') ?? '');

  if (submittedPassword !== expectedPassword) {
    return NextResponse.redirect(new URL('/login?error=1', request.url), 303);
  }

  const token = await createSessionToken(sessionSecret);
  const response = NextResponse.redirect(new URL('/', request.url), 303);

  response.cookies.set(sessionConfig.cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionConfig.ttlSeconds,
  });

  return response;
}
