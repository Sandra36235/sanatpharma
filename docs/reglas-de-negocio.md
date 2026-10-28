# Flujo y reglas de negocio

## Registro manual

1. Registrar la proforma aprobada y sus líneas a partir del PDF del proveedor.
2. Registrar la factura cuando el proveedor la emite, sin esperar a que llegue al almacén.
3. Registrar cada línea tal como aparece en la factura y relacionarla con la proforma indicada por el proveedor.
4. Registrar pagos, BL y fechas del transporte conforme se conozcan.
5. Registrar la recepción física con fecha real y cantidades comprobadas.
6. Consultar pendientes, diferencias y documentos en el forecast.

La primera versión utiliza carga manual. La lectura automática de PDFs queda fuera del alcance inicial. La exportación a Excel permitirá facilitar la carga posterior al sistema de la empresa; no existe una integración automática acordada.

## Documentos y conciliación

- Recibir una proforma significa que el pedido está aprobado.
- Una proforma puede originar varias facturas.
- Una factura puede incluir productos de varias proformas, incluso antiguas.
- Una factura corresponde a un BL.
- El proveedor indica la proforma correspondiente en las líneas de su factura.
- Cantidades, precios y packing facturados pueden diferir de lo pedido. Conservar ambos valores y señalar la diferencia.
- No modificar el pedido original para hacer que coincida con la factura.
- Permitir líneas pendientes de asignar cuando falta la proforma o no coincide la información. Mostrarlas como pendientes de conciliación.
- No duplicar cantidades al repartir una línea entre asignaciones.
- No bloquear silenciosamente una diferencia comercial real: registrar el documento y hacer visible la discrepancia.

## Unidades y packing

Las cantidades de proformas y facturas del Excel están en la misma unidad comercial, según confirmación de la usuaria. El packing debe conservarse por línea, porque puede cambiar entre documentos. No inferir una conversión a partir del texto del packing. Si se necesita convertir unidades, la equivalencia debe quedar explícitamente registrada y validada.

## Fechas y recepciones

- Separar fechas estimadas de fechas reales para salida, Arica y Cochabamba.
- Conservar fecha del documento y fecha de BL.
- FECHA LLEGADA del Excel histórico significa llegada estimada a Cochabamba.
- Una fecha estimada no demuestra una recepción real.
- No inventar fechas reales ni marcar como recibida una factura histórica sin evidencia.
- Reconstruir las recepciones antiguas con documentos o comprobación administrativa, conservando la evidencia disponible.
- Permitir recepciones parciales y mantener trazabilidad hasta las líneas de factura y proforma.
- Cambiar una estimación debe dejar historial; el registro de una fecha real no debe borrar la estimada.

## Pagos

El 30 % corresponde a un anticipo sobre el importe de cada factura para que el proveedor envíe la mercadería. No es un descuento comercial ni un anticipo calculado sobre la proforma.

- Importe de factura: conservar el importe completo.
- Anticipo requerido: importe de factura × 30 %.
- Pagado: suma de pagos efectivamente registrados, con fecha e importe.
- Saldo: importe de factura − pagos efectivos.
- No dar por pagado el anticipo solo por calcularlo.
- El plazo del saldo restante aún no está confirmado. Admitir vencimiento vacío y mostrar «Plazo por confirmar»; no tratarlo como vencido sin una fecha válida.
- Separar el estado financiero del estado del embarque.

## Forecast

La vista principal permite ver productos en filas y el avance por proforma y factura, siguiendo la disposición útil del Excel. Debe permitir consultar cantidades pedidas, facturadas, recibidas, pendientes de facturar y pendientes de recibir, junto con las fechas y diferencias.

Para cantidades comparables:

- Pedido vigente = pedido original − cancelaciones documentadas.
- Facturado de una proforma = suma de cantidades asignadas a sus líneas.
- Recibido de una proforma = suma de recepciones aplicadas a sus asignaciones.
- Pendiente de facturar = máximo entre pedido vigente − facturado y cero.
- Exceso facturado = máximo entre facturado − pedido vigente y cero; mostrarlo como diferencia independiente.
- Pendiente de recepción de factura = cantidad facturada − recepción física registrada, con diferencias visibles si se recibe de más.
- Pendiente de llegada del pedido debe distinguir lo aún no facturado de lo ya facturado pendiente de recepción. No presentar toda esa cantidad como mercadería en tránsito.
- Sin asignar = cantidades facturadas que todavía no están vinculadas con una proforma.

Los totales por factura compartida entre varias proformas deben usar únicamente las cantidades asignadas a la proforma filtrada, evitando repetir el total completo de la factura.

## Catálogo, permisos y alcance

- PRODUCTO conectado a la base de datos es la fuente principal para código, nombre, estado y presentación. tProductos aporta información complementaria.
- Los costos de los documentos se conservan en sus líneas. El costo de referencia para el pedido procede de la proforma; conservar también el precio real de factura si difiere.
- La gerente administrativa registra y realiza seguimiento. El gerente general consulta.
- La aplicación requiere acceso autenticado y permisos de base de datos coherentes con esos roles; ocultar botones no reemplaza el control de acceso.
- No subir datos operativos ni PDFs al repositorio público.
- No se implementan OCR, conexión automática al sistema empresarial ni módulo de nuevos pedidos en el alcance inicial.
