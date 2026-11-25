# Historial

Formato por sesion (la mas reciente arriba, maximo 8 lineas):

## AAAA-MM-DD HH:MM
- Tarea:
- Hecho:
- Verificacion: build/test/e2e (ok o fallo), capturas en `artifacts/`
- Preview Vercel: URL o "no comprobada (motivo)"
- Siguiente:
- Bloqueos:

## 2026-11-25 09:15
- Tarea: backlog sin `[ ]`; se anade en Fase 1 "Teclado de salida" (SPEC.md 2: el teclado debe mostrar las restricciones de tonalidad y las notas extra de acordes, faltaba), partida en 2. Hecha la 1/2.
- Hecho: `MuteKeyboard.setScale` en src/ui/keyboard.ts marca con clase `fuera` (borde discontinuo, texto atenuado) las teclas fuera de tonica y escala, y lo anade a la etiqueta accesible; se llama desde refreshWheelScale en main.ts (cambio de tonica, escala, sugerencia aplicada y carga). No cambia el silenciado. 3 tests en test/wheel.test.ts y e2e nuevo en e2e/teclado.spec.ts (Sol mayor, 5 teclas fuera, >= 44 px, persiste tras recargar).
- Verificacion: build, test (183), lint y e2e (28) ok con CHROMIUM_PATH=/opt/pw-browsers/chromium. Captura `artifacts/teclado-escala.png`.
- Preview Vercel: produccion no comprobada (red, curl sin respuesta).
- Siguiente: Teclado de salida (2/2): marcar las notas extra del acorde que suena en modo acordes.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-24 12:00
- Tarea: auditoria semanal (diff de 7 dias, 11 commits: silencios en acordes, duplicar perfiles, rueda tactil, aviso Listo. de triggers).
- Hallazgos: la rueda silenciaba en `pointerdown`: en movil, empezar a desplazar la pagina con el dedo sobre la rueda silenciaba una nota sin querer. Corregido.
- Hallazgos: sin cambios en worklet ni motor; `wheel.update` repinta 12 sectores por informe en el hilo principal (coste minimo). Sin marcas nuevas ni rayas largas.
- Hallazgos: sectores de la rueda >= 44px (ancho maximo 280px, anillo de ~51px); `PitchWheel.mutedSet` solo se usa en tests. Tests nuevos prueban comportamiento real.
- Arreglados: rueda usa `click` en vez de `pointerdown` (src/ui/wheel.ts), test de que un pointerdown suelto no silencia. PROGRESS.md resumido (16 entradas).
- Tareas creadas: ninguna.
- Verificacion: build, test (180), lint y e2e (27) ok con CHROMIUM_PATH=/opt/pw-browsers/chromium.

## 2026-11-24 09:15
- Tarea: backlog sin `[ ]`; se anade y hace en Fase 5 "Aviso Listo. de grabacion de triggers" (sugerido en la sesion anterior).
- Hecho: src/beat/slots.ts con `READY_HOLD_MS` (2,5 s) y `hitMayOverwriteStatus`; en src/ui/triggers.ts los golpes no sustituyen "Listo." durante ese tiempo (se anula al grabar de nuevo o parar el motor). Test unitario y e2e/triggers.spec.ts comprueba que "Listo." sigue visible 0,8 s despues.
- Verificacion: build, test (179), lint y e2e (27) ok con CHROMIUM_PATH=/opt/pw-browsers/chromium; triggers.spec.ts:32 6 de 6 repeticiones ok. Captura `artifacts/triggers-listo.png`.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; probar en movil real (iOS y Android) y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-23 09:15
- Tarea: backlog sin `[ ]`; se anade y hace en Fase 5 "Estabilizar e2e/triggers.spec.ts:32" (intermitente desde hace varias sesiones).
- Hecho: causa encontrada: la grabacion siempre terminaba (5 ejemplos), pero el aviso "Listo." lo sobrescribe `onHit` con el siguiente pitido ya clasificado y el test a veces no llegaba a verlo. El test espera ahora a "5 ejemplos" en el slot 3, al boton "Grabar" y a que el aviso deje de pedir sonidos.
- Verificacion: antes 2 de 4 repeticiones fallaban; despues 8 de 8 ok. build, test (178), lint y e2e (27) ok con CHROMIUM_PATH=/opt/pw-browsers/chromium. Sin cambios de UI ni capturas nuevas.
- Preview Vercel: produccion no comprobada (red).
- Siguiente: no quedan tareas `[ ]`; valorar que "Listo." dure unos segundos en la UI, probar en movil real y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-20 09:15
- Tarea: backlog sin `[ ]`; se anade y hace en Fase 1 "Rueda de notas tactil" (SPEC.md 2: pulsar un punto de la rueda desactiva la nota, faltaba).
- Hecho: src/ui/wheel.ts acepta `onTap` y `setMuted`; cada sector (data-pc) alterna el silenciado via `keyboard.toggle`, sincronizado en ambos sentidos y restaurado al cargar; sector silenciado con trazo discontinuo (src/style.css). test/wheel.test.ts (3) y e2e nuevo en e2e/teclado.spec.ts (sector >= 44 px, sincronia, persistencia tras recargar).
- Verificacion: build, test (178), lint y e2e (27) ok con CHROMIUM_PATH=/opt/pw-browsers/chromium (sin el, Playwright busca un headless que no existe). triggers.spec.ts:32 fallo una vez en la suite completa y paso en solitario (intermitente ya visto). Captura `artifacts/rueda-silenciar.png`.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; estabilizar triggers.spec.ts:32, probar en movil real y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-19 09:15
- Tarea: backlog sin `[ ]`; se anade y hace en Fase 4 "Perfiles: duplicar y pedir persistencia" (SPEC.md 7, faltaba).
- Hecho: src/profiles.ts con `uniqueName` (sufijo "(copia N)" sin pasar de 40), `duplicateProfile` (copia profunda) y `requestPersistence`; boton "Duplicar perfil" (usa el nombre escrito o el del perfil elegido) en src/ui/setup.ts; se pide `navigator.storage.persist()` al guardar, duplicar e importar. 3 tests nuevos y e2e de perfiles ampliado.
- Verificacion: build, test (175), lint y e2e (26) ok; un fallo aislado en triggers.spec.ts no se repitio (2 reejecuciones ok). Captura `artifacts/perfiles.png`.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; probar en movil real (iOS y Android) y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-18 09:15
- Tarea: Fase 5 "AUDIT: MelodyRecorder descarta los silencios".
- Hecho: `MelodyNote.note` admite `null` (silencio). MelodyRecorder guarda los huecos entre notas como silencios (no el de antes de la primera ni despues de la ultima); chordForSegment no los cuenta en el encaje, un tramo solo de silencio repite el acorde anterior y suggestChords recorta silencios iniciales y finales. 6 tests nuevos.
- Verificacion: build, test (172), lint y e2e (26) ok. Sin cambios visuales de UI ni capturas nuevas.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; probar en movil real (iOS y Android) y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-17 09:15
- Tarea: Fase 3 "Presets de mapeo de acordes Pop y Pop avanzado (2/2)": selector y perfil.
- Hecho: selector "Mapeo de acordes" (Triadas, Pop, Pop avanzado) con pista en la pestana Acordes de src/ui/output-panel.ts; se guarda en localStorage `salida` y, por tanto, en el perfil. Nuevo e2e/mapeo-acordes.spec.ts.
- Verificacion: build, test (166), lint y e2e (26) ok; captura `artifacts/mapeo-acordes.png`.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: no quedan tareas `[ ]`; probar en movil real (iOS y Android) y afinar umbrales con voz real.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

## 2026-11-16 09:15
- Tarea: backlog sin `[ ]`; se anade en Fase 3 "Presets de mapeo de acordes Pop y Pop avanzado" (SPEC.md 4, sin implementar), partida en 2. Hecha la 1/2.
- Hecho: src/audio/chords.ts con `ChordMapping` (triads, pop, popPlus), tablas propias para Mayor y Menor natural (el acorde contiene la nota cantada, raiz en la octava igual o inferior) y `mappedDegree`; saneado en router.ts; output-panel conserva el preset hasta tener selector. 8 tests nuevos.
- Verificacion: build, test (166), lint y e2e (25) ok. Sin cambios de UI ni capturas nuevas.
- Preview Vercel: produccion no comprobada (red, proxy 403).
- Siguiente: Presets de mapeo Pop (2/2): selector en la pestana Acordes y guardado en perfil, e2e 375x812.
- Bloqueos: ninguno. Se trabajo en claude/dev segun la tarea programada.

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

## 2026-11-17 09:00
- Tarea: auditoria semanal (diff de 7 dias, 10 commits: sugerencia de acordes y presets de mapeo Pop).
- Hallazgos: sin cambios en el worklet ni en el motor; la grabacion de melodia corre en el hilo principal pero solo apila eventos (coste minimo). Sin marcas nuevas ni rayas largas.
- Hallazgos: tablas Pop/Pop avanzado revisadas grado a grado, cada acorde contiene la nota cantada; tests cubren mapeo, raiz por debajo y saneado.
- Hallazgos: MelodyRecorder ignora los silencios, los tramos de acorde se desplazan respecto al tiempo real si hay pausas.
- Hallazgos: UI nueva con objetivos >= 44px (button/select globales, chips .sugeridos 44px); e2e a 375x812 cubre ambas pantallas.
- Arreglados: nada (el arreglo de silencios toca logica y UI, no cabe como cambio pequeno seguro).
- Tareas creadas: 1 "AUDIT:" al principio de Fase 5 (silencios en la sugerencia de acordes).
- Verificacion: build, test (166) y e2e (26) ok.

## Resumen hasta 2026-11-10
- Fase 0: Vite 8 + TS 6 estricto, ESLint 10, Vitest 5, Playwright 1.64 a 375x812 (aqui hace falta CHROMIUM_PATH=/opt/pw-browsers/chromium). PWA propia, getUserMedia + AudioWorklet, AudioContext creado y reanudado antes de cualquier await (iOS).
- Fase 1: YIN con diezmado, segmentacion con histeresis, cuantizacion a escala, sinte interno, Web MIDI, pitch bend, latencia, teclado de silenciado, rueda de afinacion, sugerencia de tonalidad.
- Fase 2: onsets, MFCC en el worklet, k-NN entrenado por el usuario, kit interno, velocidad por energia.
- Fase 3: acordes diatonicos con variantes, bajo e inversiones, CC por volumen y timbre, octava, rango, canales, presets de sinte.
- Fase 4: perfiles en IndexedDB con exportar/importar, calibracion guiada, opciones en UI movil.
- Fase 5: CPU del worklet estimada ~21%, accesibilidad, tema claro/oscuro, ayuda propia, barra de pestanas inferior.
- Auditorias 10-27 a 11-10: worklet sin reservas por informe (buffers de modulo), AudioContext iOS interrumpido gestionado (statechange, visibilitychange, boton Reanudar 44px), marcas retiradas de SPEC.md.
- Limites: e2e con micro falso de Chromium; precision con voz real solo con fixtures; sin medicion de GC ni CPU en Android real.
- Preview Vercel nunca comprobada (red); PR claude/dev -> main lo abre el usuario.
- Pendiente global: probar en movil real (iOS y Android), medir CPU y latencia, afinar umbrales con voz real.

Cuando haya mas de 15 entradas, resume las antiguas en un bloque "Resumen hasta AAAA-MM-DD" de 10 lineas.
