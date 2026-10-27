export type MicErrorKind = 'denied' | 'no-device' | 'busy' | 'unsupported' | 'unknown';

/** Traduce el error de getUserMedia / AudioContext a una categoria que la UI sabe explicar. */
export function classifyMicError(err: unknown): MicErrorKind {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'no-device';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    case 'UnsupportedError':
      return 'unsupported';
    default:
      return 'unknown';
  }
}

export const MIC_ERROR_MESSAGES: Record<MicErrorKind, string> = {
  denied: 'Permiso de micro denegado. Activalo en los ajustes del navegador para este sitio y pulsa Reintentar.',
  'no-device': 'No se encontro ningun micro. Conecta uno y pulsa Reintentar.',
  busy: 'El micro esta ocupado por otra aplicacion. Cierrala y pulsa Reintentar.',
  unsupported: 'Este navegador no permite capturar audio del micro.',
  unknown: 'No se pudo abrir el micro. Pulsa Reintentar.',
};

export function isMicSupported(nav: { mediaDevices?: unknown }, win: { AudioContext?: unknown }): boolean {
  return !!nav.mediaDevices && typeof win.AudioContext === 'function';
}
