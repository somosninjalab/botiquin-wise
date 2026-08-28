import { createServerFn } from "@tanstack/react-start";

const CHAT_ID = "874396555";

export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { message: string; email?: string; path?: string }) => {
    const message = String(input?.message ?? "").trim();
    if (message.length < 2) throw new Error("Mensaje muy corto");
    if (message.length > 2000) throw new Error("Mensaje muy largo");
    return {
      message,
      email: String(input?.email ?? "").trim().slice(0, 200),
      path: String(input?.path ?? "").slice(0, 200),
    };
  })
  .handler(async ({ data }) => {
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    if (!token) throw new Error("Soporte no configurado");

    const text = [
      "🆘 <b>Nuevo mensaje de soporte</b>",
      data.email ? `✉️ ${escapeHtml(data.email)}` : "✉️ (sin correo)",
      data.path ? `🔗 ${escapeHtml(data.path)}` : "",
      "",
      escapeHtml(data.message),
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`Telegram sendMessage failed [${res.status}]: ${body}`);
      throw new Error("No pudimos enviar tu mensaje. Intenta de nuevo.");
    }
    const parsed = JSON.parse(body) as { ok?: boolean; description?: string };
    if (!parsed.ok) {
      console.error(`Telegram error: ${parsed.description}`);
      throw new Error("No pudimos enviar tu mensaje. Intenta de nuevo.");
    }
    return { ok: true as const };
  });

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
