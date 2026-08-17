import { NextResponse } from 'next/server';

import { sessionConfig, verifySessionToken } from './lib/auth';

export async function proxy(request) {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    return new Response('Server configuration error', { status: 500 });
  }

  const token = request.cookies.get(sessionConfig.cookieName)?.value;

  if (!token || !(await verifySessionToken(token, sessionSecret))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
};
