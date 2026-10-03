import type { MetadataRoute } from "next";

// Lets phones and computers install the website as an app
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.SHOP_NAME ? `${process.env.SHOP_NAME} Hisab` : "Shop Hisab";
  return {
    id: "/",
    name,
    short_name: "Shop Hisab",
    description: "Daily sales, dues and food costs for the shop",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f4f3",
    theme_color: "#2e6b5b",
    lang: "en",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the app icon to jump straight to these
    shortcuts: [
      { name: "New memo", short_name: "New memo", url: "/sales/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Dues", short_name: "Dues", url: "/dues", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
