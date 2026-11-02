/** Estado del AudioContext tal como lo expone el navegador (iOS anade `interrupted`). */
export type ContextState = 'running' | 'suspended' | 'interrupted' | 'closed' | (string & {});

export interface ContextNotice {
  /** Hay que pedir al usuario un gesto para reanudar el audio. */
  needsGesture: boolean;
  message: string;
}

export const CONTEXT_RESUME_LABEL = 'Reanudar audio';

/** Aviso para la UI segun el estado del contexto; null si no hay nada que decir. */
export function contextNotice(state: ContextState): ContextNotice | null {
  if (state === 'interrupted') {
    return { needsGesture: true, message: 'Audio interrumpido (llamada o segundo plano). Toca para reanudar.' };
  }
  if (state === 'suspended') {
    return { needsGesture: true, message: 'Audio en pausa. Toca para reanudar.' };
  }
  return null;
}
