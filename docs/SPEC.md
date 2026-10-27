# Especificacion funcional

Nombre del producto: (elige uno propio, sin "Dubler" ni "Vochlea")

Este documento lo completa el agente en la sesion de arranque a partir de fuentes publicas (manual oficial, pagina de producto, videos). Cada funcion lleva su fuente. Nada se describe a partir de binarios o codigo del producto original.

## Plantilla por funcion
### <Nombre de la funcion>
- Que hace (comportamiento observable):
- Parametros configurables y rangos:
- Equivalente web y limitaciones (ej. sin Web MIDI en iOS):
- Fuente:
- Tarea(s) en TASKS.md:

## Bloques a cubrir
- Entrada de audio y calibracion
- Pitch: deteccion, escala/tonalidad, pitch bend, octava, rango
- Triggers: entrenamiento de sonidos, mapeo, velocidad
- Acordes: tipos, voicings, inversiones
- Control expresivo (CC): fuentes y mapeos
- Salida: MIDI y sonido interno
- Perfiles y ajustes globales
- Diferencias asumidas respecto al original (latencia de navegador, iOS)
