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

## Fase 4. Configuracion y perfiles
- [x] Perfiles guardados (IndexedDB), exportar/importar JSON
- [x] Calibracion guiada del micro y del rango vocal
- [x] Todas las opciones de SPEC.md accesibles desde UI movil

## Fase 5. Pulido
- [x] Auditoria de rendimiento en gama media Android (CPU del worklet < 30%)
- [x] Accesibilidad y modo oscuro
- [x] Pagina de ayuda propia
