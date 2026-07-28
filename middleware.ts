import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route protection middleware.
// Currently a pass-through; extend here when RBAC and Supabase SSR are added.
// Protected routes will be enforced by checking the Supabase session cookie.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
