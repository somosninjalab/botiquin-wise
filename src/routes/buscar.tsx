import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

const schema = z.object({ q: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(schema),
  component: RedirectToHome,
});

function RedirectToHome() {
  const { q } = Route.useSearch();
  return <Navigate to="/" search={{ q, pharm: "all", med: "all" }} replace />;
}
