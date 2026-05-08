import { useEffect, useState } from "react";

export type OrderItem = {
  medication_id: string;
  slug: string;
  name: string;
  active_ingredient: string;
  presentation?: string | null;
  image_url?: string | null;
  quantity: number;
};

const KEY = "mi_orden_v1";
const EVT = "mi_orden_changed";

function read(): OrderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OrderItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function getOrder(): OrderItem[] {
  return read();
}

export function setOrder(items: OrderItem[]) {
  write(items);
}

export function addToOrder(item: Omit<OrderItem, "quantity"> & { quantity?: number }) {
  const items = read();
  const idx = items.findIndex((x) => x.medication_id === item.medication_id);
  const qty = Math.max(1, item.quantity ?? 1);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
  } else {
    items.push({ ...item, quantity: qty });
  }
  write(items);
}

export function removeFromOrder(medication_id: string) {
  write(read().filter((x) => x.medication_id !== medication_id));
}

export function setQty(medication_id: string, quantity: number) {
  const q = Math.max(1, Math.floor(quantity));
  write(read().map((x) => (x.medication_id === medication_id ? { ...x, quantity: q } : x)));
}

export function clearOrder() {
  write([]);
}

export function useOrder() {
  const [items, setItems] = useState<OrderItem[]>(() => read());
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}

export function isInOrder(medication_id: string) {
  return read().some((x) => x.medication_id === medication_id);
}