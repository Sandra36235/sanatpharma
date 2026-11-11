# Pagos, hoja de costos y pedido sugerido

Migración `supabase/migrations/202611110008_pagos_costos_planificacion.sql` y pantallas `src/modulos.jsx`. La misma lógica, para ONIX (MySQL 5.5), está en `onix/10_modulo_importaciones.sql`.

## El ciclo

1. **Catálogo.** Cada producto tiene línea, laboratorio, proveedor de compra, código nuevo, mínimo de pedido y si entra al forecast.
2. **Pedido sugerido.** Se importan de ONIX las existencias (Cochabamba y Santa Cruz) y las ventas por mes. La vista `v_planificacion` calcula pronóstico, en camino, cobertura, fecha de quiebre, alerta (pedir ya / pronto / cubierto) y cantidad sugerida. Con los productos elegidos se crea una **proforma sugerida**.
3. **Proforma.** Estados: sugerida → enviada → confirmada → cerrada. Guarda incoterm, puerto de carga, vía, condición de pago, anticipo y días de producción. Lo sugerido queda junto a lo pedido para medir el acierto. Las sugeridas no cuentan como pedido ni como «en camino».
4. **Factura y asignación.** Igual que antes: cada línea facturada se asigna a la proforma que corresponde.
5. **Embarque.** Puerto de llegada Arica o Iquique, naviera, aduana. La etapa la marca la última fecha real.
6. **Pagos.** El anticipo se gira contra la proforma (`giros`, tipo anticipo) y se aplica en partes a sus facturas (`giros_factura`). La cancelación se gira contra la factura. Cada giro guarda el tipo de cambio del banco.
7. **Hoja de costos.** Por factura: cabecera (condición, compra de ONIX, DIM, TC DIM), gastos con su documento y lotes de la nota de ingreso.

## Reglas de costo

- **% al costo sugerido:** concepto fijo (IVA de la DIM, ITF = 0 %) › tipo de documento (factura 87 %; recibo, nota de débito, DIM, formulario 100 %). Si se deja vacío se usa el sugerido; si se escribe otro valor se respeta y queda en el historial.
- **CIF en Bs** = anticipos aplicados en Bs + cancelación en Bs + diferencia de cambio (grupo «Valor de la factura»). Se calcula cuando la factura está pagada al 99 % o más; si no, con un tipo de cambio manual para el saldo.
- **Paramétrica** = (CIF Bs + gastos al costo) ÷ CIF Bs. Prorrateo por valor, como la hoja actual; abierto a revisión con contabilidad.
- **Costo unitario en almacén** = precio de origen × TC efectivo (CIF Bs ÷ total de la factura) × paramétrica.
- Una hoja **cerrada** no admite cambios en gastos ni lotes; se reabre para corregir.

Comprobado con una hoja de costos real (cargada en la base, no en el repositorio): CIF en Bs, gastos al costo, paramétrica y costo total coinciden con el Excel. El costo unitario puede diferir unas centésimas si la factura trae bonificaciones (free goods) que no se registran como línea.

## Controles (al confirmar la transacción)

- El anticipo va al proveedor de la proforma; la cancelación, con el proveedor y la moneda de la factura.
- Solo se aplican anticipos (no cancelaciones), del mismo proveedor y moneda, y nunca más que lo girado.
- Los lotes no superan lo facturado y pertenecen a la misma factura.

## Importar de ONIX

Pegar o cargar CSV con `;`, `,` o tabulación; decimales con coma o punto; se cruza por `CODIGO`.

- Existencias: `CODIGO ; ALMACEN (Cochabamba / Santa Cruz) ; FECHA ; CANTIDAD`
- Ventas: `CODIGO ; SUCURSAL ; MES (2026-09) ; CANTIDAD`

Solo aparecen en el pedido sugerido los productos activos con complemento y «forecast» marcado.

## Factura desde proformas

En **Facturas → Desde proformas**: se elige el proveedor y una o varias de sus proformas (abiertas; opcionalmente también las cerradas). Aparecen sus líneas con lo pedido y lo pendiente de facturar; se marcan las que trae la factura y se ajustan **cantidad, packing y precio** como vienen en el documento del proveedor. La pantalla señala cada diferencia (más que lo pendiente, factura parcial, packing o precio distinto) y avisa si las proformas tienen monedas distintas. Al guardar, cada línea queda asignada a su línea de proforma, sin conciliación manual posterior. «Factura en blanco» sigue disponible para documentos que no salen de una proforma.
