export interface InputDevice {
  id: string;
  label: string;
}

/** Restricciones de captura para analisis: sin procesado del navegador que falsee pitch y nivel. */
export function buildAudioConstraints(deviceId?: string): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return { audio, video: false };
}

/** Filtra entradas de audio y da nombre de respaldo a las que no tienen etiqueta (antes del permiso). */
export function toInputDevices(devices: readonly Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[]): InputDevice[] {
  return devices
    .filter((d) => d.kind === 'audioinput' && d.deviceId !== '')
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Entrada ${i + 1}` }));
}

/** Si el dispositivo guardado ya no existe, se usa el predeterminado (undefined). */
export function resolveDeviceId(saved: string | undefined, devices: readonly InputDevice[]): string | undefined {
  return saved && devices.some((d) => d.id === saved) ? saved : undefined;
}
