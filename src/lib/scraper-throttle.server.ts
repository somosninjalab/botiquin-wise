// ============================================================================
// Regulador adaptativo de consultas al proveedor de precios.
//
// Objetivo: nunca saturar la web de origen. En vez de un límite fijo,
// medimos cómo responde el proveedor y ajustamos solos:
//   - si todo va bien → subimos concurrencia y acortamos la pausa
//   - si hay 429/403/503/timeouts → bajamos concurrencia, alargamos la pausa
//     y aplicamos un enfriamiento global (circuit breaker suave)
// ============================================================================

const MAX_CONCURRENCY = 3;
const MIN_CONCURRENCY = 1;
const MIN_GAP_FLOOR_MS = 350;
const MIN_GAP_CEIL_MS = 6_000;

const state = {
  concurrency: 3,
  gapMs: 700,
  active: 0,
  lastStartAt: 0,
  cooldownUntil: 0,
  okStreak: 0,
  failStreak: 0,
};

const waiters: Array<() => void> = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function release() {
  state.active--;
  const next = waiters.shift();
  if (next) next();
}

async function acquire(deadline: number): Promise<boolean> {
  while (true) {
    if (Date.now() > deadline) return false;

    if (state.active >= state.concurrency) {
      const got = await Promise.race([
        new Promise<boolean>((res) => waiters.push(() => res(true))),
        sleep(Math.max(0, Math.min(2_000, deadline - Date.now()))).then(() => false),
      ]);
      if (!got) continue;
    }

    // Enfriamiento tras errores del proveedor.
    const cool = state.cooldownUntil - Date.now();
    if (cool > 0) {
      if (Date.now() + cool > deadline) return false;
      await sleep(Math.min(cool, 3_000));
      continue;
    }

    // Espacio mínimo entre llamadas salientes.
    const gap = state.gapMs - (Date.now() - state.lastStartAt);
    if (gap > 0) {
      if (Date.now() + gap > deadline) return false;
      await sleep(gap);
      continue;
    }

    state.active++;
    state.lastStartAt = Date.now();
    return true;
  }
}

/** Marca una respuesta correcta: relajamos el límite poco a poco. */
export function reportSuccess() {
  state.failStreak = 0;
  state.okStreak++;
  if (state.okStreak >= 4) {
    state.okStreak = 0;
    state.gapMs = Math.max(MIN_GAP_FLOOR_MS, Math.round(state.gapMs * 0.8));
    state.concurrency = Math.min(MAX_CONCURRENCY, state.concurrency + 1);
  }
}

/** Marca rechazo/saturación del proveedor: frenamos de inmediato. */
export function reportThrottled() {
  state.okStreak = 0;
  state.failStreak++;
  state.gapMs = Math.min(MIN_GAP_CEIL_MS, Math.round(state.gapMs * 2) || 700);
  state.concurrency = Math.max(MIN_CONCURRENCY, state.concurrency - 1);
  const cooldown = Math.min(15_000, 1_000 * 2 ** Math.min(state.failStreak, 4));
  state.cooldownUntil = Date.now() + cooldown;
}

/** Fallo genérico (timeout, red): frenamos suave, sin enfriamiento largo. */
export function reportFailure() {
  state.okStreak = 0;
  state.failStreak++;
  state.gapMs = Math.min(MIN_GAP_CEIL_MS, Math.round(state.gapMs * 1.4));
  if (state.failStreak >= 2) {
    state.concurrency = Math.max(MIN_CONCURRENCY, state.concurrency - 1);
  }
}

/**
 * Ejecuta `fn` respetando el límite adaptativo.
 * Devuelve `null` si no hubo espacio antes del `deadline`.
 */
export async function scheduleUpstream<T>(
  fn: () => Promise<T>,
  deadline: number,
): Promise<T | null> {
  const ok = await acquire(deadline);
  if (!ok) return null;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function throttleSnapshot() {
  return { ...state };
}
