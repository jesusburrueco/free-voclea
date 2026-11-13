# Especificacion funcional

Nombre del producto: PENDIENTE DE ELECCION. Propuestas: "Tarareo", "VozNota", "Hummline".

Este documento lo completa el agente en la sesion de arranque a partir de fuentes publicas (manual oficial, pagina de producto, videos). Cada funcion lleva su fuente. Nada se describe a partir de binarios o codigo del producto original.

Convenciones:
- "el original" = el plugin de referencia citado en CLAUDE.md. Su marca no aparece en este documento; las fuentes se describen de forma neutra.
- "sin fuente" = la opcion existe pero su rango, valor por defecto o comportamiento exacto no esta documentado publicamente. Lo decidimos nosotros y lo marcamos como decision propia.
- Cuando dos fuentes se contradicen se anotan ambas y se indica la decision.

## Fuentes
- [F1] Tutorial oficial del fabricante sobre ajustes de pitch y control (consultado 2026-10-27)
- [F2] Tutorial oficial del fabricante sobre acordes (consultado 2026-10-27)
- [F3] Tutorial oficial del fabricante sobre como anadir triggers (consultado 2026-10-27)
- [F4] Tutorial oficial del fabricante con consejos para triggers (consultado 2026-10-27)
- [F5] Blog oficial del fabricante, 10 consejos para empezar (consultado 2026-10-27)
- [F6] Blog oficial del fabricante, novedades de la version 2 (consultado 2026-10-27)
- [F7] Resena de la revista Sound On Sound (consultado 2026-10-27)
- [F8] Resena de la web MusicTech (consultado 2026-10-27)
- [F9] Resena de la web Bonedo (aleman) (consultado 2026-10-27)
- [F10] Tutoriales oficiales del fabricante sobre latencia y calibracion del micro (consultado 2026-10-27)

## Plantilla por funcion
### <Nombre de la funcion>
- Que hace (comportamiento observable):
- Parametros configurables y rangos:
- Equivalente web y limitaciones (ej. sin Web MIDI en iOS):
- Fuente:
- Tarea(s) en TASKS.md:

---

## 1. Entrada de audio y calibracion

### Seleccion de entrada y ajustes de audio
- Que hace: elegir dispositivo de entrada, frecuencia de muestreo y tamano de buffer. El original recomienda 44100 Hz y buffer de 128 muestras o menos.
- Parametros configurables y rangos: dispositivo; sample rate (recomendado 44100); buffer (recomendado <= 128). Rango completo: sin fuente.
- Equivalente web y limitaciones: `getUserMedia` con `deviceId`; el sample rate lo impone el `AudioContext` (normalmente 44100 o 48000); el bloque del worklet es fijo de 128 frames. `latencyHint: "interactive"`. Desactivar `echoCancellation`, `noiseSuppression` y `autoGainControl`. En iOS no se puede elegir dispositivo de forma fiable.
- Fuente: [F10], [F7]
- Tarea(s): Fase 0 "Pipeline de audio"; Fase 0 "Selector de dispositivo de entrada y restricciones de getUserMedia".

### Calibracion del micro
- Que hace: proceso guiado (unos 30 s) que analiza ganancia de entrada, tono y timbre de la voz; el usuario canta C, F y G mientras la pantalla muestra la nota detectada. Recuerda que dispositivos ya estan calibrados.
- Parametros configurables y rangos: ninguno expuesto. Que se ajusta internamente: sin fuente.
- Equivalente web y limitaciones: asistente propio que mide ruido de fondo, nivel de pico y rango vocal, y deriva umbral de entrada y rango de notas. Guardado por `deviceId` (en iOS el id puede cambiar entre sesiones).
- Fuente: [F9], [F6], [F8]
- Tarea(s): Fase 4 "Calibracion guiada del micro y del rango vocal".

### Nivel de entrada (Input / sensibilidad)
- Que hace: umbral de nivel a partir del cual se reacciona. Valores altos sirven para cantar bajo o tararear pero captan mas ruido; bajos para cantar fuerte o entornos ruidosos. Bajarlo reduce saltos de nota.
- Parametros configurables y rangos: control continuo. Rango y defecto: sin fuente.
- Equivalente web y limitaciones: slider 0..1 mapeado a umbral en dBFS (decision propia: -60 a -10 dBFS).
- Fuente: [F1], [F5], [F9]
- Tarea(s): Fase 1 "Segmentacion de notas".

## 2. Pitch

### Deteccion de pitch monofonica
- Que hace: convierte la voz cantada, tarareada o silbada en notas MIDI monofonicas. Latencia algo mayor que la de los triggers. Sin microtonos (no hay cuartos de tono).
- Parametros configurables y rangos: activar o desactivar el modo Pitch (independiente de Triggers).
- Equivalente web y limitaciones: YIN o MPM en el AudioWorklet.
- Fuente: [F7], [F9]
- Tarea(s): Fase 1 "Detector de pitch".

### Rueda de notas (visualizacion)
- Que hace: muestra la nota enviada en el centro, 12 puntos cromaticos (C arriba, sentido horario) y radios que se iluminan segun pitch y envolvente apuntando a la nota mas cercana, indicando si se canta alto o bajo.
- Parametros configurables y rangos: ninguno.
- Equivalente web y limitaciones: componente canvas o SVG propio (diseno propio, no copiar UI).
- Fuente: [F1], [F7]
- Tarea(s): Fase 1 "Visualizacion de afinacion en tiempo real".

### Teclado de salida y silenciado de notas
- Que hace: teclado que muestra las notas de salida, las restricciones de tonalidad y las notas extra de acordes. Pulsar una tecla (o un punto de la rueda) desactiva esa nota. Multitactil.
- Parametros configurables y rangos: conjunto de notas silenciadas (12 clases de altura).
- Equivalente web y limitaciones: teclado tactil con objetivos >= 44 px; a 375 px puede requerir una sola octava de clases de nota.
- Fuente: [F1], [F7]
- Tarea(s): Fase 1 "Teclado de salida con silenciado de notas".

### Pegajosidad (Stickiness)
- Que hace: valores altos hacen que una nota sea facil de mantener y dificil de abandonar; bajos permiten movimientos mas agiles a costa de estabilidad.
- Parametros configurables y rangos: control continuo. Rango y defecto: sin fuente.
- Equivalente web y limitaciones: histeresis en cents y tiempo minimo antes de cambiar de nota (decision propia).
- Fuente: [F1], [F7], [F8]
- Tarea(s): Fase 1 "Segmentacion de notas".

### Cambio de octava (Octave shift)
- Que hace: desplaza la nota detectada una o mas octavas arriba o abajo (bajos, silbidos).
- Parametros configurables y rangos: entero de octavas. Rango: sin fuente (se documentan al menos -2). Decision propia: -3..+3.
- Equivalente web y limitaciones: ninguna.
- Fuente: [F1], [F7]
- Tarea(s): Fase 3 "Octava, transposicion, rango de notas permitido".

### Tonalidad y escalas (Key restriction)
- Que hace: limita la salida a una tonalidad y escala; las notas fuera de escala se corrigen. Modo cromatico como alternativa.
- Parametros configurables y rangos: tonica (12) y escala. Escalas documentadas (14): Major, Minor natural, Minor harmonic, Major pentatonic, Minor pentatonic, Blues, Locrian, Dorian, Phrygian, Mixolydian, Lydian, Hungarian minor, Whole tone, Aeolian dominant; mas Cromatica.
- Equivalente web y limitaciones: tabla de intervalos propia. Regla de redondeo a la nota de escala mas cercana en empates: sin fuente (decision propia: hacia abajo).
- Fuente: [F9], [F6], [F5], [F7]
- Tarea(s): Fase 1 "Cuantizacion a escala y tonalidad".

### Sugerencia de tonalidad (Sing in notes)
- Que hace: el usuario canta una idea y se propone una lista de escalas compatibles; se puede previsualizar cada una y confirmarla.
- Parametros configurables y rangos: ninguno documentado. Algoritmo: sin fuente.
- Equivalente web y limitaciones: histograma de clases de altura ponderado por duracion comparado con perfiles de escala (decision propia).
- Fuente: [F5], [F7], [F8], [F9]
- Tarea(s): Fase 1 "Sugerencia de tonalidad a partir de notas cantadas".

### Pitch bend
- Que hace: la desviacion de la voz respecto a la nota se envia como pitch bend, como una rueda de pitch de teclado. Activable para melodia, acordes, ambos o ninguno. El rango debe coincidir con el del sintetizador destino.
- Parametros configurables y rangos: on/off por destino; rango en semitonos. Contradiccion: [F7] dice 1..12; [F9] dice defecto 12 y hasta 48. Decision: 1..48, defecto 2 (compatibilidad con sintes estandar).
- Equivalente web y limitaciones: mensaje 0xE0 de 14 bits en Web MIDI; en el sinte interno, `detune` del oscilador.
- Fuente: [F1], [F7], [F9]
- Tarea(s): Fase 1 "Pitch bend continuo con rango configurable".

### Modos de bend: anclado y fiel
- Que hace: modo anclado (IntelliBend en el original) mantiene la nota hasta que el usuario se aleja deliberadamente y suaviza transiciones; modo fiel (TruBend) sigue la voz exactamente, incluidas pequenas desviaciones.
- Parametros configurables y rangos: selector de dos modos. Umbrales internos: sin fuente.
- Equivalente web y limitaciones: nombres propios en nuestra UI (no usar los nombres del original). Modo anclado = zona muerta + suavizado; modo fiel = paso directo.
- Fuente: [F5], [F6], [F7], [F9]
- Tarea(s): Fase 1 "Modos de pitch bend anclado y fiel".

### Canal MIDI de pitch
- Que hace: canal de salida de la melodia, por defecto 1.
- Parametros configurables y rangos: 1..16, defecto 1.
- Equivalente web y limitaciones: solo con Web MIDI.
- Fuente: [F1]
- Tarea(s): Fase 1 "Salida Web MIDI".

## 3. Triggers

### Slots de trigger y entrenamiento
- Que hace: cada trigger se entrena repitiendo un sonido percusivo (beatbox, chasquido, palmada, o incluso sonidos con tono). Cada ejemplo correcto ilumina un indicador. Se puede borrar todo el banco y reentrenar.
- Parametros configurables y rangos: hasta 8 triggers por perfil [F7][F8] ([F3] no fija maximo); hasta 12 ejemplos por trigger. Nombre por trigger [F7]. Borrado de un solo trigger: sin fuente (decision propia: si).
- Equivalente web y limitaciones: onsets en worklet, features y clasificador k-NN en Worker; ejemplos guardados en IndexedDB.
- Fuente: [F3], [F4], [F7], [F8], [F9]
- Tarea(s): Fase 2 "Entrenamiento por el usuario".

### Nota MIDI y sonido por trigger
- Que hace: cada trigger envia una nota MIDI, reproduce un sonido interno (kit tipo 808), o ambos. Nota por defecto del primero 36 (C1); otras por defecto citadas: caja D1, charles cerrado F#1.
- Parametros configurables y rangos: nota 0..127; destino MIDI / interno / ambos.
- Equivalente web y limitaciones: kit de percusion sintetizado propio (no usar samples del original).
- Fuente: [F3], [F7], [F9]
- Tarea(s): Fase 2 "Mapeo slot a nota MIDI y a sample interno".

### Velocidad
- Que hace: por trigger, velocidad dinamica segun la intensidad del golpe o fija al maximo.
- Parametros configurables y rangos: on/off por trigger. Curva de velocidad: sin fuente.
- Equivalente web y limitaciones: energia de pico en ventana corta tras el onset (decision propia).
- Fuente: [F3], [F4], [F7]
- Tarea(s): Fase 2 "Velocidad a partir de la energia del golpe".

### Sensibilidad de triggers
- Que hace: mayor sensibilidad responde a matices de velocidad y sonidos sutiles; menor da velocidades mas regulares pero dificulta ritmos rapidos. Bajarla evita disparos involuntarios.
- Parametros configurables y rangos: slider global. Rango: sin fuente.
- Equivalente web y limitaciones: umbral del detector de onsets.
- Fuente: [F3], [F4]
- Tarea(s): Fase 2 "Detector de onsets".

### Canal MIDI de triggers
- Que hace: los triggers pueden ir por su propio canal.
- Parametros configurables y rangos: 1..16. Defecto: sin fuente (decision propia: 10).
- Equivalente web y limitaciones: solo Web MIDI.
- Fuente: [F9]
- Tarea(s): Fase 2 "Mapeo slot a nota MIDI y a sample interno".

## 4. Acordes

### Modo acordes y presets de mapeo
- Que hace: cada nota cantada dispara un acorde segun la tonalidad. Presets: Triadas (las 7 triadas diatonicas, disponible en todas las escalas, por defecto); Pop basico y Pop avanzado (solo mayor y menor; desplazan el mapeo nota a acorde, ej. en Do mayor cantar D da G en Pop y Em en Pop avanzado).
- Parametros configurables y rangos: on/off; preset. Tabla completa de Pop y Pop avanzado: sin fuente (solo hay un ejemplo).
- Equivalente web y limitaciones: tablas propias; para Pop disenamos nuestra propia progresion, no la del original.
- Fuente: [F2], [F8], [F9]
- Tarea(s): Fase 3 "Modo acordes".

### Mapeo personalizado y variantes de acorde
- Que hace: elegir para cada nota de la escala otro acorde desde un desplegable o sugerencias. Cada acorde admite hasta 4 variantes (para mayor y menor: triada, maj7, sus2, sus4; disminuido sin variantes). Acordes de otras tonalidades: no soportado segun [F9]. Acordes con bajo distinto (slash) descritos en blog oficial.
- Parametros configurables y rangos: acorde por grado (7), variante.
- Equivalente web y limitaciones: ninguna.
- Fuente: [F2], [F9]
- Tarea(s): Fase 3 "Mapeo de acordes personalizado por grado y variantes".

### Voicings
- Que hace: presets que cambian como se reparten las notas. Documentados: Spread (abre notas en varias octavas), Cluster, Block. Otros nombres: sin fuente.
- Parametros configurables y rangos: preset de voicing.
- Equivalente web y limitaciones: ninguna.
- Fuente: [F2], [F8], [F9]
- Tarea(s): Fase 3 "Modo acordes".

### Inversiones
- Que hace: sin fuente. Ninguna fuente publica describe un control de inversiones explicito.
- Parametros configurables y rangos: sin fuente. Decision propia: inversion 0..2 (3 en cuatriadas) como parte del voicing.
- Equivalente web y limitaciones: ninguna.
- Fuente: sin fuente
- Tarea(s): Fase 3 "Modo acordes".

### Bajo con la nota raiz (Root note bassline)
- Que hace: anade la raiz del acorde por debajo (o la nota cantada, segun [F2]). Ajustable hasta 4 octavas por debajo del acorde.
- Parametros configurables y rangos: on/off; octavas por debajo 1..4.
- Equivalente web y limitaciones: ninguna.
- Fuente: [F2], [F8], [F9]
- Tarea(s): Fase 3 "Bajo de raiz y octava de acordes".

### Octava del acorde (Follow / Shift)
- Que hace: con Follow activo el acorde sigue la octava cantada; desactivado suena en una octava fija fijada por un valor de desplazamiento.
- Parametros configurables y rangos: on/off; desplazamiento (rango: sin fuente).
- Equivalente web y limitaciones: ninguna.
- Fuente: [F2]
- Tarea(s): Fase 3 "Bajo de raiz y octava de acordes".

### Canal MIDI de acordes
- Que hace: los acordes pueden salir por un canal distinto de la melodia para tocar a la vez bajo y pad.
- Parametros configurables y rangos: 1..16. Defecto: sin fuente (decision propia: 2).
- Equivalente web y limitaciones: en sonido interno, dos instancias de sinte con presets distintos.
- Fuente: [F2], [F5], [F7]
- Tarea(s): Fase 3 "Modo acordes".

### Sugerencia de acordes para una melodia
- Que hace: se pueden generar sugerencias de acordes que encajen con una melodia.
- Parametros configurables y rangos: sin fuente.
- Equivalente web y limitaciones: ninguna.
- Fuente: [F7]
- Tarea(s): Fase 3 "Mapeo de acordes personalizado por grado y variantes".

## 5. Control expresivo (CC)

### Seguidores de vocal y de envolvente
- Que hace: tres seguidores de vocal (fuentes: aaa, ooo, eee; [F9] los cita como ah, uh, ih) y uno de amplitud (env). Cada uno se activa o puentea pulsando su medidor y envia un CC.
- Parametros configurables y rangos: por seguidor: on/off; numero de CC (0..127); umbral de entrada minimo y maximo; rango de salida minimo y maximo (0..127); respuesta/suavizado. Rangos numericos de umbrales y suavizado: sin fuente. Canal: [F7] dice que comparten el canal del pitch; [F9] dice canal propio. Decision: canal configurable, por defecto el del pitch.
- Equivalente web y limitaciones: formantes F1/F2 estimados por LPC o centroide espectral en el worklet; envolvente RMS. CC numeros por defecto: sin fuente (decision propia: 1, 2, 4, 11).
- Fuente: [F5], [F7], [F8], [F9]
- Tarea(s): Fase 3 "CC por envolvente de volumen y por timbre/vocal".

## 6. Salida

### Salida MIDI
- Que hace: aparece como dispositivo MIDI para el DAW. Se puede desactivar el audio interno y dejar solo MIDI.
- Parametros configurables y rangos: MIDI on/off; puerto.
- Equivalente web y limitaciones: Web MIDI hacia un puerto existente (no se puede crear un puerto virtual desde el navegador; en escritorio hace falta loopMIDI o el bus IAC). Safari/iOS sin Web MIDI: solo sonido interno.
- Fuente: [F7], [F9]
- Tarea(s): Fase 1 "Salida Web MIDI".

### Sonido interno
- Que hace: kit de bateria tipo 808 y presets de sinte para pitch y acordes (lead, bajo, pad, con modulacion y delay). [F9] lista 7: Pad, Boards, 8 bit Lead, Bass Pluck, Wobble Bass, Trumpet Lead, Trap Bass.
- Parametros configurables y rangos: preset por salida (pitch, acordes); on/off del motor interno. Parametros de cada preset: sin fuente.
- Equivalente web y limitaciones: sintesis Web Audio propia con presets propios (nombres y sonidos propios).
- Fuente: [F6], [F7], [F8], [F9]
- Tarea(s): Fase 1 "Sinte interno basico"; Fase 2 "Kit de percusion interno sintetizado"; Fase 3 "Presets de sinte internos".

### Latencia
- Que hace: el original la describe como muy baja; recomienda buffer <= 128. Cifras en ms: sin fuente.
- Parametros configurables y rangos: buffer (ver entrada de audio).
- Equivalente web y limitaciones: navegador anade latencia de entrada y salida (`baseLatency`, `outputLatency`); en Android puede superar 50 ms. Se mide y muestra.
- Fuente: [F10], [F9]
- Tarea(s): Fase 1 "Medicion de latencia extremo a extremo".

## 7. Perfiles y ajustes globales

### Perfiles
- Que hace: guardan triggers entrenados, tonalidad, pitch bend, acordes y mapeo MIDI. Se pueden crear varios, cargar y duplicar.
- Parametros configurables y rangos: nombre; duplicar. Exportar o importar: sin fuente (decision propia: JSON).
- Equivalente web y limitaciones: IndexedDB; la memoria del navegador puede borrarse, por eso exportar JSON. Pedir `navigator.storage.persist()`.
- Fuente: [F5], [F7]
- Tarea(s): Fase 4 "Perfiles guardados".

### Escala de la interfaz
- Que hace: GUI escalable hasta 200 %.
- Parametros configurables y rangos: 100..200 %.
- Equivalente web y limitaciones: el zoom del navegador y el diseno responsive lo cubren; no se implementa control propio.
- Fuente: [F7]
- Tarea(s): ninguna (cubierto por mobile-first).

## 8. Diferencias asumidas respecto al original
- Navegador en lugar de app de escritorio: latencia mayor y variable segun dispositivo, sobre todo en Android.
- iOS/Safari sin Web MIDI: la app debe ser completa solo con sonido interno.
- Sin puerto MIDI virtual: en escritorio se usa un puerto existente (loopMIDI, IAC).
- Sin eleccion de buffer: el worklet procesa bloques de 128 frames; el sample rate lo decide el sistema.
- Calibracion propia, no compatible con perfiles del original.
- Nombres de modos, presets, sonidos y toda la UI son propios.
