# ¡Alerta: Medicina! — Plan del MVP

Portal en español que centraliza precios de medicamentos de Farmatodo, Farmacias SAAS, Maraplus y Locatel, con buscador único, historial de precios, alertas por email y panel de métricas.

## Experiencia de usuario

### Páginas públicas
- **Home (`/`)** — Hero vibrante con buscador grande ("Busca tu medicamento o principio activo"), propuesta de valor, medicamentos destacados con mayor baja de precio reciente, CTA de registro para alertas.
- **Resultados (`/buscar?q=...`)** — Lista de coincidencias por nombre comercial y principio activo. Cada card muestra: nombre, presentación, precio actual más bajo, farmacia, badge "↓ bajó X%", botón "Seguir este medicamento".
- **Detalle (`/medicamento/$id`)** — Comparativa de precios actuales por farmacia (tabla), gráfico de evolución histórica (línea), botón "Recibir alertas", info de principio activo / categoría / indicación.
- **Cómo funciona (`/como-funciona`)** — Explicación del servicio gratuito.
- **Registro / Login (`/auth`)** — Email + contraseña y Google. Al registrarse se capturan: nombre, teléfono, email, ubicación (geolocalización por IP en el servidor).

### Área de usuario
- **Mis seguimientos (`/mis-alertas`)** — Lista de medicamentos seguidos, umbral de alerta configurable, baja con un clic.
- **Preferencias** — Activar/desactivar resumen semanal, frecuencia de alertas inmediatas.

### Panel admin (`/admin`)
- Solo rol `admin` (tabla `user_roles` con función `has_role`).
- Métricas: búsquedas por medicamento, por región (derivada del IP), por categoría/indicación, top farmacias, total usuarios, suscripciones activas, alertas enviadas.
- Gráficos con Recharts y filtros por rango de fechas.

### Emails
- **Alerta inmediata** cuando un medicamento seguido baja de precio.
- **Resumen semanal** los lunes con los seguidos del usuario y las mejores ofertas de su región.

## Modelo de datos (Lovable Cloud / Supabase)

- `pharmacies` — id, nombre, logo, base_url.
- `medications` — id, nombre comercial, principio activo, presentación, categoría, indicación, slug.
- `medication_prices` — medication_id, pharmacy_id, price, currency, url, scraped_at. (histórico, append-only).
- `medication_followers` — user_id, medication_id, threshold_pct, created_at.
- `profiles` — user_id, nombre, teléfono, ciudad, región, ip_first_seen.
- `user_roles` — user_id, role (`admin` / `user`) con función `has_role` SECURITY DEFINER.
- `search_events` — query, medication_id, region, user_id (nullable), created_at — alimenta métricas.
- `email_send_log` — manejado por la infra de emails de Lovable.

RLS estricta: cada usuario solo ve sus seguimientos y perfil; precios y medicamentos son lectura pública; admin accede a métricas vía función con `has_role`.

## Scraping

El alcance de scraping no se decidió aún. El plan contempla **dos fases** para no bloquear la entrega:

1. **Fase 1 (incluida en este plan):** carga inicial con datos demo realistas + estructura completa de BD e ingesta. Todo el frontend, registro, alertas y métricas funcionan end-to-end con datos sembrados, para validar UX.
2. **Fase 2 (siguiente iteración):** integrar scraping real. Las opciones técnicas serán:
   - Job programado con `pg_cron` que llama un server route `/api/public/scrape-prices` usando **Firecrawl** (conector) para extraer precios cada N horas, comparar con el último precio y disparar alertas vía la cola de emails.
   - O scraping bajo demanda al buscar (más lento, sin cron).

Te preguntaré la opción preferida después de validar la Fase 1, o podemos cerrarlo ahora si prefieres.

## Estilo visual

- Español, estética **moderna y vibrante**.
- Paleta: verde menta como primario (salud/ahorro), coral para alertas de baja de precio, fondos claros con acentos oscuros.
- Tipografía sans-serif moderna (Inter), cards redondeadas, micro-interacciones en hover, badges de descuento llamativos.
- Tema claro por defecto, soporte de modo oscuro.
- Mobile-first: el buscador y los resultados deben funcionar perfecto en móvil.

## Aspectos técnicos

- TanStack Start + Tailwind v4 + shadcn/ui + Recharts.
- Lovable Cloud habilitado para auth (email/password + Google), BD, RLS y roles.
- Lovable Emails para alertas y resumen semanal (requiere configurar dominio remitente).
- Geolocalización por IP en server function usando cabecera `cf-connecting-ip` / `x-forwarded-for`, resuelta con un servicio gratuito (ej. ipapi.co) y guardada en `profiles.region`.
- Validación con Zod en todos los formularios y server functions.
- `search_events` se inserta en cada búsqueda (anonimizado si no hay sesión) para alimentar las métricas.

## Lo que entregamos en esta iteración

1. Esquema completo de BD + RLS + roles.
2. Auth (email/password + Google) y captura de perfil con ubicación por IP.
3. Home con buscador, resultados, detalle con gráfico histórico.
4. Sistema de seguimiento de medicamentos y configuración de alertas.
5. Infra de emails: alerta inmediata + resumen semanal con `pg_cron`.
6. Panel admin con métricas (búsquedas por medicamento/región/categoría).
7. Datos demo para 4 farmacias y ~30 medicamentos representativos.
8. Tras aprobar, decidimos juntos la estrategia de scraping real (Firecrawl programado o bajo demanda).
