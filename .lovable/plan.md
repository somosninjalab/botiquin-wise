# Buscar precios por WhatsApp

Sí, se puede: la gente le escribe a un número de WhatsApp de Alerta Medicina, pregunta por una medicina y recibe la comparación de precios en el mismo chat, con el enlace a la web.

## Cómo funcionaría para la persona

1. Escribe "atamel" (o "¿cuánto cuesta el valsartán?") al número de WhatsApp.
2. En segundos recibe los precios más baratos encontrados, con la farmacia de cada uno.
3. Recibe un enlace para ver la comparación completa en alertamedicina.com.
4. Puede seguir preguntando por otras medicinas en la misma conversación.

## Lo que hay que preparar

- Conectar un número de WhatsApp Business a la app (se hace desde una tarjeta de conexión, con aprobación de Meta).
- El número debe ser de WhatsApp Business y pasa por una verificación de Meta; puede tardar.
- Mientras Meta revisa, solo se puede responder a quien escriba primero (eso es justo lo que necesitamos).

## Qué se construye

- Un punto de entrada que recibe los mensajes de WhatsApp y los guarda, para no perder ninguno ni responder dos veces lo mismo.
- El mismo asistente que ya funciona en la web (con su búsqueda de precios real) responde por WhatsApp, con textos más cortos adaptados al chat.
- Respuesta con: las 3 opciones más baratas, farmacia y precio, más el enlace a la búsqueda completa.
- Registro de cada conversación y de las medicinas consultadas, para que aparezcan en el panel de administración junto con las búsquedas de la web.
- Límite de mensajes por número al día, para controlar el costo.

## Detalles técnicos

- Receptor en `src/routes/api/public/whatsapp/webhook.ts`, con verificación de firma (`@lovable.dev/webhooks-js`) y bandeja `whatsapp_webhook_events` en la base de datos (guardado antes de procesar, idempotente por `delivery_id`).
- Tablas nuevas: `whatsapp_webhook_events`, `whatsapp_messages` (entrantes/salientes con estado de entrega) — con RLS y GRANTs; lectura solo para admin.
- Reutiliza `buildSystemPrompt` y la lógica de `search_medications` de `src/routes/api/public/chat.ts`, extraída a un módulo compartido para que web y WhatsApp usen el mismo motor.
- Envío vía gateway `https://connector-gateway.lovable.dev/whatsapp/messages`; se guarda `messages[0].id` y se reconcilian los estados `sent/delivered/read/failed` que llegan por webhook.
- Respuestas dentro de la ventana de 24 h son libres; para mensajes iniciados por nosotros haría falta una plantilla aprobada (no hace falta para este caso).

## Fuera de alcance por ahora

- Mensajes promocionales o alertas de bajada de precio por WhatsApp (se puede agregar después con plantillas aprobadas).
