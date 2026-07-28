import { NextRequest, NextResponse } from "next/server";

const REALM = "Content Studio";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (/\/_next\/(static|image)\/|\/favicon\.ico$/.test(pathname)) return NextResponse.next();

  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  // No hash configured (e.g. local dev without setup) — allow through so
  // `npm run dev` works out of the box; production deploys must set it.
  if (!expectedHash) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) return unauthorized();

  const decoded = atob(header.slice(6));
  const separator = decoded.indexOf(":");
  if (separator === -1) return unauthorized();

  const password = decoded.slice(separator + 1);
  const actualHash = await sha256Hex(password);
  if (actualHash !== expectedHash) return unauthorized();

  return NextResponse.next();
}

// Matches every path including the bare basePath root — filtering of
// _next/static etc. happens inside the middleware function itself, since
// Next's basePath-aware matcher regex can't be trusted to match the root
// path exactly (verified: it excludes "/contentstudio" and "/contentstudio/").
export const config = {
  matcher: ["/:path*"],
};
