import type { MetadataRoute } from "next";
import { STORE } from "@/config/store";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/carrito", "/pedido", "/buscar"] },
    sitemap: new URL("/sitemap.xml", STORE.siteUrl).toString(),
  };
}
