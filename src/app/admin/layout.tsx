import type { Metadata } from "next";

// El panel nunca se indexa ni se guarda en caché compartida.
export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel VOLT DJ" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="wrap admin">{children}</div>;
}
