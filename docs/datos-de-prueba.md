# Datos de prueba y respaldo

## Estado actual (11 de noviembre de 2026)

La base tiene **los datos reales** (restaurados desde el respaldo) más solo dos cosas de prueba para que el pedido sugerido funcione:

| Qué | De dónde sale | Cómo quitarlo |
|---|---|---|
| Ventas por mes (nov-2025 a oct-2026), Cochabamba 60 % / Santa Cruz 40 % | Lo pedido a JAYWIN en las proformas de los últimos 24 meses ÷ 24, con estacionalidad suave y ±20 % de variación | `supabase/quitar-ventas-prueba.sql` |
| Existencias al 10/11/2026 | Entre 1 y 8 meses de esa venta, para que haya productos en cada alerta | El mismo script |

Además, por decisión de Sandra, todas las proformas anteriores pasaron a estado **cerrada**, salvo 004 JB SEA 2026 y la proforma de prueba de BABARIA. En los datos no hay recepciones ni fechas reales de llegada, así que sin cerrarlas todo lo pedido desde 2023 contaba como «en camino».

Las proformas, facturas, embarques, la hoja de costos de la 007 JB P5 y sus pagos son reales y quedaron igual.

## Respaldo

Copia completa de `public` antes de todo esto en el esquema **`respaldo_20261111`** (27 tablas, 3.225 filas). La app no tiene acceso a ese esquema. **No borrarlo.** Para volver exactamente a ese punto: `supabase/restaurar-respaldo.sql`.

## Caso 100 % ficticio

`supabase/datos-prueba.sql` borra los datos operativos y carga un caso inventado (proveedores LAB ORIENTE y FARMA IBERICA, productos PRB-001 a PRB-008). Se usó una vez y se descartó porque no se relacionaba con la operación real; queda para capacitar a alguien sin mostrar datos de la empresa.
