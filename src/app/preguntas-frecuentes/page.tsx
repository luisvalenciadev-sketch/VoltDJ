import type { Metadata } from "next";
import { FaqList } from "@/components/Content";
import { Breadcrumbs } from "@/components/ui";
import { getContent } from "@/data/content";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Cómo hacer un pedido, precios, pagos, envíos y garantías.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

export default async function FaqPage() {
  const FAQ = (await getContent()).faqs;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.filter((f) => f.a).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Preguntas frecuentes" }]} />
      <div className="pagehead">
        <h1 className="disp">Preguntas frecuentes</h1>
      </div>
      <div style={{ paddingBottom: "var(--s7)" }}>
        <FaqList items={FAQ} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
