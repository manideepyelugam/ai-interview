import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route protection is handled client-side via AuthProvider
// because Appwrite manages sessions with HttpOnly cookies
// that are not reliably detectable in Next.js proxy/middleware.

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Empty matcher = proxy won't run on any routes
  matcher: [],
};
