import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildSystemPrompt } from "@/lib/assistant/system-prompt.server";

// =============================================================================
// Streaming chat endpoint for the Alerta Medicina assistant.
// - Anon users: 3 messages total per anon_token (cheap defense; UI also gates).
// - Auth users: 30 messages / 24h (configurable).
// - Tool calls are executed server-side AFTER the model stream completes.
// =============================================================================

const BodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  anonToken: z.string().min(8).max(64).nullable().optional(),
  message: z.string().min(1).max(2000),
  entryContext: z.record(z.string(), z.unknown()).optional(),
});

const ANON_MSG_LIMIT = 3;
const AUTH_MSG_LIMIT_24H = 15;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_medications",
      description:
        "Busca medicinas en el catálogo de Alerta Medicina por nombre, ingrediente activo o marca. Devuelve hasta 5 resultados con precios.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Término a buscar (ej. ibuprofeno, losartan, atorva)" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "record_signal",
      description:
        "Guarda un dato observado de la conversación para analítica de mercado. Usar cuando el usuario menciona síntomas, condiciones crónicas, medicinas que toma, preocupación de precio, preferencia de farmacia, o cuando una búsqueda no devuelve resultados.",
      parameters: {
        type: "object",
        properties: {
          signal_type: {
            type: "string",
            enum: [
              "symptom",
              "condition",
              "medication_mentioned",
              "medication_unknown",
              "price_concern",
              "pharmacy_preference",
              "demographic",
            ],
          },
          value: { type: "string", description: "Texto observado, tal como lo dijo el usuario." },
        },
        required: ["signal_type", "value"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_profile_field",
      description:
        "Guarda un dato del perfil del usuario (requiere que esté registrado). Campos: city, region, age_range, sex, chronic_condition, current_medication.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: ["city", "region", "age_range", "sex", "chronic_condition", "current_medication"],
          },
          value: { type: "string", description: "Valor a guardar." },
        },
        required: ["field", "value"],
        additionalProperties: false,
      },
    },
  },
];

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function runTool(name: string, args: any, ctx: { userId: string | null; conversationId: string; region: string | null; city: string | null }): Promise<string> {
  try {
    if (name === "search_medications") {
      const q = String(args?.query ?? "").trim();
      if (!q) return JSON.stringify({ results: [] });
      const { data } = await supabaseAdmin.rpc("search_medications_fuzzy", { q, lim: 5 });
      const meds = (data ?? []) as Array<{ id: string; name: string; slug: string; active_ingredient: string; presentation: string | null }>;
      // Pull cheapest current price per medication.
      const enriched = await Promise.all(
        meds.map(async (m) => {
          const { data: prices } = await supabaseAdmin
            .from("medication_prices")
            .select("price, currency, pharmacy_id, in_stock")
            .eq("medication_id", m.id)
            .eq("in_stock", true)
            .order("price", { ascending: true })
            .limit(1);
          const best = prices?.[0];
          return {
            id: m.id,
            name: m.name,
            slug: m.slug,
            active_ingredient: m.active_ingredient,
            presentation: m.presentation,
            best_price: best ? `${best.currency} ${best.price}` : null,
          };
        }),
      );
      return JSON.stringify({ results: enriched });
    }

    if (name === "record_signal") {
      const signal_type = String(args?.signal_type ?? "").trim();
      const value = String(args?.value ?? "").trim().slice(0, 500);
      if (!signal_type || !value) return JSON.stringify({ ok: false, error: "missing fields" });
      await supabaseAdmin.from("health_signals").insert({
        conversation_id: ctx.conversationId,
        user_id: ctx.userId,
        signal_type: signal_type as any,
        value,
        normalized_value: value.toLowerCase(),
        city: ctx.city,
        region: ctx.region,
      });
      return JSON.stringify({ ok: true });
    }

    if (name === "save_profile_field") {
      if (!ctx.userId) return JSON.stringify({ ok: false, error: "user not registered" });
      const field = String(args?.field ?? "").trim();
      const value = String(args?.value ?? "").trim().slice(0, 200);
      if (!field || !value) return JSON.stringify({ ok: false, error: "missing fields" });

      if (field === "city" || field === "region") {
        await supabaseAdmin.from("profiles").update({ [field]: value } as any).eq("user_id", ctx.userId);
      } else if (field === "sex" || field === "age_range") {
        // age_range goes to user_health_profile (profiles only has birth_date)
        if (field === "sex") {
          await supabaseAdmin.from("profiles").update({ sex: value }).eq("user_id", ctx.userId);
        }
        await supabaseAdmin
          .from("user_health_profile")
          .upsert({ user_id: ctx.userId, [field]: value } as any, { onConflict: "user_id" });
      } else if (field === "chronic_condition" || field === "current_medication") {
        const col = field === "chronic_condition" ? "chronic_conditions" : "current_medications";
        // append unique
        const { data: existing } = await supabaseAdmin
          .from("user_health_profile")
          .select(col as any)
          .eq("user_id", ctx.userId)
          .maybeSingle();
        const arr: string[] = ((existing as any)?.[col] ?? []) as string[];
        if (!arr.includes(value)) arr.push(value);
        await supabaseAdmin
          .from("user_health_profile")
          .upsert({ user_id: ctx.userId, [col]: arr } as any, { onConflict: "user_id" });
      }
      return JSON.stringify({ ok: true });
    }

    return JSON.stringify({ ok: false, error: "unknown tool" });
  } catch (e: any) {
    console.error("tool exec error", name, e);
    return JSON.stringify({ ok: false, error: e?.message ?? "error" });
  }
}

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, content-type",
        };
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI no configurada" }), { status: 500, headers: { "content-type": "application/json", ...cors } });
        }

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Solicitud inválida", details: e?.message }), { status: 400, headers: { "content-type": "application/json", ...cors } });
        }

        const userId = await resolveUserId(request.headers.get("authorization"));
        const anonToken = userId ? null : (body.anonToken || null);
        if (!userId && !anonToken) {
          return new Response(JSON.stringify({ error: "Falta token" }), { status: 400, headers: { "content-type": "application/json", ...cors } });
        }

        // Geo from CF headers (best effort)
        const city = request.headers.get("cf-ipcity");
        const region = request.headers.get("cf-region");
        const country = request.headers.get("cf-ipcountry-name") || request.headers.get("cf-ipcountry");

        // Rate limit
        if (userId) {
          const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("chat_messages")
            .select("id, chat_conversations!inner(user_id)", { count: "exact", head: true })
            .eq("role", "user")
            .gte("created_at", since)
            .eq("chat_conversations.user_id", userId);
          if ((count ?? 0) >= AUTH_MSG_LIMIT_24H) {
            return new Response(JSON.stringify({ error: "Llegaste al límite diario de mensajes. Intenta mañana." }), { status: 429, headers: { "content-type": "application/json", ...cors } });
          }
        } else if (anonToken) {
          const { count } = await supabaseAdmin
            .from("chat_messages")
            .select("id, chat_conversations!inner(anon_token)", { count: "exact", head: true })
            .eq("role", "user")
            .eq("chat_conversations.anon_token", anonToken);
          if ((count ?? 0) >= ANON_MSG_LIMIT) {
            return new Response(JSON.stringify({ error: "Regístrate gratis para seguir conversando." , needsAuth: true }), { status: 429, headers: { "content-type": "application/json", ...cors } });
          }
        }

        // Find or create conversation
        let conversationId = body.conversationId ?? null;
        if (conversationId) {
          const { data: existing } = await supabaseAdmin
            .from("chat_conversations")
            .select("id, user_id, anon_token")
            .eq("id", conversationId)
            .maybeSingle();
          if (!existing) conversationId = null;
          else if (userId && existing.user_id !== userId) conversationId = null;
          else if (!userId && anonToken && existing.anon_token !== anonToken) conversationId = null;
        }
        if (!conversationId) {
          const { data: created, error: createErr } = await supabaseAdmin
            .from("chat_conversations")
            .insert({
              user_id: userId,
              anon_token: anonToken,
              entry_context: (body.entryContext ?? {}) as any,
              city,
              region,
              country,
            })
            .select("id")
            .single();
          if (createErr || !created) {
            return new Response(JSON.stringify({ error: "No se pudo iniciar la conversación" }), { status: 500, headers: { "content-type": "application/json", ...cors } });
          }
          conversationId = created.id;
        }

        // Save user message
        await supabaseAdmin.from("chat_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: body.message,
        });

        // Build conversation history from DB (last ~6 turns) to reduce token usage
        const { data: history } = await supabaseAdmin
          .from("chat_messages")
          .select("role, content, tool_calls")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(12);
        if (history) history.reverse();

        // Profile context for system prompt
        let userCity: string | null = city;
        let userName: string | null = null;
        if (userId) {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("city, full_name")
            .eq("user_id", userId)
            .maybeSingle();
          if (prof) {
            userCity = prof.city || userCity;
            userName = prof.full_name;
          }
        }

        const systemPrompt = buildSystemPrompt({ userCity, userName, entryContext: body.entryContext });

        const chatMessages: any[] = [{ role: "system", content: systemPrompt }];
        for (const m of history ?? []) {
          if (m.role === "tool") continue; // tool replies are inline below
          chatMessages.push({ role: m.role, content: m.content });
        }

        // ---- Streaming with tool-call loop ----
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            send({ type: "meta", conversationId });

            try {
              let safetyTurns = 0;
              while (safetyTurns++ < 2) {
                const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-lite",
                    messages: chatMessages,
                    tools: TOOLS,
                    stream: true,
                  }),
                });

                if (!upstream.ok || !upstream.body) {
                  const errText = await upstream.text().catch(() => "");
                  if (upstream.status === 429) {
                    send({ type: "error", message: "El asistente está saturado. Intenta en un minuto." });
                  } else if (upstream.status === 402) {
                    send({ type: "error", message: "Sin créditos de IA. Avisa al admin." });
                  } else {
                    console.error("ai gateway error", upstream.status, errText);
                    send({ type: "error", message: "No pude responder ahora. Intenta de nuevo." });
                  }
                  break;
                }

                const reader = upstream.body.getReader();
                const decoder = new TextDecoder();
                let buf = "";
                let assistantText = "";
                // accumulators for tool calls (indexed)
                const toolAcc: Record<number, { id?: string; name?: string; args: string }> = {};
                let done = false;

                while (!done) {
                  const { value, done: rDone } = await reader.read();
                  if (rDone) break;
                  buf += decoder.decode(value, { stream: true });
                  let nl: number;
                  while ((nl = buf.indexOf("\n")) !== -1) {
                    let line = buf.slice(0, nl);
                    buf = buf.slice(nl + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") {
                      done = true;
                      break;
                    }
                    try {
                      const parsed = JSON.parse(payload);
                      const delta = parsed.choices?.[0]?.delta;
                      if (delta?.content) {
                        assistantText += delta.content;
                        send({ type: "delta", text: delta.content });
                      }
                      if (Array.isArray(delta?.tool_calls)) {
                        for (const tc of delta.tool_calls) {
                          const idx = tc.index ?? 0;
                          toolAcc[idx] ??= { args: "" };
                          if (tc.id) toolAcc[idx].id = tc.id;
                          if (tc.function?.name) toolAcc[idx].name = tc.function.name;
                          if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
                        }
                      }
                    } catch {
                      // partial JSON across chunks: stash back
                      buf = line + "\n" + buf;
                      break;
                    }
                  }
                }

                const toolCalls = Object.values(toolAcc).filter((t) => t.name);

                // Persist assistant turn
                if (assistantText || toolCalls.length > 0) {
                  await supabaseAdmin.from("chat_messages").insert({
                    conversation_id: conversationId,
                    role: "assistant",
                    content: assistantText,
                    tool_calls: toolCalls.length > 0 ? toolCalls : null,
                  });
                }

                if (toolCalls.length === 0) {
                  // No more tools — we're done.
                  break;
                }

                // Execute tools and feed results back to the model.
                chatMessages.push({
                  role: "assistant",
                  content: assistantText || null,
                  tool_calls: toolCalls.map((t, i) => ({
                    id: t.id ?? `call_${i}`,
                    type: "function",
                    function: { name: t.name, arguments: t.args || "{}" },
                  })),
                });

                for (const t of toolCalls) {
                  let parsedArgs: any = {};
                  try { parsedArgs = JSON.parse(t.args || "{}"); } catch {}
                  const result = await runTool(t.name!, parsedArgs, { userId, conversationId: conversationId!, city, region });
                  await supabaseAdmin.from("chat_messages").insert({
                    conversation_id: conversationId,
                    role: "tool",
                    content: result,
                    tool_calls: { name: t.name, id: t.id },
                  });
                  chatMessages.push({
                    role: "tool",
                    tool_call_id: t.id ?? `call_${t.name}`,
                    content: result,
                  });
                  send({ type: "tool", name: t.name, result });
                }
                // loop again so the model can produce a final reply incorporating tool output
              }

              // bump conversation activity
              await supabaseAdmin
                .from("chat_conversations")
                .update({ last_activity_at: new Date().toISOString() })
                .eq("id", conversationId);

              send({ type: "done" });
            } catch (e: any) {
              console.error("chat stream error", e);
              send({ type: "error", message: "Error inesperado." });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            "x-accel-buffering": "no",
            ...cors,
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "authorization, content-type",
          },
        }),
    },
  },
});