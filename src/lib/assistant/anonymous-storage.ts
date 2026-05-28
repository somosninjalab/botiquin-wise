// Helpers para hilo anónimo del chat en localStorage.
// Se migra al servidor cuando el usuario se registra.

const TOKEN_KEY = "am.chat.anon_token";
const CONV_KEY = "am.chat.conversation_id";
const COUNT_KEY = "am.chat.msg_count";

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = uuidv4();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function getStoredConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONV_KEY);
}

export function setStoredConversationId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(CONV_KEY, id);
  else localStorage.removeItem(CONV_KEY);
}

export function getAnonMsgCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(COUNT_KEY) || "0");
}

export function incrementAnonMsgCount(): number {
  const n = getAnonMsgCount() + 1;
  localStorage.setItem(COUNT_KEY, String(n));
  return n;
}

export function resetAnonChatState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONV_KEY);
  localStorage.removeItem(COUNT_KEY);
  // anon_token se mantiene por si el usuario vuelve sin login
}

export const ANON_LIMIT = 3;