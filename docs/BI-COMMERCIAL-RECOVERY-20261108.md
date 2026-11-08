# Recuperación comercial BI-01 / BI-02 — candidato para auditoría

**Estado:** implementación en rama/PR candidato. Sin autorización de merge ni despliegue productivo.  
**Repositorio:** `datagrupola/GrupoLA_BI`. Sin cambio a Finance, SQL, endpoints, roles, secretos, migraciones o datos.  
**Base:** `dac28160d65142ac45b08e1fd4b28383ea334619` (V2 productiva).  
**Fuente funcional:** auditoría AS-IS Bonus Track del 8-nov-2026, fórmulas K04, K05, K07 y K08.

## BI-01 — Conversión y piezas por ticket

La población se mantiene **idéntica a commercialMetrics**: revisión vigente OPS, no histórica, en estados `APPROVED`, `PENDING_REVIEW` o `CORRECTION_REQUESTED`. No se agregan tickets o piezas AppSheet al neto OPS.

- **Conversión:** `SUM(tickets) / SUM(footfall) * 100`, mostrada con dos decimales porcentuales.
- **Piezas por ticket:** `SUM(pieces) / SUM(tickets)`, mostrada con dos decimales.
- Cociente de totales, **no** promedio de porcentajes diarios.
- Todos los valores de unidad deben existir como enteros válidos en todas las filas de la población elegible. Un solo valor nulo hace el indicador no disponible, sin imputación de cero.
- Denominador cero => «No disponible»; numerador cero con denominador positivo => `0.00`.
- Operaciones y redondeo half-up en `BigInt`; el importe neto, ticket promedio y suma de unidades conservan sus definiciones anteriores.

## BI-02 — Proyección y ritmo observado

La **fórmula reconstruida de Looker/Sheets** es: `Proyección = Venta acumulada × días naturales del mes / día de la última fecha global reportada`.

La adaptación explícita a Finance V2 es:

- **Numerador:** venta neta reportada comparable OPS, no `venta_total` declarada de AppSheet.
- **Denominador:** día de calendario de la fecha máxima global entre todas las sucursales, seleccionando solo cortes reportables OPS de ese mes. El histórico AppSheet no fija el corte global del pronóstico OPS.
- **Selección de sucursal:** la venta y ritmo provienen de la sucursal seleccionada, pero la fecha de corte viene siempre de la lectura mensual **sin filtro de sucursal**. El frontend realiza esa segunda lectura autenticada del mismo endpoint V2 ya existente; sin nuevo contrato ni credencial. Si falla, la proyección queda `No disponible`; nunca se sustituye la fecha local.
- **Ritmo observado:** `Venta neta comparable / COUNT_DISTINCT(date)` de la selección, replicando la semántica de fechas reportadas. No es ritmo requerido para cumplir meta y no utiliza días naturales del mes en su divisor.
- **Proyección nula:** población seleccionada incompleta/no comparable, alguna sucursal seleccionada sin cortes comerciales, sin informes, sin fecha global acreditada o fecha global anterior a la última fecha local.
- **Cobertura de fecha:** muestra X sucursal-días comerciales registrados frente a `sucursales seleccionadas × día global` cuando faltan fechas. Este indicador es una advertencia **natural/calendario**, no una certificación de obligación de apertura ni auditoría de cortes faltantes.
- **Fecha local rezagada:** se advierte cuando la sucursal seleccionada tiene último corte anterior a la fecha global.
- **Sin calendario operativo:** la extrapolación natural no considera cierres, tendencia, estacionalidad, proyección por semana, aprobación, meta ni faltantes operativos. No es pronóstico garantizado.
- Montos en centavos `BigInt`, redondeo half-up; los datos no se reescriben y la proyección es una lectura derivada.

El método **no** es la fórmula alternativa `SUM(venta_total) × días_mes / COUNT_DISTINCT(fecha)` de otro campo de Looker. El denominador natural global se conserva aparte del ritmo observado.

## Puntos de auditoría obligatorios

1. Comprobar que `commercialCutoffDate` consulta el universo mensual completo y nunca usa último día local como sustituto.
2. Validar la población OPS y prohibición de mezcla AppSheet / `venta_total` / neto comercial.
3. Reproducir los ejemplos: `53812 × 30 / 4 = 403590` (Looker matemático, pero no las mismas fuentes) y `1843154 × 30 / 7 = 7899231.43` (escenario Finance V2 del informe).
4. Reproducir el ritmo observado sobre **fechas distintas**, y la divergencia entre éste y el divisor natural global.
5. Verificar nulos, cero, divisores, formato, moneda, años bisiestos, mes/sucursal, abortos/races de fetch y fallos de consulta global.
6. Confirmar que Looker, Finance, otras vistas BI, V1, endpoint V2 y permisos no cambian.
7. Verificar build del SHA candidato, resultados de tests y comportamiento real autenticado antes del cierre productivo.

## Ejecución y límites

Tests unitarios en `tests/larousse-commercial.test.mjs` y pruebas de contrato UI en `tests/larousse-ui-commercial.test.mjs`; ejecución recomendada:

```bash
node --test tests/larousse-commercial.test.mjs tests/larousse-ui-commercial.test.mjs
node --test tests/larousse.test.mjs tests/larousse-api.test.mjs
pnpm build
```

La compilación Vercel Preview solo acredita build, no integración con una sesión autenticada ni equivalencia numérica de Looker y Finance. PR pendiente de auditoría independiente y autorización explícita de liberación. No se requiere QA Supabase: no hay alteraciones de backend ni de esquema.

## Corrección BI-11-01 — cobertura de sucursales

La proyección exige al menos un corte comercial elegible por cada sucursal de `targets` (catálogo de la selección validado por V2), usando el mismo criterio de presencia que `commercialMetrics()`. La ausencia completa de una sucursal produce `projectedNet: null`. El importe de su meta no interviene en esta comprobación; una meta nula no impide extrapolar si todas las sucursales tienen cortes válidos. Se conserva el caso existente de cálculo sin metas.

Las fechas intermedias faltantes siguen permitiendo la proyección cuando todas las sucursales seleccionadas tienen cortes válidos. `countedPairs` y `expectedPairs` continúan siendo un diagnóstico de calendario, sin convertirse en condición de cálculo. Fórmulas, fecha global, estados OPS, exclusión histórica y ritmo observado se conservan.

Regresiones focalizadas en `tests/larousse-commercial.test.mjs`:

- Dos sucursales seleccionadas y cortes solo de una: proyección nula; al seleccionar únicamente la sucursal cubierta, conserva la proyección con el mismo corte global.
- Ambas sucursales cubiertas, con fechas 1, 4 y 7 (3 de 14 sucursal-días): proyección disponible de $3,000 = $700 × 30 / 7, aun con metas nulas.

Ejecutar `node --test --test-name-pattern=BI-11-01 tests/larousse-commercial.test.mjs`, `node --test tests/larousse-commercial.test.mjs` y `pnpm build` sobre el commit correctivo. La evidencia y el SHA exacto se registran en el PR #11. Reauditoría independiente pendiente y limitada a BI-11-01, sin repetir la auditoría integral de BI-01/BI-02.

Para publicar el commit sin desplegar, `vercel.json` deshabilita el despliegue Git automático exclusivamente de `feat/bi-commercial-kpis-forecast-20261108`. Las demás ramas conservan su configuración. No se modifica la configuración remota de Vercel ni se solicita un despliegue.
