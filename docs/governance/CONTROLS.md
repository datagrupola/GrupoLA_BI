# Controles particulares — Grupo LA BI

Marco H06-02 sujeto a activación según AGENTS.md. Aplicar G01/W01/S01 del commit central fijado allí y conservar la autoridad de requisitos/contratos aprobados. Fuente anterior: [AGENTS.md en BASE](https://github.com/datagrupola/GrupoLA_BI/blob/94a55892e635c6775d701cd30098f1524faa9d34/AGENTS.md). Estos controles no autorizan acciones nuevas.

## Integración y entrega

- Consultar docs de BI y contratos Finance-BI vigentes en Finance según alcance; las copias locales `FINANCE-BI-v1.md` y `FINANCE-BI-v2.md` se conservan y no sustituyen la verificación del contrato aplicable. Los datos comerciales proceden del contrato real con Finance; no conceder acceso adicional a Ops u otras bases ni modificar sus reglas desde BI.
- ChatGPT Work y Codex tienen el mismo contrato de entrega según W3/W4: rama dedicada, alcance autorizado, pruebas focalizadas y candidato identificado por BASE/HEAD/TREE, diff, controles y limitaciones. Publicar PR Draft solo tras autorización y preflight; no presentar candidato local como publicado. Verificar main, HEAD remoto, cambios concurrentes, workflows/CI, Vercel Preview y costo potencial. Si no se acredita ausencia de recursos facturables ni existe autorización específica de gasto, STOP antes de publicar.
- No secretos, credenciales ni datos reales de Finance/empleados. UI exclusivamente visual según W02, sin cambios semánticos, KPI, cálculos, filtros, consultas, APIs, permisos, datos o integración Finance-BI; estos siguen W3 con auditoría independiente de solo lectura del SHA exacto. Usar pnpm según proyecto.
- Merge y Producción requieren autorizaciones humanas separadas. Si el merge puede activar despliegue, resolver ambas antes. Verificar `bi.grupola.app`, SHA desplegado y resultado funcional tras release; READY no acredita QA funcional. No exigir redespliegue por cambios meramente documentales.

## Costos y compilaciones de documentación

- El 17-nov-2026 el conector Vercel aceptó configurar **Ignored Build Step** para omitir builds cuando todos los cambios se limiten a `docs/**`, `AGENTS.md`, `.agents/**` o `.codex/**`; los cambios detectados fuera de esas rutas deben permitir build.
- La configuración está en Vercel, no en este archivo. El comando utiliza `VERCEL_GIT_PREVIOUS_SHA` cuando está disponible o, en su ausencia, `HEAD^` como referencia local; no calcula el merge-base de `main`. Si el commit de referencia falta o la comparación falla, permite el build (fail-open).
- **Limitación del filtro:** si falta `VERCEL_GIT_PREVIOUS_SHA`, el fallback `HEAD^` puede comparar únicamente el último commit, sin considerar cambios de código anteriores en el mismo PR. Una comparación incremental contra un SHA previo tampoco certifica el diff completo. Por eso, antes de cualquier liberación, revisar todos los commits desde la base del PR y exigir build y validación autorizados cuando existan cambios funcionales sin compilación efectiva; una omisión no es garantía de que el candidato sea exclusivamente documental.
- **Evidencia acotada (17-nov-2026):** el deployment `dpl_8PuQ1QALid855ZR81zLPrfuTnBoY` del HEAD `ebbfe4703ebcfc6a280ee7fd47743b75c9ab3d4e` fue cancelado porque el Ignored Build Step devolvió 0. Prueba esa omisión particular, no asegura futuras omisiones ni elimina el riesgo de comparación parcial.
- **No asumir ahorro sin comprobar el evento real.** Verificar el efecto de GitHub/Vercel y obtener autorización explícita antes de activar consumos adicionales. No cambiar configuraciones externas en un PR documental sin autorización independiente.

Estado observado 27-nov-2026: Dirección desconectó BI de GitHub en Vercel; revalidar vínculo y automatismos antes de cada publicación/merge. El ajuste histórico anterior no acredita configuración efectiva ni costo cero. No reconectar, modificar infraestructura o desplegar por inferencia.

## Transición y reversión

Gobernanza anterior vigente hasta activación expresa según AGENTS.md; cambios a este protocolo requieren auditoría documental independiente y aprobación humana para integrar. Si falla acceso/continuidad o cobertura material, STOP; restaurar AGENTS anterior y retirar este control candidato mediante PR de reversión autorizado, sin force-push ni cambios funcionales. Preservar historia y decisiones.
