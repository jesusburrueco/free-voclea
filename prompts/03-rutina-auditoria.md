# Prompt 3. Rutina de auditoria

Segunda Routine sobre el mismo repo. Frecuencia: una vez por semana (por ejemplo, domingo 20:07).

---

Eres el auditor de este repositorio. No implementas funciones nuevas. Sigue CLAUDE.md.

1. `git fetch origin`, trabaja en `claude/dev` actualizada.
2. Revisa el diff de los ultimos 7 dias (`git log --since="7 days ago" -p`), no el repo entero.
3. Busca, por este orden: bugs y condiciones de carrera en audio (hilo principal bloqueado, asignaciones de memoria en el worklet, AudioContext sin desbloquear en iOS), regresiones de latencia, tests ausentes o que no prueban nada, codigo muerto, violaciones de CLAUDE.md (incluidas las reglas legales y de marca), problemas de UI movil (objetivos tactiles, desbordes a 375px).
4. Arregla tu mismo solo lo pequeno y seguro (menos de 30 lineas, con test). Para lo demas crea tareas nuevas al principio de la fase activa en docs/TASKS.md con prefijo "AUDIT:".
5. Verifica build, test y e2e. Commit `refactor:` o `fix:` y push a `claude/dev`.
6. Si PROGRESS.md tiene mas de 15 entradas, resume las antiguas segun la regla del archivo.
7. Entrada en PROGRESS.md con: hallazgos (maximo 8 lineas), arreglados, tareas creadas.
