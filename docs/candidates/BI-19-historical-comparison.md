# BI-19 — Comparación histórica controlada entre Ops y AppSheet

**Estado:** CANDIDATO PARA AUDITORÍA, no liberado a Producción.
**Fecha de comprobación:** 2026-11-09.
**Origen de evidencia:** consultas de agregados de solo lectura en La Rousse Finance, más contratos BI-04 y Finance V2 publicados en GitHub.

## Diagnóstico productivo

- Octubre 2026 contiene 188 cortes de origen AppSheet y 29 de Ops en siete sucursales.
- Los 188 históricos tienen efectivos, terminal, tickets, afluencia y piezas no nulos.
- Cinco históricos presentan diferencias entre total declarado y efectivo + terminal (diferencia absoluta acumulada de 1,250.00 MXN).
- Octubre 1–8: 56/56 sucursal-días; 56 AppSheet; tres cortes con diferencias de importe.
- Octubre 25–31: 49/49 sucursal-días; 21 AppSheet y 28 Ops.
- Noviembre 1–8: 56/56 sucursal-días; todos de Ops.

Los totales declarados de AppSheet **no están acreditados** como venta neta comparable con Ops. Los valores agregados descritos aquí no son una certificación financiera por fila.

## Alcance del candidato

1. Aceptar Ops solo con procedencia OPS, historical=false y estado reportable.
2. Aceptar registros históricos solo con procedencia APPSHEET, historical=true y estado HISTORICO_SIN_REVISAR.
3. Requerir un registro elegible por sucursal y fecha durante el intervalo completo. Los registros de origen o estado no elegible se excluyen, sin contaminar un período Ops completo. Los huecos y duplicados entre los registros elegibles impiden declarar cobertura completa.
4. Comparar únicamente tickets, afluencia, piezas vendidas, conversión y piezas/ticket cuando ambos intervalos son completos y sus campos son válidos.
5. Cuando intervenga AppSheet, NO inferir venta neta de declared_total, ni calcular ticket promedio ni variaciones monetarias. Las celdas no comparables se identifican como tales.
6. Mantener inalterados los cálculos originales cuando ambos períodos son exclusivamente Ops.
7. Mostrar las cantidades de cada origen por período y una advertencia del límite financiero.
8. Mostrar inicialmente Mes anterior en el comparativo, conservando Sin comparación y 7 días anteriores.

## Exclusiones expresas

- No se modifica Finance, Ops, ninguna base de datos ni ningún registro histórico.
- No se usa declared_total como equivalente a net_sales.
- No se añade una nueva API ni permisos, ni se expone la credencial de Finance.
- Este PR no certifica ventas históricas. Para incorporarlas debe existir un contrato de conciliación por registro, con validación independiente de las discrepancias encontradas.

## QA y liberación

- Conjunto de casos unitarios: ventanas homogéneas y mixtas, precisión exacta de unidades y ratios, duplicados, faltantes, procedencia/estado invalidados, actividad nula y bloqueo de montos históricos.
- **Pendiente de acreditación:** ejecutar node --test tests/*.test.mjs y pnpm build en un entorno adecuado; no presentar verificaciones estáticas como pruebas ejecutadas.
- Exigir auditoría independiente del cálculo y de sus consecuencias financieras antes de liberar.
- Revalidar el HEAD, las ventanas y los agregados de Finance inmediatamente antes de Producción.
- No autoriza merge ni despliegue productivo sin aprobación explícita posterior.
