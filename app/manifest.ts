import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memo no Sekai",
    short_name: "Memo",
    description: "A quiet, local-first place for your thoughts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f6f7f4",
    theme_color: "#df6b43",
    orientation: "portrait-primary",
    icons: [{ src: "/app.svg", sizes: "192x192", type: "image/svg+xml" }],
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
