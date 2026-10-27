import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memo no Sekai",
    short_name: "Memo",
    description: "A quiet, local-first place for your thoughts.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f6f7f4",
    theme_color: "#df6b43",
    categories: ["productivity", "utilities"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/app.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quick capture", short_name: "Capture", url: "/?capture=1" },
      { name: "Save a link", short_name: "Link", url: "/?capture=link" },
    ],
    // Lets the installed app receive a share from elsewhere on the device.
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
