# Backlog

Estados: `[ ]` pendiente, `[~]` en curso, `[x]` hecha, `[!]` bloqueada (motivo en PROGRESS.md).
Regla: el agente coge la primera `[ ]` de la fase activa mas baja. Puede anadir tareas al final de la fase que toque, nunca reordenar las de otras fases.

## Fase 0. Base
- [x] Scaffold Vite + TS estricto, ESLint, Vitest, Playwright (viewport 375x812), scripts del CLAUDE.md
- [x] PWA: manifest, service worker, iconos propios
- [x] Pipeline de audio: getUserMedia + AudioWorklet con buffer circular, medidor de nivel en UI
- [x] Desbloqueo de AudioContext por gesto (requisito iOS) y pantalla de permisos de micro
- [x] Banco de pruebas: carpeta `test/fixtures` con audio sintetico generado por script (senos, barridos, ruido) para tests deterministas
- [x] Selector de dispositivo de entrada y restricciones de getUserMedia (sin AGC, sin supresion de ruido, sin cancelacion de eco)

## Fase 1. Pitch a notas
- [x] Detector de pitch (YIN o MPM) en el worklet, con test contra fixtures (error < 10 cents en senos)
- [x] Segmentacion de notas: note on/off con histeresis y umbral de nivel
- [x] Cuantizacion a escala y tonalidad (todas las escalas de SPEC.md)
- [x] Sinte interno basico (osciladores + envolvente) para oir el resultado
- [x] Salida Web MIDI con deteccion de soporte y selector de puerto
- [x] Pitch bend continuo con rango configurable
- [x] Medicion de latencia extremo a extremo y visualizacion en ajustes
- [x] Modos de pitch bend anclado y fiel (selector, nombres propios)
- [x] Bend activable por destino: melodia, acordes, ambos o ninguno
- [x] Teclado de salida con silenciado de notas (tactil, multitouch)
- [x] Visualizacion de afinacion en tiempo real (rueda de notas propia)
- [x] Sugerencia de tonalidad a partir de notas cantadas
- [x] Rueda de notas tactil: pulsar un sector silencia o activa esa nota, sincronizada con el teclado y con marca visual de silenciada (SPEC.md 2), con tests y e2e 375x812
- [x] Teclado de salida (1/2): marcar las teclas fuera de la tonalidad y escala elegidas (SPEC.md 2, restricciones de tonalidad), sincronizado al cambiar tonica o escala, con tests y e2e 375x812
- [x] Teclado de salida (2/2): marcar las notas extra del acorde que suena en modo acordes (SPEC.md 2), con tests y e2e 375x812

## Fase 2. Triggers (beatbox)
- [x] Detector de onsets
- [x] Extraccion de features (MFCC o similares) en Worker (corre en el worklet)
- [x] Entrenamiento por el usuario: grabar N ejemplos por slot, clasificador k-NN
- [x] Mapeo slot a nota MIDI y a sample interno
- [x] Velocidad a partir de la energia del golpe
- [x] Sensibilidad de triggers, canal MIDI de triggers, nombre por trigger y borrado individual
- [x] Kit de percusion interno sintetizado (propio)

## Fase 3. Acordes y control expresivo
- [x] Modo acordes: generar acordes diatonicos a partir de la nota cantada, voicings e inversiones
- [x] CC por envolvente de volumen y por timbre/vocal (mapeo configurable)
- [x] Octava, transposicion, rango de notas permitido
- [x] Mapeo de acordes personalizado por grado y variantes (triada, maj7, sus2, sus4)
- [x] Bajo de raiz y octava de acordes (seguir octava cantada o fija)
- [x] Canales MIDI separados para melodia, acordes y CC
- [x] Presets de sinte internos propios para melodia y acordes
- [x] Sugerencia de acordes para una melodia (1/2): logica pura, un acorde diatonico por tramo, con tests
- [x] Sugerencia de acordes para una melodia (2/2): UI que graba la melodia cantada y muestra los acordes sugeridos, e2e 375x812
- [x] Presets de mapeo de acordes Pop y Pop avanzado (1/2): tablas propias para mayor y menor en buildChord y saneado del ajuste, con tests
- [x] Presets de mapeo de acordes Pop y Pop avanzado (2/2): selector de preset en la pestana Acordes y guardado en perfil, e2e 375x812

## Fase 4. Configuracion y perfiles
- [x] Perfiles guardados (IndexedDB), exportar/importar JSON
- [x] Calibracion guiada del micro y del rango vocal
- [x] Todas las opciones de SPEC.md accesibles desde UI movil
- [x] Perfiles: duplicar un perfil guardado con nombre libre (sin pisar otro) y pedir `navigator.storage.persist()` al guardar (SPEC.md 7), con tests y e2e 375x812

## Fase 5. Pulido
- [x] AUDIT: MelodyRecorder (src/ui/chord-suggest-panel.ts) descarta los silencios, asi que los tramos de "Duracion de cada acorde" se miden sobre tiempo cantado y no sobre tiempo real: con pausas los acordes se desplazan respecto a la melodia. Registrar los silencios como tramos sin nota (que no cuenten en el encaje y repitan el acorde anterior) y probarlo en chord-suggest y en el panel
- [x] AUDIT: el worklet reserva memoria en cada informe (pitch.ts decima con `new Float32Array` y crea `d`; features.ts crea arrays y `Array.from` por golpe). Prealocar buffers reutilizables y medir GC
- [x] AUDIT: iOS puede dejar el AudioContext en estado `interrupted`/`suspended` (llamada, segundo plano). Escuchar `statechange` y `visibilitychange`, reanudar con un gesto y avisar en la UI; test e2e
- [x] AUDIT: SPEC.md cita las marcas del producto original en las URLs de fuentes. Decidir si se admite como bibliografia o se sustituye por descripciones neutras (regla de marca de CLAUDE.md)
- [x] Auditoria de rendimiento en gama media Android (CPU del worklet < 30%)
- [x] Accesibilidad y modo oscuro
- [x] Pagina de ayuda propia
- [x] Estabilizar e2e/triggers.spec.ts:32 (intermitente): esperar al estado duradero del slot (5 ejemplos, boton Grabar) en vez del aviso "Listo.", que el siguiente golpe sobrescribe
- [x] Aviso "Listo." de grabacion de triggers: mantenerlo unos segundos (READY_HOLD_MS) aunque lleguen golpes, con test y e2e 375x812
