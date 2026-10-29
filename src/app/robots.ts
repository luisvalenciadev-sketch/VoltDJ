import type { MetadataRoute } from "next";
import { SITE } from "@/config/store";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/carrito", "/pedido", "/buscar", "/admin", "/seguimiento/"] },
    sitemap: new URL("/sitemap.xml", SITE.url).toString(),
  };
}
