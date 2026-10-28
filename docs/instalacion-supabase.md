# Base de datos de Supabase

Proyecto indicado por la usuaria: `fgdqzwqucmlkultcqkmk`.

## Contenido

Aplicar los archivos de `supabase/migrations/` en orden de nombre, una sola vez, en un proyecto nuevo. Cada archivo tiene su propia transacción: si falla, no queda aplicado parcialmente. No volver a ejecutar sobre tablas ya creadas; los cambios futuros se harán con migraciones nuevas.

1. `202610280001_control.sql`: tablas, auditoría, restricciones y perfiles.
2. `202610280002_forecast.sql`: vistas de consulta y cálculo de anticipos/saldos.
3. `202610280003_documentos.sql`: bucket privado de PDFs de hasta 10 MB y políticas de almacenamiento.
4. `202610280004_operaciones.sql`: guardados transaccionales para los formularios de productos, proformas, facturas y recepciones.

Antes de ejecutar, comprobar que no existan tablas de una instalación anterior. El esquema no contiene usuarios ni información comercial. Nunca ejecutar `tests/recorrido.sql` como una carga real: contiene información ficticia.

El SQL Editor permite ejecutar los archivos sin instalar herramientas ni compartir contraseñas. Si se usa el editor, registrar los archivos aplicados aquí; antes de adoptar Supabase CLI deberá reconciliarse su historial de migraciones para que la CLI no intente recrear las tablas.

## Usuarios

Crear los dos usuarios reales en Authentication mediante invitación o el flujo de acceso elegido para la aplicación. Después, desde el SQL Editor con el rol propietario, registrar cada UUID en `public.perfiles` con su nombre y rol: `administracion` o `consulta`. No hay un usuario administrador predeterminado, ni se otorga acceso automáticamente al primer usuario que se registra.

Solo el propietario del proyecto administra perfiles; la aplicación no puede cambiar roles. Un usuario autenticado sin perfil activo no tiene acceso a los datos. Se puede desactivar un perfil con `activo = false` sin borrar su historial.

No crear usuarios ni asignar roles usando nombres de ejemplo. Los UUID reales y correos no deben guardarse en este repositorio público.

## Consultas para las pantallas

| Vista | Uso |
| --- | --- |
| `v_forecast_producto` | Resumen por producto y unidad, incluidos productos sin movimientos |
| `v_forecast_proforma` | Pedido vigente, cantidades facturadas, recibidas, pendientes y excesos por línea de proforma |
| `v_forecast_factura` | Cantidades de factura, recepción física, conciliación pendiente, BL y fechas |
| `v_asignaciones` | Relación exacta proforma/factura con diferencias de precio y packing |
| `v_control_pagos` | Anticipo requerido, pagos efectivos, saldo y vencimiento conocido o pendiente |

Para filtrar una factura compartida por proforma, usar `v_asignaciones.proforma_id`; no sumar el total completo de la factura. Las cantidades se agrupan por unidad para no mezclar cajas con unidades. El catálogo se consulta en `productos` y sus complementos en `productos_complemento`.

## Integridad y correcciones

Las asignaciones no pueden superar la línea facturada. Las aplicaciones de recepción no pueden superar la recepción física ni la asignación, y deben corresponder a la misma línea de factura. Esas reglas también se verifican cuando se cambia una fila padre. Se permite registrar excesos reales respecto de la proforma o de la factura, y las vistas los muestran como diferencias.

Se requiere el mismo producto, proveedor y unidad para asignar una factura a una proforma. Las equivalencias entre unidades diferentes quedan pendientes de implementación: no se realizan conversiones implícitas. Los documentos pueden cargarse sin asignar hasta resolver la equivalencia.

Las validaciones relacionales son diferidas hasta el final de la transacción. Una corrección que afecte varias filas relacionadas debe hacerse en una sola transacción; la futura aplicación utilizará operaciones transaccionales para ello. El bloqueo interno serializa escrituras del equipo pequeño. Ante un conflicto de serialización, la aplicación deberá reintentar la transacción completa. Las pruebas locales no simulan sesiones concurrentes.

Las tablas guardan creador, fecha de creación, último editor y fecha de modificación. El historial conserva el antes y después; el cliente no puede editarlo. La administración puede corregir o eliminar registros sin dependencias, con auditoría; las claves foráneas impiden borrar documentos que siguen relacionados. Para reducir cantidades pedidas, utilizar la cancelación con fecha y motivo en vez de alterar la cantidad original.

## Documentos privados

Registrar un adjunto con exactamente una referencia a proforma, factura o pago. Subir el PDF al bucket `documentos-control` usando la ruta `<UUID del adjunto>/<nombre>.pdf` indicada en el registro. Solo los perfiles activos consultan los PDFs; solo administración puede subirlos. No hay permisos de actualización o eliminación de archivos desde el cliente. Para reemplazar un PDF, crear otro adjunto: el anterior permanece como evidencia. El cliente deberá mostrar y permitir reintentar cargas de archivo pendientes cuando falle la subida después de registrar el adjunto.

## Validación

`npm ci` y `npm test` ejecutan pruebas sobre un motor PostgreSQL local mediante PGlite. Se emulan los contratos mínimos de Auth y Storage; esas pruebas verifican SQL, permisos, vistas y restricciones, pero no sustituyen una prueba real del inicio de sesión, de la API y de subida/descarga de PDFs en Supabase.

El recorrido ficticio contempla dos proformas, una factura compartida, una referencia desconocida, precios y packing diferentes, un pago del 30 % y una recepción parcial. Resultado esperado: pedido vigente 150 cajas, facturado 130, recibido 60, pendiente de facturar 30, pendiente de recibir de factura 70 y sin asignar 10. Al filtrar por proforma: 80/40 facturadas y 40/20 recibidas.

`supabase/tests/verificar_proyecto.sql` ejecuta ese recorrido como propietario en el SQL Editor, verifica los resultados y revierte la transacción. No crea usuarios. Se ejecutó correctamente en el proyecto indicado; consultar el registro de despliegue. Las pruebas reversibles pueden avanzar secuencias internas aunque reviertan las filas: los identificadores de historial no deben interpretarse como una numeración continua de documentos.

## Referencias técnicas

- [RLS y vistas con security_invoker](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Control de acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Bloqueos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html)

Las vistas respetan los permisos del usuario que consulta. Los permisos se otorgan explícitamente y el acceso anónimo queda revocado para los objetos de esta aplicación; no se altera la configuración de otras aplicaciones que pueda tener el proyecto.
