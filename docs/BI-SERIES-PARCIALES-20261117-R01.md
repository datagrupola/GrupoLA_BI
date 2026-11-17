# R01: reparación de A01-H01 y A01-H02

Candidato corregido para una nueva auditoría independiente. Este informe no emite un dictamen de aprobación.

Rama local: `codex/bi-series-parciales-20261117`. Padre esperado: `45614327e100daeebdd93c21abced230499e45ba`, el candidato auditado. Se conserva ese commit y se agrega un nuevo commit; su SHA exacto se entrega en `candidate.txt`, fuera del commit para evitar una referencia circular.

## Corrección limitada

La agregación conserva cada par de valores válidos en los indicadores derivados, incluidos los ceros. La cobertura cuenta los cortes con campos medidos y válidos, independientemente de que la razón pueda calcularse. Después de sumar se evalúa el denominador total mediante `ratioHundredths`, manteniendo las unidades y el redondeo existentes.

Se elimina la exclusión por denominador individual cero. El metadato interno `zeroDenominator` indica únicamente que hay datos válidos y el denominador agregado es cero. En ese caso, la razón sigue siendo `null` y la interfaz explica «Denominador consolidado cero: razón no disponible». No enumera esas sucursales como excluidas ni rebaja su cobertura. Este cambio no modifica contratos de API.

Las exclusiones por campos ausentes o inválidos y por cortes duplicados permanecen. Tampoco cambian la identificación de faltantes, la selección de sucursales ni la exclusión de AppSheet.

| Archivo modificado | Justificación |
| --- | --- |
| `lib/larousse-branch-series.mjs` | Incluir pares válidos con ceros y diagnosticar el denominador después de sumar. |
| `components/LaRousseDashboard.js` | Sustituir el aviso de exclusión individual por el diagnóstico agregado. |
| `tests/larousse-partial-series.test.mjs` | Corregir expectativas anteriores y agregar los casos A/B/C y Comparativo. |
| `tests/qa/partial-series.mjs` | Reproducir los tres casos en navegador, Consolidado, Comparativo y combinada, conservando los controles parciales previos. |
| Este informe | Registrar alcance, validación y reproducción del candidato corregido. |

No se modificaron Finance, Ops, APIs, Supabase, dependencias, CSS, proyecciones, metas, rankings, comparativos temporales, participación de venta ni fórmulas financieras compartidas. El informe anterior describe el commit auditado; esta reparación reemplaza su regla de exclusión de denominadores individuales cero.

## Resultados y reproducción

Los cuatro nuevos tests R01 fallaron antes de corregir la implementación. Después de la corrección:

- `node --test --test-name-pattern='R01' tests/larousse-partial-series.test.mjs`: **4 aprobadas, 0 fallidas**.
- `node --test tests/*.test.mjs`: **89 aprobadas, 0 fallidas**; incluye las regresiones de 7/8 BBVA, 2/3, ausencia total, duplicados, campos incompletos, AppSheet y cálculos ajenos a la reparación.
- `pnpm build`: **correcto**, Next.js 16.4.5.
- `git diff --check`: correcto.
- QA local con build de producción en `127.0.0.1:3217`, Chrome de escritorio 1440×1000 y móvil emulado con toque 390×844: **ambos completados sin errores de consola ni desbordamiento del viewport**. Se comprobaron hover, toque, foco, Tab y Enter.

| Caso ficticio | Resultado comprobado |
| --- | --- |
| A, día 17: ocho cortes, CAMELINAS con ventas/actividad cero | Conversión 20.00%, piezas por ticket 3.00, afluencia 70. Cobertura 8/8, sin corte faltante ni exclusión individual; combinada completa. |
| B, día 18: CAMELINAS 4 piezas/0 tickets y CENTRO 6 piezas/2 tickets | Consolidado 5.00 piezas por ticket, cobertura 2/2. Comparativo conserva CAMELINAS con cobertura 1/1 y razón no disponible; CENTRO muestra 3.00. |
| C, día 19: ocho cortes completos, todos con tickets cero | Piezas por ticket «No disponible», cobertura 8/8, diagnóstico de denominador consolidado cero. Comparativo conserva 1/1 en cada sucursal. Conversión 0.00% y afluencia 80 en la combinada, ambas 8/8. |
| Controles previos | 7/8 con BBVA identificada; selección 2/3; 1/8; 0/8 sin valor ficticio; duplicados excluidos; estados y datos insuficientes diferenciados. |

Reproducción desde el checkout corregido, con sus dependencias instaladas y Chrome disponible:

```sh
node --test --test-name-pattern='R01' tests/larousse-partial-series.test.mjs
node --test tests/*.test.mjs
pnpm build
BI_QA_PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs \
  BI_QA_OUTPUT=/tmp/bi-series-r01-qa \
  node tests/qa/partial-series.mjs
```

Playwright se suministra desde el entorno de QA, sin agregar dependencias a la aplicación. La ejecución actual utilizó el incluido en el runtime de Codex. El navegador recibe datos ficticios y bloquea solicitudes externas; no se consulta Finance de producción. El servidor y el navegador se cierran al terminar.

Evidencia de esta ejecución: `/Users/macbookpro/Documents/ChatGPT/BI-SERIES-PARCIALES-20261117-R01-evidence/`:

- `tests.log`, `r01-specific-tests.log`, `build.log`, `qa-run.log`, `server.log`, `results.json`.
- `desktop-r01-A-combo.png`, `mobile-r01-A-combo.png`.
- `desktop-r01-B-ratio.png`, `mobile-r01-B-ratio.png`.
- `desktop-r01-C-zero-total.png`, `mobile-r01-C-zero-total.png`.
- Capturas de control `desktop/mobile-7-of-8.png`, `desktop/mobile-combo.png` y `desktop/mobile-comparison.png`.
- `candidate.txt` y `candidate.patch` identifican el nuevo commit y su diff respecto del SHA auditado.

Se inspeccionaron las capturas de los casos A/B/C. El detalle distingue cobertura completa de razón indefinida, y el caso B muestra 5.00 con cobertura completa.

## Riesgos residuales y gobernanza

El QA usa datos ficticios y emulación móvil de Chrome; no valida producción, Safari ni dispositivos físicos. La cobertura completa certifica disponibilidad de campos válidos, no aprobación de todos los cortes ni que un ratio con denominador total cero esté definido. Los estados de revisión conservan el tratamiento existente.

Se entrega únicamente un nuevo candidato local para auditoría independiente. No se publicó la rama, abrió PR, hizo merge, desplegó ni generó QA alojada. La auditoría y cualquier autorización posterior permanecen pendientes.
