# Historial

Formato por sesion (la mas reciente arriba, maximo 8 lineas):

## AAAA-MM-DD HH:MM
- Tarea:
- Hecho:
- Verificacion: build/test/e2e (ok o fallo), capturas en `artifacts/`
- Preview Vercel: URL o "no comprobada (motivo)"
- Siguiente:
- Bloqueos:

## 2026-10-27 10:50
- Tarea: arranque. SPEC.md desde fuentes publicas, tareas nuevas en TASKS.md, scaffold de Fase 0.
- Hecho: Vite 8.3.5, TS 6.0.3 (TS 7 no es compatible con typescript-eslint 8.72.1), ESLint 10, Vitest 5, Playwright 1.64 a 375x812.
- Verificacion: build ok, test ok (3), lint ok, e2e ok, captura en `artifacts/inicio.png`.
- Preview Vercel: no comprobada (PR sin abrir y repo no accesible sin autenticacion).
- Siguiente: Fase 0 "PWA: manifest, service worker, iconos propios".
- Bloqueos: PR claude/dev -> main sin abrir (no hay gh CLI y no se usaron credenciales locales); lo abre el usuario. Nombre del producto pendiente de eleccion.

Cuando haya mas de 15 entradas, resume las antiguas en un bloque "Resumen hasta AAAA-MM-DD" de 10 lineas.
