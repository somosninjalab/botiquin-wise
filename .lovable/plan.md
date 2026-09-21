# WhatsApp + presentación privada "Nosotros"

Dos cosas, se pueden hacer las dos.

---

## 1. Atender búsquedas de precios por WhatsApp

Sí se puede: la gente le escribe a un número de WhatsApp de Alerta Medicina, pregunta por una medicina y recibe la comparación de precios en el mismo chat.

### Cómo se vive

1. Escribe "atamel" o "¿cuánto cuesta el valsartán?" al número.
2. En segundos recibe las opciones más baratas con la farmacia de cada una.
3. Recibe el enlace para ver la comparación completa en alertamedicina.com.
4. Puede seguir preguntando en la misma conversación.

### Lo que hace falta

- Conectar un número de WhatsApp Business desde una tarjeta de conexión, con verificación de Meta (puede tardar).
- Mientras Meta revisa, solo se responde a quien escriba primero — que es justo este caso.

### Qué se construye

- Recepción de los mensajes de WhatsApp, guardados antes de responder para no perder ni duplicar ninguno.
- El mismo asistente de la web (con la búsqueda de precios real) responde por WhatsApp, con textos cortos de chat: las 3 opciones más baratas + enlace.
- Cada conversación y medicina consultada queda registrada y aparece en el panel junto con las búsquedas de la web.
- Límite diario de mensajes por número para controlar el costo.

---

## 2. Tab "Nosotros" privado (para alianzas)

Una página tipo presentación, con las cifras reales de los últimos 30 días, pensada para mostrarla a un aliado potencial. No aparece en el menú ni en buscadores.

### Qué muestra (secciones que se recorren al bajar)

1. Portada: qué es Alerta Medicina y la propuesta en una línea.
2. Tráfico de los últimos 30 días: visitas y personas distintas.
3. Consultas: búsquedas de medicinas y conversaciones del asistente.
4. Mapa/lista de ciudades desde donde consultan, con el ranking de estados.
5. Patologías identificadas (por categoría terapéutica de lo que buscan), priorizando crónicas.
6. Medicinas más solicitadas (top 15).
7. Cierre con contacto para la alianza.

### Cómo se mantiene privada

- Vive en una dirección no enlazada (`/nosotros`) y pide una clave de acceso simple que tú compartes con el aliado.
- Marcada para que Google no la indexe y sin enlaces desde el resto del sitio.
- Botón para imprimir/guardar en PDF y mandarla por correo.

---

## Detalles técnicos

**WhatsApp**
- Receptor en `src/routes/api/public/whatsapp/webhook.ts` con verificación de firma (`@lovable.dev/webhooks-js`) y bandeja `whatsapp_webhook_events` (guardado antes de procesar, idempotente por `delivery_id`).
- Tablas nuevas `whatsapp_webhook_events` y `whatsapp_messages` (entrantes/salientes + estado de entrega), con RLS y GRANTs; lectura solo admin.
- Se extrae a un módulo compartido la lógica de `search_medications` y `buildSystemPrompt` de `src/routes/api/public/chat.ts` para que web y WhatsApp usen el mismo motor.
- Envío por gateway `connector-gateway.lovable.dev/whatsapp/messages`; se guarda `messages[0].id` y se reconcilian los estados `sent/delivered/read/failed`.

**Nosotros**
- Ruta `src/routes/nosotros.tsx` con `head()` propio y `robots: noindex, nofollow`; excluida del sitemap.
- Server function `src/lib/deck/partner-stats.functions.ts` con `supabaseAdmin`: agregados de `search_events`, `chat_conversations`, `chat_messages`, `health_signals` y analytics de 30 días. Solo devuelve conteos agregados, ningún dato personal.
- Acceso por clave: secreto `PARTNER_DECK_PASSCODE`, validado dentro de la server function; sin clave correcta no se devuelven cifras.
- Reutiliza el agrupamiento por categoría terapéutica ya usado en `src/routes/admin.tsx` para las patologías.
- Estilo con los tokens actuales de marca (verde/naranja), secciones a pantalla completa y estilos de impresión para el PDF.
