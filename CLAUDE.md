# Proyecto: voz a MIDI en el navegador (mobile-first)

Reimplementacion web, desde cero, de la funcionalidad de un plugin de voz a MIDI tipo Dubler 2.
Especificacion funcional: `docs/SPEC.md`. Backlog: `docs/TASKS.md`. Historial: `docs/PROGRESS.md`.

## Reglas legales (no negociables)
- Clean-room: implementar a partir de documentacion publica, manuales y videos. Nunca descompilar, desensamblar ni copiar binarios, codigo, sonidos, iconos, textos o UI del producto original.
- No usar las marcas "Vochlea" ni "Dubler" en la interfaz, el codigo ni los metadatos. Nombre del producto: el que figure en `docs/SPEC.md`.

## Stack
- Vite + TypeScript estricto. Sin framework pesado salvo que SPEC.md lo justifique.
- Audio: Web Audio API + AudioWorklet. Toda la deteccion (pitch, onsets, clasificacion) corre en el worklet o en un Worker, nunca en el hilo principal.
- Salida: sintetizador/sampler interno (siempre disponible) + Web MIDI cuando el navegador lo soporte. Safari/iOS no soporta Web MIDI: en iOS la app debe ser plenamente util solo con el sonido interno.
- PWA instalable. Mobile-first: disenar a 375px, objetivos tactiles >= 44px, funcionar en vertical.
- Deploy: Vercel desde GitHub. claude/dev = produccion (free-voclea.vercel.app). main solo recibe merges manuales.

## Comandos
- `npm run dev` / `npm run build` / `npm run test` / `npm run e2e`
- Antes de cada commit: `npm run build && npm run test` deben pasar.

## Forma de trabajar
- Lee `docs/PROGRESS.md` (ultimas entradas) y `docs/TASKS.md` antes de tocar codigo. No releas todo el repo: abre solo los archivos que la tarea necesita.
- Una tarea por sesion. Commits pequenos, mensaje en espanol con prefijo convencional (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`).
- No adivinar APIs, versiones ni nombres de paquetes: verificalos en la documentacion o en el codigo antes de usarlos.
- Si algo bloquea la tarea, anotalo en PROGRESS.md, marca la tarea como bloqueada y para.
- Sin emojis ni rayas largas en codigo, commits o docs.
