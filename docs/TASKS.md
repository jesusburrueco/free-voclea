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
- [ ] Sinte interno basico (osciladores + envolvente) para oir el resultado
- [ ] Salida Web MIDI con deteccion de soporte y selector de puerto
- [ ] Pitch bend continuo con rango configurable
- [ ] Medicion de latencia extremo a extremo y visualizacion en ajustes
- [ ] Modos de pitch bend anclado y fiel (selector, nombres propios)
- [ ] Bend activable por destino: melodia, acordes, ambos o ninguno
- [ ] Teclado de salida con silenciado de notas (tactil, multitouch)
- [ ] Visualizacion de afinacion en tiempo real (rueda de notas propia)
- [ ] Sugerencia de tonalidad a partir de notas cantadas

## Fase 2. Triggers (beatbox)
- [ ] Detector de onsets
- [ ] Extraccion de features (MFCC o similares) en Worker
- [ ] Entrenamiento por el usuario: grabar N ejemplos por slot, clasificador k-NN
- [ ] Mapeo slot a nota MIDI y a sample interno
- [ ] Velocidad a partir de la energia del golpe
- [ ] Sensibilidad de triggers, canal MIDI de triggers, nombre por trigger y borrado individual
- [ ] Kit de percusion interno sintetizado (propio)

## Fase 3. Acordes y control expresivo
- [ ] Modo acordes: generar acordes diatonicos a partir de la nota cantada, voicings e inversiones
- [ ] CC por envolvente de volumen y por timbre/vocal (mapeo configurable)
- [ ] Octava, transposicion, rango de notas permitido
- [ ] Mapeo de acordes personalizado por grado y variantes (triada, maj7, sus2, sus4)
- [ ] Bajo de raiz y octava de acordes (seguir octava cantada o fija)
- [ ] Canales MIDI separados para melodia, acordes y CC
- [ ] Presets de sinte internos propios para melodia y acordes

## Fase 4. Configuracion y perfiles
- [ ] Perfiles guardados (IndexedDB), exportar/importar JSON
- [ ] Calibracion guiada del micro y del rango vocal
- [ ] Todas las opciones de SPEC.md accesibles desde UI movil

## Fase 5. Pulido
- [ ] Auditoria de rendimiento en gama media Android (CPU del worklet < 30%)
- [ ] Accesibilidad y modo oscuro
- [ ] Pagina de ayuda propia
