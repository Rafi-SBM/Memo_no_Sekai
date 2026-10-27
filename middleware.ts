import { NextRequest, NextResponse } from "next/server";

/**
 * Issues a per-request content security policy.
 *
 * The memo preview renders Markdown the user wrote with `dangerouslySetInnerHTML`.
 * That path escapes its input, and this policy is the second line of defence: a
 * script that slipped through would still have no way to execute.
 *
 * Scripts are allowed only with the nonce minted here. `strict-dynamic` lets the
 * nonce-bearing framework bootstrap load the rest of the chunks, which is why no
 * host allowlist is needed. Next.js reads the nonce back out of this header and
 * stamps it onto the scripts it emits.
 */
export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    // Inline style attributes are used for accent colours and card tints.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // `data:` covers memo image embeds; `blob:` covers export downloads.
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  // Static assets are immutable and need no per-request policy.
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
