export const FIXTURE_RATE = 44100;

export function sine(freq: number, seconds: number, amp = 0.5, rate = FIXTURE_RATE): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / rate);
  return out;
}

/** Barrido exponencial de f0 a f1 con fase continua. */
export function sweep(f0: number, f1: number, seconds: number, amp = 0.5, rate = FIXTURE_RATE): Float32Array {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  const k = Math.log(f1 / f0);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const phase = (2 * Math.PI * f0 * seconds * (Math.exp((k * t) / seconds) - 1)) / k;
    out[i] = amp * Math.sin(phase);
  }
  return out;
}

/** Ruido blanco determinista (mulberry32 con semilla fija). */
export function noise(seconds: number, seed = 1, amp = 0.5, rate = FIXTURE_RATE): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  let a = seed >>> 0;
  for (let i = 0; i < out.length; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out[i] = amp * (2 * u - 1);
  }
  return out;
}

/** WAV PCM de 16 bits, mono. */
export function encodeWav(samples: Float32Array, rate = FIXTURE_RATE): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true));
  return new Uint8Array(buf);
}

export function decodeWav(bytes: Uint8Array): { rate: number; samples: Float32Array } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rate = v.getUint32(24, true);
  const n = v.getUint32(40, true) / 2;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = v.getInt16(44 + i * 2, true) / 32767;
  return { rate, samples };
}

export const FIXTURES: Record<string, () => Float32Array> = {
  'sine-110.wav': () => sine(110, 1),
  'sine-220.wav': () => sine(220, 1),
  'sine-440.wav': () => sine(440, 1),
  'sine-880.wav': () => sine(880, 1),
  'sweep-100-1000.wav': () => sweep(100, 1000, 2),
  'noise-white.wav': () => noise(1),
};
