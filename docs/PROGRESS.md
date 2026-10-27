# Historial

Formato por sesion (la mas reciente arriba, maximo 8 lineas):

## AAAA-MM-DD HH:MM
- Tarea:
- Hecho:
- Verificacion: build/test/e2e (ok o fallo), capturas en `artifacts/`
- Preview Vercel: URL o "no comprobada (motivo)"
- Siguiente:
- Bloqueos:

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
