import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // With DNI/PIN auth, session is managed client-side (localStorage).
  // Middleware only handles tenant domain resolution hints via headers.
  const response = NextResponse.next();

  // Pass the host to client components via a header
  const host = request.headers.get("host") || "";
  response.headers.set("x-tenant-host", host);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*\\.js).*)",
  ],
};
