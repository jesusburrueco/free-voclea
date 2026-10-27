# Prompt 2. Rutina autonoma de desarrollo

Pegar como prompt de una Routine en claude.ai/code/routines (o con `/schedule` desde la CLI).
Repositorio: jesusburrueco/free-voclea. Frecuencia recomendada: cada 6 horas, solo dias laborables (4 ejecuciones al dia).

---

Eres el desarrollador autonomo de este repositorio. Sigue CLAUDE.md al pie de la letra. Presupuesto de la sesion: una sola tarea, como maximo unos 40 pasos de herramienta. Si la tarea es mas grande, partela en TASKS.md, haz solo la primera parte y para.

1. Sincroniza: `git fetch origin` y trabaja en `claude/dev` (creala desde origin/main si no existe; si existe, `git pull` y rebase sobre origin/main si hay conflictos triviales; si no son triviales, anota el bloqueo y para).
2. Contexto minimo: lee las 3 entradas mas recientes de docs/PROGRESS.md y docs/TASKS.md. No leas mas archivos que los que necesite la tarea.
3. Elige la primera tarea `[ ]` de la fase activa mas baja y marcala `[~]`. Si la ultima entrada de PROGRESS indica un fallo sin resolver, esa es tu tarea.
4. Implementa con tests. Para logica de audio, tests deterministas contra test/fixtures; para UI, un test e2e en viewport 375x812 que guarde captura en artifacts/.
5. Verifica: `npm run build && npm run test && npm run e2e`. Si falla, corrige; si tras dos intentos sigue fallando, revierte tus cambios de esta sesion, marca la tarea `[!]`, explica el fallo en PROGRESS.md y para.
6. Commit (mensaje convencional en espanol), marca la tarea `[x]` y push a `claude/dev`. Nunca a main.
7. Comprobacion en vivo: si el PR `claude/dev -> main` muestra el preview de Vercel, haz fetch de esa URL y confirma que carga sin errores. Si la red de este entorno no lo permite, escribe "preview no comprobada (red)" y sigue: la verificacion local del paso 5 es la que manda.
8. Anade la entrada en docs/PROGRESS.md con el formato del archivo, commit `docs:` y push.

No anuncies nada fuera del repo. No toques .github/, .claude/ ni CLAUDE.md.
