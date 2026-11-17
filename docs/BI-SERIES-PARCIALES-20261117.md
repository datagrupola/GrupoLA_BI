# BI: series comerciales diarias parciales

Candidato local para auditoría independiente. Cambio de agregación y presentación; no es UI-only. Auditoría e integración humana pendientes. No se publicó rama ni PR, ni se ejecutó merge, despliegue o QA alojada.

## Base y alcance

- Repositorio: `datagrupola/GrupoLA_BI`.
- `main` verificado con `git ls-remote`: `e86667eba85c257c15e814b66029f51625432fef`.
- Rama: `codex/bi-series-parciales-20261117`.
- Checkout separado de La Rousse Ops: `/Users/macbookpro/Documents/ChatGPT/GrupoLA_BI`.
- El SHA final del candidato se entrega en el manifiesto de evidencia y en el mensaje de entrega, fuera de este commit para evitar una referencia circular.

## Resultado funcional

Para cada fecha y selección, las series suman las contribuciones utilizables. Con siete sucursales de ocho se conserva el subtotal, la línea continúa y el detalle identifica BBVA como faltante. Con una sucursal se dibuja esa contribución. Sin contribuciones se conserva `null`, sin punto ficticio. Un cero medido sigue siendo cero.

Ventas, tickets, piezas y afluencia tienen poblaciones independientes. Conversión y piezas por ticket suman numeradores y denominadores del mismo conjunto de sucursales y emplean el redondeo existente. Un dato ausente o inválido excluye únicamente la contribución correspondiente. Un denominador cero excluye esa sucursal del indicador derivado y se informa; no invalida sus métricas independientes.

Los metadatos distinguen cortes existentes, ausentes, duplicados, con estado no reportable, pendientes de revisión y con corrección solicitada. Por indicador se enumeran sucursales incluidas, con datos insuficientes, inválidos o denominador cero. Un corte existente no implica aprobación. Los estados pendientes y de corrección siguen siendo reportables conforme a la definición existente y se identifican expresamente.

Los duplicados sucursal-fecha se excluyen íntegramente, incluso si una copia tiene estado no reportable. AppSheet y cualquier fila histórica se excluyen antes de contar duplicados o cobertura. El calendario incluye los cortes OPS actuales de cualquier estado para poder identificar también días sin estado reportable.

Los puntos parciales tienen contorno discontinuo y color ámbar. Las barras parciales de la combinada usan el mismo tratamiento. La cobertura y los nombres se consultan en el detalle de la fecha seleccionada, mediante hover, toque, foco, Enter o espacio, y en las tablas desplegables. La combinada informa separadamente la cobertura de conversión y afluencia. El modo Comparativo calcula cada serie sobre una sola sucursal; el Consolidado usa la selección múltiple.

## Archivos y justificación

| Archivo | Cambio |
| --- | --- |
| `lib/larousse-branch-series.mjs` | Agregación parcial, cohortes compatibles y metadatos de cortes e indicadores; calendario OPS actual. |
| `components/LaRousseDashboard.js` | Detalles con nombres en puntos seleccionados, accesibilidad y tablas; marcas parciales y cobertura separada de la combinada. Las filas actuales llegan a las series sin perder antes el estado no reportable. |
| `app/globals.css` | Estilos de marcas parciales y ajuste del detalle de cobertura en móvil y Comparativo. |
| `tests/larousse-branch-multiselect.test.mjs` | Reemplaza expectativas de bloqueo por subtotales y exclusión de duplicados. |
| `tests/larousse-visualizations.test.mjs` | Actualiza el caso de conversión/afluencia parcial para la combinada. |
| `tests/larousse-partial-series.test.mjs` | Casos 8/8, 7/8 BBVA, múltiples ausencias, 1/8, 0/8, anomalías, cohortes, cero, estados, selección y AppSheet. |
| `tests/qa/partial-series.mjs` | QA reproducible en navegador con respuestas ficticias y sin acceso externo desde la página. |
| Este documento | Entrega y reproducción de evidencia. |

`lib/larousse-daily.mjs` y los helpers financieros compartidos se conservan sin cambios. La modificación se limita al cálculo de las series por selección. No hay dependencias, cambios de lockfile, APIs, autenticación, infraestructura ni archivos de Ops, Finance o Supabase modificados. Las fórmulas de proyección, metas, rankings y el dashboard operativo permanecen intactas.

## Validación

- `node --test tests/*.test.mjs`: **85 aprobadas, 0 fallidas**. Incluye las regresiones existentes de cálculos financieros/comerciales, proyección, comparaciones, contratos y dashboard operativo.
- `pnpm build`: **correcto**, Next.js 16.4.5, usando las dependencias fijadas por el lockfile.
- `git diff --check`: correcto.
- Chrome local, escritorio **1440 × 1000**, móvil con toque **390 × 844**: ambos aprobados; sin errores de consola ni desbordamiento del viewport.
- Fixture de QA: 11 de noviembre con 8/8; 12 y 13 con 7/8 sin BBVA; 14 con 1/8; 15 sin cortes; 16 con duplicado, datos insuficientes, denominador cero, revisión, corrección y estado no reportable. Incluye histórico AppSheet de BBVA que no debe completar el día 12.
- El día 12 ficticio muestra **$700.00**, **7/8**, **Falta corte: BBVA**, **Consolidado parcial**. La combinada muestra **20.00%** y **70** visitantes, ambos con 7/8.
- Se comprueba que el primer segmento une los días 11–14 y que el 15 no tiene punto. Se verifican las seis métricas, selección CAMELINAS/CENTRO/BBVA con **2/3**, Comparativo con BBVA **0/1**, y acceso por foco, Tab y Enter además de ratón/toque.

La historia verificada es: apertura del dashboard → respuesta comercial ficticia con forma del contrato existente → agregación diaria real → gráficas y detalle accesible. La API y el origen Finance se sustituyen en el navegador; no se valida conectividad ni datos de producción.

### Reproducción

Desde el checkout, con Node >=20.9 y pnpm:

```sh
pnpm install --frozen-lockfile
node --test tests/*.test.mjs
pnpm build
BI_QA_PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs \
  BI_QA_OUTPUT=/tmp/bi-series-qa \
  node tests/qa/partial-series.mjs
```

Playwright se suministra desde el entorno de QA; no es una dependencia de la aplicación. Se requiere Chrome instalado (`channel: chrome`). En esta ejecución se utilizó el Playwright incluido en el runtime de Codex. El script inicia el build local exclusivamente en `127.0.0.1:3217`, usa un secreto ficticio para la sesión local, intercepta la API comercial y cierra navegador y servidor al terminar. No modifica autenticación ni servicios externos.

Evidencia durable de esta ejecución: `/Users/macbookpro/Documents/ChatGPT/BI-SERIES-PARCIALES-20261117-evidence/`:

- `tests.log`, `build.log`, `server.log`, `results.json`.
- `desktop-7-of-8.png`, `mobile-7-of-8.png`.
- `desktop-combo.png`, `mobile-combo.png`.
- `desktop-comparison.png`, `mobile-comparison.png`.
- `candidate.txt` y `candidate.patch` identifican el commit y sus cambios.

Se inspeccionaron las capturas de escritorio y móvil; el detalle de cobertura y los nombres se leen sin desbordamiento. La gráfica conserva su desplazamiento horizontal existente en móvil.

## Publicación, riesgos y limitaciones

`vercel.json` desactiva despliegues únicamente para cinco ramas nombradas; esta rama no está incluida. El repositorio no contiene `.github/workflows`. Esto no demuestra que publicar la rama sea gratuito: pueden existir integración Git de Vercel, aplicaciones o políticas externas. No se verificó costo cero ni se asumió autorización de gasto; por ello se entrega únicamente el candidato local, sin push ni PR remoto.

Los subtotales de días con diferente cobertura no representan poblaciones idénticas; el detalle informa la diferencia y no estima ventas faltantes. Las métricas independientes pueden tener coberturas distintas, enumeradas por separado. Las pruebas de navegador usan datos ficticios y emulación móvil de Chrome, no dispositivos físicos ni Safari. El contrato existente puede rechazar datos malformados antes de llegar al navegador; las pruebas unitarias ejercitan la exclusión defensiva de esos datos en las series sin modificar ese contrato.

**Listo para auditoría independiente del candidato local.** Esa auditoría aún no se realizó. La publicación requiere primero verificar el impacto económico y obtener autorización si genera gasto. La integración requiere autorización humana posterior; no se realizó merge ni despliegue.
