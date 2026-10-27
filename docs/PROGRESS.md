# Historial

Formato por sesion (la mas reciente arriba, maximo 8 lineas):

## AAAA-MM-DD HH:MM
- Tarea:
- Hecho:
- Verificacion: build/test/e2e (ok o fallo), capturas en `artifacts/`
- Preview Vercel: URL o "no comprobada (motivo)"
- Siguiente:
- Bloqueos:

## 2026-10-27 19:00
- Tarea: Fase 1 "Sinte interno basico (osciladores + envolvente)".
- Hecho: synth.ts (envelopeGain ADSR pura y Synth monofonico con oscilador triangulo), conectado en engine.ts a los note on/off del worklet, casilla "Sonido interno" y ultima nota detectada en la UI.
- Verificacion: build, test (58), lint y e2e ok (6), captura `artifacts/sinte.png`. El e2e no afirma la deteccion de nota: el micro falso de Chromium emite pitidos muy cortos y espaciados.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Fase 1 "Salida Web MIDI con deteccion de soporte y selector de puerto".
- Bloqueos: ninguno.

## 2026-10-27 18:00
- Tarea: Fase 1 "Cuantizacion a escala y tonalidad (todas las escalas de SPEC.md)".
- Hecho: src/scales.ts (15 escalas: 14 documentadas mas cromatica, quantizeToScale a la nota de escala mas cercana, empates hacia abajo, tonica 0..11), 7 tests deterministas. Sin integrar aun en la UI ni en el flujo de notas.
- Verificacion: build, test (54), lint y e2e ok (5, CHROMIUM_PATH del entorno; un fallo intermitente de audio.spec en una ejecucion, no reproducido en 3 mas). Sin captura nueva.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Fase 1 "Sinte interno basico (osciladores + envolvente)".
- Bloqueos: ninguno.

## 2026-10-27 17:00
- Tarea: Fase 1 "Segmentacion de notas: note on/off con histeresis y umbral de nivel".
- Hecho: src/audio/segmenter.ts (NoteSegmenter puro: umbral de entrada en dBFS con histeresis de nivel, claridad minima, tiempos de apertura/cierre, pegajosidad en semitonos y tiempo minimo de cambio), integrado en capture-processor (campo events en el mensaje), 8 tests deterministas.
- Verificacion: build, test (47), lint y e2e ok (5, CHROMIUM_PATH del entorno). Sin UI nueva, sin captura nueva.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Fase 1 "Cuantizacion a escala y tonalidad (todas las escalas de SPEC.md)".
- Bloqueos: ninguno.

## 2026-10-27 16:00
- Tarea: Fase 1 "Detector de pitch (YIN o MPM) en el worklet".
- Hecho: src/audio/pitch.ts (YIN con interpolacion parabolica, devuelve freq y claridad), integrado en capture-processor (ventana 2048, campos freq y clarity en el mensaje), tests contra fixtures: senos 110 a 880 Hz con error < 10 cents, barrido, ruido y silencio sin tono.
- Verificacion: build, test (39), lint y e2e ok (5). Sin UI nueva, sin captura nueva.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Fase 1 "Segmentacion de notas: note on/off con histeresis y umbral de nivel".
- Bloqueos: ninguno.

## 2026-10-27 15:00
- Tarea: Fase 0 "Selector de dispositivo de entrada y restricciones de getUserMedia".
- Hecho: src/audio/constraints.ts (sin AGC, supresion de ruido ni eco, mono, deviceId exact), selector en UI con lista por enumerateDevices, devicechange y recuerdo en localStorage, fallback si el dispositivo guardado desaparece.
- Verificacion: build, test (32), lint y e2e ok (5, CHROMIUM_PATH del entorno), captura `artifacts/entrada.png`.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Fase 1 "Detector de pitch (YIN o MPM) en el worklet".
- Bloqueos: ninguno.

## 2026-10-27 14:00
- Tarea: Fase 0 "Banco de pruebas: test/fixtures con audio sintetico".
- Hecho: generadores deterministas (seno, barrido exponencial, ruido con semilla) y codec WAV en test/fixtures/signals.ts, `npm run fixtures` escribe los WAV, test que verifica generadores y que los WAV coinciden byte a byte.
- Verificacion: build, test (26), lint y e2e ok (e2e con CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome, el Chromium por defecto del entorno no coincide con Playwright 1.64.1).
- Preview Vercel: produccion no comprobada (red).
- Siguiente: "Selector de dispositivo de entrada y restricciones de getUserMedia".
- Bloqueos: ninguno.

## 2026-10-27 13:00
- Tarea: Fase 0 "Desbloqueo de AudioContext por gesto y pantalla de permisos de micro".
- Hecho: AudioContext creado y reanudado antes de cualquier await (iOS), mic-error.ts (clasifica errores y mensajes), texto de permiso en UI, boton Reintentar, deteccion de navegador sin soporte.
- Verificacion: build, test, lint y e2e ok (4 e2e), captura `artifacts/permiso.png`.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: "Banco de pruebas: test/fixtures con audio sintetico".
- Bloqueos: ninguno.

## 2026-10-27 12:00
- Tarea: Fase 0 "Pipeline de audio: getUserMedia + AudioWorklet con buffer circular, medidor de nivel en UI".
- Hecho: RingBuffer y medidor de nivel (puros, con tests), capture-processor (worklet, `?worker&url`), engine.ts, boton Activar micro y `<meter>` en UI.
- Verificacion: build, test (13), lint y e2e ok (micro falso de Chromium), captura `artifacts/audio.png`.
- Preview Vercel: no comprobada (red). PR #1 abierto, la vista previa seguia en construccion.
- Siguiente: "Desbloqueo de AudioContext por gesto y pantalla de permisos de micro".
- Bloqueos: ninguno.

## 2026-10-27 11:10
- Tarea: Fase 0 "PWA: manifest, service worker, iconos propios".
- Hecho: manifest, sw.js (red primero en navegacion, cache primero en estaticos), iconos propios (svg, 192, 512, maskable), registro solo en produccion, @types/node, CHROMIUM_PATH opcional en playwright.
- Verificacion: build, test (6), lint y e2e ok (e2e con CHROMIUM_PATH=/opt/pw-browsers/chromium), captura `artifacts/pwa.png`.
- Preview Vercel: no comprobada (red). PR #1 abierto.
- Siguiente: "Pipeline de audio: getUserMedia + AudioWorklet".
- Bloqueos: ninguno. El push dio 403 hasta que se dio acceso a la app de GitHub; resuelto y subido a claude/dev.

## 2026-10-27 10:50
- Tarea: arranque. SPEC.md desde fuentes publicas, tareas nuevas en TASKS.md, scaffold de Fase 0.
- Hecho: Vite 8.3.5, TS 6.0.3 (TS 7 no es compatible con typescript-eslint 8.72.1), ESLint 10, Vitest 5, Playwright 1.64 a 375x812.
- Verificacion: build ok, test ok (3), lint ok, e2e ok, captura en `artifacts/inicio.png`.
- Preview Vercel: no comprobada (PR sin abrir y repo no accesible sin autenticacion).
- Siguiente: Fase 0 "PWA: manifest, service worker, iconos propios".
- Bloqueos: PR claude/dev -> main sin abrir (no hay gh CLI y no se usaron credenciales locales); lo abre el usuario. Nombre del producto pendiente de eleccion.

Cuando haya mas de 15 entradas, resume las antiguas en un bloque "Resumen hasta AAAA-MM-DD" de 10 lineas.
