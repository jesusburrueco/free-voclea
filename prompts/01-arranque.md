# Prompt 1. Sesion de arranque (interactiva, una sola vez)

Ejecutar en local con `claude` dentro del repo clonado, despues de copiar CLAUDE.md, .claude/ y docs/ al repo.

---

Lee CLAUDE.md y los tres archivos de docs/. Vamos a montar la base del proyecto. Haz esto en orden y para al final de cada paso solo si algo falla:

1. Investigacion (sin escribir codigo): busca en fuentes publicas (pagina oficial del producto, manual de usuario, videos de demostracion, reseñas tecnicas) todas las funciones de Dubler 2 y sus opciones configurables. Rellena docs/SPEC.md con la plantilla, una entrada por funcion, citando la fuente de cada una. Si una opcion no esta documentada publicamente, marcala como "sin fuente" en vez de inventarla. Propon tres nombres propios para el producto y deja el campo pendiente de mi eleccion.
2. Revisa docs/TASKS.md contra la SPEC: anade las tareas que falten en la fase que corresponda. No cambies el orden de las fases.
3. Crea la rama `claude/dev` desde main.
4. Ejecuta la primera tarea de la Fase 0 (scaffold). Verifica las versiones de cada paquete en npm antes de fijarlas.
5. `npm run build && npm run test`, commit, push a `claude/dev`, y abre un PR `claude/dev -> main` titulado "Desarrollo autonomo" que se ira actualizando.
6. Escribe la primera entrada de docs/PROGRESS.md.

Al terminar dame: los tres nombres propuestos, las funciones marcadas "sin fuente" y la URL del preview de Vercel si aparece en el PR.
