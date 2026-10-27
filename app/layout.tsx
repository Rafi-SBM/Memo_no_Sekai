import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { DM_Mono, DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { defaultAccent } from "../lib/memo";

/**
 * Fonts are self-hosted at build time rather than fetched from a font CDN, so
 * there is no third-party request on first paint and no origin to allow in the
 * content security policy.
 */
const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const display = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const title = "Memo no Sekai";
const description =
  "A quiet, local-first notebook. Capture a thought in a keystroke, find it again with structured search, and keep the private ones encrypted on your own device.";

export const metadata: Metadata = {
  // Lets Open Graph and canonical URLs resolve on whichever host serves the app.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      : undefined,
  title: { default: title, template: `%s · ${title}` },
  description,
  applicationName: title,
  keywords: ["notes", "notebook", "markdown", "local-first", "offline", "encrypted notes"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/app.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: { capable: true, title, statusBarStyle: "default" },
  openGraph: { type: "website", siteName: title, title, description },
  twitter: { card: "summary_large_image", title, description },
  // Memo text is private; keep the app itself indexable but nothing beyond it.
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The editor is full height, so the visual viewport must not be resized away.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1c211e" },
  ],
};

/**
 * Applies the saved theme before the first paint.
 *
 * Without this the page renders in light mode and then flips, because the
 * preference only becomes readable once React has hydrated.
 */
const themeBootstrap = `(function(){try{var s=localStorage;var t=s.getItem("memo-theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.dataset.theme=t==="dark"||(!t&&m)?"dark":"light";var a=s.getItem("memo-accent")||"${defaultAccent}";r.style.setProperty("--accent",a);r.style.setProperty("--accent-deep",a);r.dataset.density=s.getItem("memo-density")==="compact"?"compact":"comfortable";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The nonce is issued per request by middleware.ts so the inline theme script
  // can run under a content security policy that forbids inline script.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      data-theme="light"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
