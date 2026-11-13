# Historial

Formato por sesion (la mas reciente arriba, maximo 8 lineas):

## AAAA-MM-DD HH:MM
- Tarea:
- Hecho:
- Verificacion: build/test/e2e (ok o fallo), capturas en `artifacts/`
- Preview Vercel: URL o "no comprobada (motivo)"
- Siguiente:
- Bloqueos:

## 2026-11-13 09:15
- Tarea: Fase 3 "Sugerencia de acordes para una melodia (2/2)": UI.
- Hecho: src/ui/chord-suggest-panel.ts (MelodyRecorder de note on/off a notas con duracion; tarjeta "Sugerir acordes" en la pestana Acordes con duracion por acorde 1/2/4 s, boton Grabar/Parar de 44px y lista de acordes con grado). Conectado a los eventos del detector en main.ts. Estado con aria-live (no role=status, chocaba con los e2e existentes).
- Verificacion: build, test (158), lint y e2e (25) ok. El e2e usa un WAV sintetico (C E G C) via --use-file-for-fake-audio-capture; captura `artifacts/sugerir-acordes.png`.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; probar en movil real (iOS y Android) y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-12 09:10
- Tarea: backlog sin `[ ]`; se anade en Fase 3 "Sugerencia de acordes para una melodia" (SPEC.md 4, sin implementar), partida en 2. Hecha la 1/2.
- Hecho: src/chord-suggest.ts (triadas diatonicas, acorde por tramo por cobertura, raiz, nota inicial y grados principales; reparto por duracion) y test/chord-suggest.test.ts (15 tests).
- Verificacion: build, test (153), lint y e2e (24) ok; un fallo puntual en triggers.spec.ts (grabar ejemplos) paso 3/3 al repetir, sin relacion con el cambio. Sin cambios de UI ni capturas nuevas.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: Sugerencia de acordes (2/2): UI que graba la melodia y muestra los acordes.
- Bloqueos: ninguno. Vigilar flakiness de e2e/triggers.spec.ts:32.

## 2026-11-10 09:00
- Tarea: auditoria semanal (diff de 7 dias).
- Hallazgos: el unico commit de la semana (96d6639) es solo docs/PROGRESS.md; sin cambios de codigo, audio, UI ni marcas que revisar.
- Arreglados: nada. PROGRESS.md tiene 5 entradas, no hace falta resumir.
- Tareas creadas: ninguna.
- Verificacion: build, test (138) y e2e (24) ok.

## 2026-11-03 09:00
- Tarea: auditoria semanal (diff de 7 dias, 9 commits).
- Hallazgos: sin bloqueos del hilo principal ni reservas nuevas en el worklet (buffers de modulo en pitch.ts y features.ts, uso en un solo hilo); AudioContext iOS cubierto (statechange, visibilitychange, boton 44px); sin marcas en codigo, UI ni manifest (solo CLAUDE.md, prompts/01-arranque.md y el test que las prohibe).
- Hallazgos: PROGRESS.md tenia 19 entradas y la plantilla en medio del historial; corregido.
- Hallazgos: sin medicion de GC ni CPU real en worklet (ya anotado); sin codigo muerto nuevo.
- Arreglados: PROGRESS.md resumido (regla del archivo) y plantilla movida al inicio. Sin cambios de codigo.
- Tareas creadas: ninguna.
- Verificacion: build, test, lint y e2e (24) ok.

## 2026-10-30 09:13
- Tarea: Fase 5 "AUDIT: marcas del producto original en SPEC.md".
- Hecho: decision de sustituir las URLs con marca por descripciones neutras de cada fuente (fabricante, revistas, webs) en docs/SPEC.md; ya no aparece ninguna marca en SPEC.md. Quedan menciones solo en CLAUDE.md, prompts/01-arranque.md y un test que las prohibe en el manifest (no tocados: CLAUDE.md es intocable).
- Verificacion: build, test (138) y e2e (24) ok (e2e con CHROMIUM_PATH).
- Preview Vercel: produccion no comprobada (red).
- Siguiente: no quedan tareas `[ ]` en TASKS.md; anadir nuevas tareas o revisar el backlog.
- Bloqueos: ninguno.

## 2026-10-29 09:10
- Tarea: Fase 5 "AUDIT: iOS puede dejar el AudioContext en estado interrupted/suspended".
- Hecho: context-state.ts (aviso puro por estado), engine escucha `statechange` y `visibilitychange` (reintenta resume al volver), expone `resume()`; boton "Reanudar audio" (44px) y mensaje en la UI. Test unitario y e2e que suspende el contexto y lo reanuda (`artifacts/contexto.png`).
- Verificacion: build, test, lint y e2e (24) ok.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: "AUDIT: SPEC.md cita las marcas del producto original en las URLs de fuentes".
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-10-28 09:20
- Tarea: Fase 5 "AUDIT: el worklet reserva memoria en cada informe".
- Hecho: pitch.ts reutiliza buffers de diezmado y de diferencias; features.ts usa re/im/power/logMel de modulo y acepta `out` opcional; el worklet pasa un buffer propio. Tests de reutilizacion en pitch y rasgos. Sin medicion de GC real (no hay perfil de worklet aqui); queda solo el `Array.from` por golpe, necesario para el mensaje.
- Verificacion: build, test (136), lint y e2e (23) ok; un fallo aislado en audio.spec.ts no se repitio (2 reejecuciones ok).
- Preview Vercel: produccion no comprobada (red). El cambio no es visible en la UI.
- Siguiente: "AUDIT: iOS puede dejar el AudioContext en estado interrupted/suspended".
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-10-27 13:12
- Tarea: auditoria semanal (diff de 7 dias).
- Hallazgos: (1) worklet reserva memoria por informe y por golpe; (2) sin manejo de AudioContext interrumpido en iOS; (3) SPEC.md nombra marcas en URLs de fuentes. Sin otras violaciones de marca en codigo, manifest ni UI; objetivos tactiles >= 44px; sin codigo muerto evidente.
- Arreglados: nada (ningun arreglo cabe en <30 lineas con test seguro).
- Tareas creadas: 3 "AUDIT:" al principio de Fase 5.
- Verificacion: build, test y e2e (23) ok.

## Resumen hasta 2026-10-27
- Fase 0 completa: scaffold Vite 8 + TS 6 estricto, ESLint 10, Vitest 5, Playwright 1.64 a 375x812 (en este entorno hace falta CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome).
- PWA propia (manifest, sw.js, iconos), pipeline getUserMedia + AudioWorklet con buffer circular, AudioContext creado y reanudado antes de cualquier await (iOS), pantalla de permisos, banco de fixtures sinteticos, selector de entrada sin AGC/NS/eco.
- Fase 1: YIN perezoso con diezmado, segmentacion con histeresis, cuantizacion a escala, sinte interno, Web MIDI con selector de puerto, pitch bend (rango, modos, destinos), latencia, teclado de silenciado, rueda de afinacion, sugerencia de tonalidad.
- Fase 2: onsets, MFCC en el worklet, k-NN con entrenamiento por el usuario, mapeo a notas y kit interno, velocidad por energia.
- Fase 3: acordes diatonicos con variantes, bajo e inversiones, CC por volumen y timbre, octava, rango, canales separados, presets de sinte.
- Fase 4: perfiles en IndexedDB con exportar/importar, calibracion guiada, todas las opciones en UI movil.
- Fase 5: estimacion de CPU del worklet ~21% con factor x6 (falta medir en Android real), accesibilidad, tema claro/oscuro, ayuda propia en public/ayuda.html, interfaz con barra de pestanas inferior.
- Limites: el e2e usa el micro falso de Chromium; la precision con voz real solo se prueba con fixtures. Sin presets tipo Pop ni sugerencia de acordes para melodia.
- Preview Vercel nunca comprobada (red); PR claude/dev -> main lo abre el usuario.
- Siguiente pendiente global: probar en movil real (iOS y Android), medir CPU y latencia, afinar umbrales con voz real.

Cuando haya mas de 15 entradas, resume las antiguas en un bloque "Resumen hasta AAAA-MM-DD" de 10 lineas.
