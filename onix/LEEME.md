# Scripts para ONIX (MySQL 5.5)

El sistema definitivo vive dentro de ONIX (interfaz) y samya server (backend), sobre las bases MySQL 5.5.60 `samya_almacen_cbba` (Cochabamba) y `samya_almacen_scz` (Santa Cruz, espejo en el mismo servidor). Esta carpeta trae la estructura; el prototipo web (`src/` + `supabase/`) muestra cómo se usa.

| Script | Base | Qué hace |
|---|---|---|
| `01_catalogo_producto_proveedor.sql` | Cochabamba **y** Santa Cruz | Tarea 1: respaldo, columnas nuevas en `PROVEEDOR` (prefijo, lead time, incoterm, moneda, anticipo, plazo) y `PRODUCTO` (línea, laboratorio como clave de `PROVEEDOR`, código nuevo, forecast, contenedor), tablas `LINEA` y `PRODUCTO_PROVEEDOR` (un solo habitual por producto). |
| `02_limpieza_espacios.sql` | Ambas | Quita espacios sobrantes en textos del producto. Nada más. |
| `10_modulo_importaciones.sql` | Solo Cochabamba | Módulo `IMP_`: proformas, facturas, asignación, embarques (Arica/Iquique), recepción enlazada a `COMPRA_DETALLE`, giros (anticipo por proforma, cancelación por factura), gastos con % al costo, hoja de costos por lote, forecast y vistas de stock, ventas y alerta. |
| `98_prueba_modulo.sql` | Copia de prueba | Datos ficticios dentro de una transacción con `ROLLBACK`. Comprueba CIF, paramétrica y costo por lote. |
| `99_verificacion_catalogo.sql` | Ambas | Solo lectura: resumen y pendientes de la tarea 1. |

La carga inicial de datos (prefijos, cruce de proveedores, códigos nuevos y complemento de productos) usa datos comerciales y se entrega aparte: **no se sube a este repositorio**.

## Antes de ejecutar

1. Probar siempre en una copia de la base.
2. Confirmar con Sistemas que ONIX no hace `INSERT INTO PRODUCTO VALUES (...)` ni `INSERT INTO PROVEEDOR VALUES (...)` sin nombrar columnas.
3. Ejecutar con el cliente `mysql` (se detiene ante el primer error) y `SET NAMES utf8` (ya va en cada script): los textos con acentos se comparan por nombre.
4. `01` no se puede ejecutar dos veces (crea tablas de respaldo con fecha). Es a propósito.

## Reglas que cumple

- MySQL 5.5: sin `CHECK` (las reglas van en triggers con `SIGNAL`), sin columnas generadas ni JSON, un solo `TIMESTAMP` con `CURRENT_TIMESTAMP` por tabla y vistas en capas (no admite subconsultas en el `FROM`).
- No toca `KARDEX_INGRESO` (ya tiene su trigger): la recepción se enlaza desde `IMP_RECEPCION_DETALLE`.
- Todo se cruza entre sucursales por `PRODUCTO.CODIGO`, nunca por `COD_PRODUCTO`.
- % al costo: concepto fijo (IVA de la DIM, ITF = 0 %) › tipo de documento (factura 87 %, recibo, nota de débito y DIM 100 %). Vacío = sugerido; si se escribe otro valor, se respeta.
- CIF en Bs = anticipos aplicados y cancelación en Bs + diferencia de cambio. Paramétrica = (CIF Bs + gastos al costo) ÷ CIF Bs. Costo unitario = precio × TC efectivo × paramétrica.

## Probado

En MariaDB 10.11 con la estructura de `samya_almacen_cbba` y su espejo: los scripts corren sin errores, la prueba da CIF 12.100, paramétrica 1,0991736 y costo unitario 102,3077 (igual que el prototipo), y los triggers rechazan asignar de más, aplicar más que el anticipo y tocar una hoja cerrada. Falta probar en MySQL 5.5.60 real.

## Por confirmar con Sistemas

- Qué `ESTADO` de `NOTA` / `KARDEX_EGRESO` cuenta como venta válida (vista `V_IMP_VENTA_MES_*`).
- Si `PRODUCTO.STOCK` está siempre al día o conviene calcular el stock desde el kardex.
- Dónde guarda samya server los PDF (`IMP_ADJUNTO.RUTA`) y cómo se pasa el costo por lote a ONIX.
