import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple API authentication middleware.
 * 
 * To enable authentication:
 * 1. Set the API_AUTH_TOKEN environment variable in Vercel Dashboard
 * 2. Use the same token value in the Settings page or localStorage key 'agent-reach-auth-token'
 * 
 * When API_AUTH_TOKEN is not set, all requests are allowed (development mode).
 */
export function middleware(request: NextRequest) {
  const authToken = process.env.API_AUTH_TOKEN;

  // If no auth token configured, skip auth (development mode)
  if (!authToken) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for auth token in header
  const providedToken =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (providedToken !== authToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Set API_AUTH_TOKEN environment variable.' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
