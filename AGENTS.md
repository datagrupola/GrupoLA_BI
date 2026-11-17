# AGENTS.md — Grupo LA BI

## Alcance

Estas reglas rigen el desarrollo del dashboard BI de Grupo LA en `datagrupola/GrupoLA_BI`. La fuente de código es GitHub `main`; los datos comerciales proceden del contrato real con Finance, sin conceder acceso adicional a Ops o a otras bases.

## Contrato de implementación: Work y Codex

- **Ambos agentes trabajan de la misma forma:** rama específica, implementación dentro del alcance aprobado, pruebas focalizadas, commit y **publicación en GitHub mediante Pull Request Draft**, con URL, base SHA, HEAD SHA, diff, controles ejecutados y limitaciones. No presentar un candidato local como entrega publicada.
- Antes de publicar, comprobar `main`, HEAD remoto, cambios concurrentes, workflows/CI, Vercel Preview y costo potencial. Un PR Draft puede disparar despliegues automáticos; sin aprobación del gasto o garantía verificable de que no se crea recurso facturable, **detener publicación** e informar del bloqueo.
- No publicar secretos, credenciales ni datos reales de Finance/empleados. Nunca push directo a `main`, force-push, editar rama ajena, hacer merge, iniciar despliegue o modificar Production sin autorización humana independiente y específica.
- Para cambios funcionales, de reglas/KPI, consultas, APIs, permisos, datos o integración Finance↔BI, exigir pruebas proporcionales y **auditoría independiente de solo lectura del SHA exacto** en otra sesión. Cambios exclusivamente visuales autorizados pueden seguir la excepción de UI tras revisión del diff y pruebas relevantes; la clasificación «UI» no permite alterar semántica/cálculos.
- La autorización de desarrollar y publicar candidato no incluye la de fusionarlo. El propietario aprueba merge y Producción por separado. Después del release, verificar el dominio `bi.grupola.app`, el SHA desplegado y el resultado real, sin inferir QA funcional del estado READY.
- Usar `pnpm` para los comandos del proyecto cuando corresponda. No modificar reglas de Finance/Ops desde este repositorio.

## Costos y compilaciones de documentación

- El 17-nov-2026 el conector Vercel aceptó configurar **Ignored Build Step** para omitir builds cuando todos los cambios se limiten a `docs/**`, `AGENTS.md`, `.agents/**` o `.codex/**`; los cambios detectados fuera de esas rutas deben permitir build.
- La configuración está en Vercel, no en este archivo. El comando utiliza `VERCEL_GIT_PREVIOUS_SHA` cuando está disponible o, en su ausencia, `HEAD^` como referencia local; no calcula el merge-base de `main`. Si el commit de referencia falta o la comparación falla, permite el build (fail-open).
- **Limitación del filtro:** si falta `VERCEL_GIT_PREVIOUS_SHA`, el fallback `HEAD^` puede comparar únicamente el último commit, sin considerar cambios de código anteriores en el mismo PR. Una comparación incremental contra un SHA previo tampoco certifica el diff completo. Por eso, antes de cualquier liberación, revisar todos los commits desde la base del PR y exigir build y validación autorizados cuando existan cambios funcionales sin compilación efectiva; una omisión no es garantía de que el candidato sea exclusivamente documental.
- **Evidencia acotada (17-nov-2026):** el deployment `dpl_8PuQ1QALid855ZR81zLPrfuTnBoY` del HEAD `ebbfe4703ebcfc6a280ee7fd47743b75c9ab3d4e` fue cancelado porque el Ignored Build Step devolvió 0. Prueba esa omisión particular, no asegura futuras omisiones ni elimina el riesgo de comparación parcial.
- **No asumir ahorro sin comprobar el evento real.** Verificar el efecto de GitHub/Vercel y obtener autorización explícita antes de activar consumos adicionales. No cambiar configuraciones externas en un PR documental sin autorización independiente.

## Auditoría de este protocolo

Los cambios de gobernanza y de estas propias reglas son **documentales**, no UI pura: requieren revisión independiente del PR, aprobación humana para integrar y nunca se consideran aprobados únicamente por la publicación del candidato.
