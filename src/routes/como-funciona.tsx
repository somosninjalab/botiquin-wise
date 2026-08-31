import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Search, Bell, TrendingDown, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  component: Page,
  head: () => {
    const title = "Cómo funciona ¡Alerta: Medicina! — comparar precios en 4 pasos";
    const description =
      "Busca tu medicamento, compara los precios de las farmacias en Venezuela y activa alertas gratis cuando baje de precio. Así funciona ¡Alerta: Medicina!";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://alertamedicina.com/como-funciona" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: "https://alertamedicina.com/como-funciona" }],
    };
  },
});

function Page() {
  const steps = [
    { icon: Search, title: "1. Busca", text: "Escribe el nombre comercial o el principio activo del medicamento que necesitas." },
    { icon: TrendingDown, title: "2. Compara", text: "Vemos los precios actuales en Farmatodo, SAAS, Maraplus y Locatel y te mostramos el más bajo." },
    { icon: Bell, title: "3. Recibe alertas", text: "Crea tu cuenta gratis y te avisamos por email cuando baje el precio de los medicamentos que sigues." },
    { icon: ShieldCheck, title: "4. Sin costo", text: "El servicio es 100% gratuito. Solo te pedimos email y, si quieres, tu teléfono para alertarte." },
  ];
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold">Cómo funciona</h1>
      <p className="text-muted-foreground mt-2">Un comparador único para encontrar siempre el mejor precio de tus medicamentos.</p>
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        {steps.map((s, i) => (
          <Card key={i} className="p-6">
            <div className="rounded-xl bg-primary/10 inline-flex p-3 text-primary"><s.icon className="h-6 w-6" /></div>
            <h3 className="mt-3 font-semibold text-lg">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
