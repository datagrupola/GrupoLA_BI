# BBVA — candidato BI y QA integral

Misión BBVA-INTEGRAL-20261113. Base1c689eda3a9d6227ab6c6fda92205b9d3e889fb4; preliminar5b134da52297f9bc72f93c7fdd6e0c86cd2808eb recuperado completo. Código final probado4e661a6be5a7353cd1f2f7604ea313c35f910486. Publicado como [PR Draft #22](https://github.com/datagrupola/GrupoLA_BI/pull/22), tras autorización humana explícita de publicación y presupuesto USD10 antes de impuestos. No es dictamen independiente ni autorización de despliegue.

Acepta exactamente catálogo original7 o nuevo8, con BBVA UUID137ca756-6535-40f6-867d-b1df46c3f52f. Rechaza subconjuntos arbitrarios, Chino, duplicados/cobertura inválida e identidad BBVA incorrecta. No cambia credenciales, API/Auth, zona horaria ni fórmulas comerciales. Se corrige un defecto material preexistente del filtro operativo: catalog entries tienen id y facts branch_id, por lo que se vaciaba el ranking filtrado. scopeOperational usa cada clave correcta y está probado para BBVA y las siete anteriores.

| Comando / fuente | Resultado | Exit |
| --- | --- | --- |
| pnpm install --frozen-lockfile |Lockfile intacto |0 |
| node --test tests/*.test.mjs, SHA4e661a6 |83PASS,0FAIL,0omitidas |0 |
| pnpm build, SHA4e661a6 |Next16.4.5, build producción completo |0 |
| Harness integral en Ops, con este SHA |17 grupos reales/182 HTTP directas, más red interna/navegador |0 |

Los repos declaran pnpm11.10.0; runtime disponible11.25.0, diferencia documentada sin cambiar packageManager ni lockfiles. No hay script lint/test en package.json BI: se usó Node test runner existente, no se inventa su ejecución.

QA real: dos backends Supabase locales independientes con PostgreSQL/PostgREST/Auth/Storage, Next Ops y BI en producción local, servidor Finance real y HTTPS servidor a servidor con CA local confiable. Catálogo7 provino de main Ops intacta7f6e80… ejecutada realmente contra DB aislada, sin mocks; catálogo8 del candidato actual, ambos aceptados con exclusión estricta. Ocho filtros HTTP se conciliaron con SQL y Ops. Credenciales upstream incorrectas, sesión inválida, filtros inválidos, lectura fallida y catálogo incompleto fallan cerrados. La ausencia de hechos conserva200 y estado no disponible cuando corresponde.

Chrome existente en perfil headless efímero: login real local con cookie HttpOnly/Secure/SameSite; ocho rankings individuales, BBVA2 incidencias/1203 tareas/2405 ciclos y otras siete1/1/2; agregados comerciales258.56, BBVA32.32 con meta ausente y cumplimiento no disponible; periodo anterior BBVA sin hechos. Quince cortes ficticios pasaron por Ops/Storage/outbox/HMAC/Finance/inbox/revisión/callback. Ningún mock de fetch se utilizó en la integración; los tests unitarios complementarios sí simulan contratos y se distinguen expresamente.

Las siete metas ficticias200.20 se conservan; no se asigna meta BBVA ni se sustituye null por cero. Proyección de ventas independiente de meta permanece calculable cuando su cohorte lo permite. Venta desconocida/no comparable se presenta según contrato existente. La meta BBVA es una decisión de negocio posterior.

[Expediente único y evidencia](https://github.com/datagrupola/la-rousse-ops/blob/codex/bbva-integral-audit-20261113/docs/candidates/bbva-integral-20261113/DOSSIER.md), [reproducción](https://github.com/datagrupola/la-rousse-ops/blob/codex/bbva-integral-audit-20261113/docs/candidates/bbva-integral-20261113/REPRODUCE.md), [orden/rollback](https://github.com/datagrupola/la-rousse-ops/blob/codex/bbva-integral-audit-20261113/docs/candidates/bbva-integral-20261113/ACTIVATION.md). El conjunto está publicado en ramas de auditoría; los PRs/HEADs inmutables y equivalencia de código se identifican en el expediente.

Liberar BI compatible7/8 antes de Ops8; luego receptor Finance antes del emisor Ops comercial. No volver al consumidor7 mientras Ops entregue8. Main BI no tiene protección técnica efectiva; gates de auditoría y autorización humana siguen pendientes. Ningún push, PR, merge ni despliegue se ha ejecutado antes de la puerta de costo. Los servicios locales fueron retirados; no se creó QA hospedada.
