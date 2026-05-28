
## Objetivo

Construir un **panel de inteligencia de mercado farmacéutico y de salud en Venezuela** alimentado por un asistente conversacional. El chat no es el producto: es el **mecanismo de captura** que convierte cada visita en datos estructurados sobre qué busca la gente, qué toma, qué le duele, dónde vive y cuánto paga.

El entregable principal es el **dashboard `/admin/insights`** + capacidad de exportación. El chat es el medio para llenarlo.

## Valor de negocio (qué responderá el dashboard)

Preguntas que hoy NO podemos responder y que sí podremos:

- **Demanda real por molécula y por marca**, segmentada por ciudad/estado.
- **Top condiciones crónicas** declaradas, cruzadas con medicinas que toma esa población.
- **Brechas de catálogo**: medicinas mencionadas por usuarios que NO existen en `medications` → señal de qué sumar.
- **Sensibilidad al precio**: usuarios que abandonaron tras ver el precio vs. los que agregaron a "Mi orden".
- **Perfil demográfico** de quien busca cada categoría (edad, sexo, ciudad).
- **Funnel**: visita → búsqueda → chat → dato capturado → registro → alerta activa.
- **Tendencias temporales**: qué condición/medicina sube semana a semana.
- **Mapa de salud**: heatmap por estado de condiciones declaradas (con N mínimo para anonimato).

## Modelo de datos (una migración)

Tablas nuevas pensadas para analítica, no solo para el chat:

1. `chat_conversations(id, user_id?, anon_token?, entry_context jsonb, city, region, country, started_at, last_activity_at, ended_in_signup boolean)`
2. `chat_messages(id, conversation_id, role, content, tool_calls jsonb, created_at)`
3. `user_health_profile(user_id unique, age_range, sex, chronic_conditions text[], current_medications text[], other_meds_text text[], updated_at)` — PII sensible, RLS estricta.
4. `health_signals(id, conversation_id, user_id?, signal_type enum['symptom','condition','medication_mentioned','medication_unknown','price_concern','pharmacy_preference','location','demographic'], value text, normalized_value text, medication_id?, tag_id?, city, region, created_at)` — **tabla pivot para analítica**. Cada cosa que el bot extrae se vuelve un row aquí, normalizado, sin PII directa.

GRANTs estándar. RLS:
- `chat_*` y `user_health_profile`: dueño + admin.
- `health_signals`: insert por serverFn (service role); select solo admin. Sin `user_id` expuesto en agregaciones.

## Panel `/admin/insights` (vista principal)

Pestañas:

### 1. Resumen ejecutivo
- KPIs: conversaciones (24h/7d/30d), señales capturadas, % visitas que generan ≥1 señal, registros generados, top 5 estados.
- Gráfico de señales por día apiladas por tipo.

### 2. Demanda por medicina
- Tabla: medicina (o "no en catálogo"), menciones, ciudades top, % en catálogo, precio mediano si aplica.
- Filtro por categoría, estado, rango de fechas.
- Sección "Brechas de catálogo": medicinas mencionadas sin match → exportable a CSV para que el equipo las agregue.

### 3. Condiciones crónicas
- Top condiciones, distribución por estado, edad, sexo.
- Cruce condición × medicinas que toma esa cohorte.
- Heatmap por estado (reusa `HeatmapCard`, con N mínimo = 5 para no identificar).

### 4. Geografía
- Mapa de Venezuela con bubbles por estado: volumen de conversaciones, condición predominante, medicina más buscada.

### 5. Funnel y conversión
- Visitas → búsquedas → chat iniciado → ≥3 mensajes → dato capturado → registro → alerta activa.
- Tasa de abandono por etapa, segmentada por dispositivo y estado.

### 6. Conversaciones (drill-down)
- Tabla con filtros (fecha, ciudad, anónimo/registrado, señales capturadas).
- Click → drawer con transcripción + panel de señales extraídas.

## Exportación

Botón **"Exportar CSV"** en cada pestaña, respeta filtros activos. ServerFns con `requireSupabaseAuth` + `has_role('admin')`, devuelven `text/csv` con `Content-Disposition: attachment`, stream línea por línea:

- `exportSignalsCSV` — granular, una fila por señal (insumo crudo para análisis externo).
- `exportConversationsCSV` — una fila por hilo + columnas resumen.
- `exportHealthProfilesCSV` — una fila por usuario registrado.
- `exportMedicationGapsCSV` — medicinas mencionadas no en catálogo, con frecuencia y ciudades.
- `exportCatalogDemandCSV` — demanda agregada por medicina del catálogo (mes, ciudad, menciones, búsquedas, alertas).

Adicional:
- **Snapshot semanal automático**: cron en `/api/public/hooks/weekly-insights-snapshot` que genera todos los CSVs, los sube a un bucket privado nuevo `insights-exports` y envía link al admin por email.
- **Vista pública futura** (fuera de alcance ahora): reporte mensual agregado y anonimizado para compartir con prensa/aliados.

## Cómo el chat alimenta los datos

El asistente vive como **burbuja flotante global** (oculta en `/admin` y auth). Se dispara contextualmente tras búsqueda. Su `system-prompt` está orientado a **extracción estructurada**, no solo a responder:

- Cada turno del bot termina decidiendo si emitir uno o más tool-calls:
  - `record_signal({type, value, medication_match?})` — el más usado, escribe en `health_signals`.
  - `save_profile_field({field, value})` — escribe en `profiles` o `user_health_profile`.
  - `search_medications(query)` — RPC existente, devuelve top 5 para mostrar inline.
- El bot prioriza captura natural: tras ayudar con la búsqueda, hace 1-2 preguntas suaves ("¿en qué ciudad estás?", "¿es para algo recurrente?"). Nunca interrogatorio.
- Tono cálido, venezolano-neutro, branding Alerta Medicina. **Disclaimer médico** siempre visible.
- **Acceso mixto**: 3 mensajes anónimo → CTA registro. Hilo anónimo se migra al registrarse (RPC `migrate_anon_conversation`).
- **Acciones inline**: cards de medicinas con precio + "Agregar a mi orden".

## Arquitectura técnica

```text
src/components/chat/
  AssistantBubble.tsx, AssistantPanel.tsx, MessageBubble.tsx, QuickReplies.tsx, useAssistantChat.ts

src/lib/assistant/
  chat.functions.ts        # serverFn streaming SSE → Lovable AI Gateway
  tools.ts                 # record_signal, save_profile_field, search_medications
  system-prompt.ts         # Foco en extracción + branding
  signal-normalizer.ts     # Normaliza condiciones/medicinas a slugs canónicos
  anonymous-storage.ts

src/routes/admin.insights.tsx                     # Dashboard tabbed
src/routes/admin.insights.conversaciones.tsx      # Drill-down
src/lib/admin/insights.functions.ts               # Queries agregadas
src/lib/admin/export.functions.ts                 # Todos los CSV exporters
src/routes/api/public/hooks/weekly-insights-snapshot.ts
```

- Modelo: `google/gemini-3-flash-preview` (rápido, barato, tool-calling sólido).
- Normalización: tras cada `record_signal`, una segunda llamada barata mapea el texto libre a slugs canónicos (medicina del catálogo, tag de condición existente) para que la analítica sea limpia.
- Rate limit anónimo en serverFn por huella + IP en últimas 24h.

## Privacidad y ética (no negociable)

- Condiciones crónicas y medicinas actuales son **PII sensible**.
- `health_signals` no contiene `user_id` cuando se usa para agregaciones públicas internas; se mantiene `conversation_id` para drill-down admin.
- Agregaciones geográficas con **N mínimo = 5** antes de mostrar/exportar.
- Disclaimer en chat: "No soy médico. Para diagnóstico o tratamiento consulta a un profesional."
- Nunca exponer `health_signals` ni `user_health_profile` por `/api/public/*`.
- Opción "Borrar mis datos" en `/mis-alertas` que elimina perfil de salud y hilo de chat.

## Fuera de alcance

- Voz / audio.
- Reporte público mensual.
- Recomendaciones personalizadas basadas en condiciones.
- Notificaciones proactivas tipo "bajó X que mencionaste".

## Decisiones a confirmar al construir

- ¿Cap diario de mensajes por usuario logueado? (sugerencia: 30/día para controlar costo del gateway).
- ¿Qué tan agresivo el trigger del bot? (default: 1 nudge a los 8s en `/buscar` y `/medicamento/$slug`, dismissible para esa sesión).
- ¿Email del snapshot semanal a un solo admin o configurable?
