# Presentación privada "Nosotros" (para alianzas)

Una página tipo presentación, con las cifras reales de los últimos 30 días, pensada para mostrarla a un aliado potencial. No aparece en el menú ni en buscadores.

## Qué muestra (secciones que se recorren al bajar)

1. Portada: qué es Alerta Medicina y la propuesta de valor en una línea.
2. Tráfico de los últimos 30 días: visitas y personas distintas.
3. Consultas: búsquedas de medicinas y conversaciones con el asistente.
4. Ciudades desde donde consultan, con ranking de estados.
5. Patologías identificadas (por categoría terapéutica de lo que buscan), destacando las crónicas.
6. Medicinas más solicitadas (top 15).
7. Cierre con el contacto para conversar la alianza.

Las cifras se calculan solas cada vez que se abre la página: siempre están al día.

## Cómo se mantiene privada

- Vive en una dirección no enlazada (`/nosotros`); no está en el menú ni en el pie.
- Pide una clave de acceso simple que tú le compartes al aliado; sin la clave no se ve ninguna cifra.
- Marcada para que Google no la indexe y fuera del mapa del sitio.
- Botón para imprimir o guardar en PDF y enviarla por correo.

## Detalles técnicos

- Ruta `src/routes/nosotros.tsx` con `head()` propio y `robots: noindex, nofollow`; excluida de `sitemap.xml`.
- Server function `src/lib/deck/partner-stats.functions.ts` con `supabaseAdmin`: agregados de 30 días desde `search_events`, `chat_conversations`, `chat_messages` y `health_signals`. Solo devuelve conteos agregados, ningún dato personal.
- Clave de acceso guardada como secreto `PARTNER_DECK_PASSCODE` y validada dentro de la server function antes de devolver datos.
- Las patologías reutilizan el agrupamiento por categoría terapéutica ya usado en `src/routes/admin.tsx`.
- Ciudades/estados normalizados con `src/lib/venezuela-geo.ts`.
- Estilo con los tokens actuales de marca (verde/naranja), secciones a pantalla completa, contadores animados y estilos de impresión para el PDF.

## Fuera de alcance

- WhatsApp (en pausa por ahora).
