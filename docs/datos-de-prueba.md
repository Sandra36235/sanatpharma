# Datos de prueba y respaldo

## Estado actual (11 de noviembre de 2026)

- Los datos reales se respaldaron completos en el esquema **`respaldo_20261111`** de la misma base (27 tablas, 3.225 filas, verificadas tabla por tabla). La app no tiene acceso a ese esquema. **No borrarlo.**
- La base quedó cargada con `supabase/datos-prueba.sql`: todo ficticio, para recorrer el proceso completo. Los usuarios (`perfiles`) y los catálogos de costos se conservaron.

## Qué trae el caso de prueba

| Documento | Situación | Para practicar |
|---|---|---|
| PRB LO 001 2026 → factura PRB-INV-101 | Ciclo cerrado: recibida en Cochabamba, pagada (anticipo aplicado + cancelación), hoja de costos **cerrada** | Leer una hoja completa; reabrirla y corregir un % al costo |
| PRB LO 002 2026 → factura PRB-INV-118 | Factura parcial en tránsito por Iquique; saldo pendiente; hoja en preparación | Registrar fechas, la cancelación del saldo, gastos y lotes |
| PRB FI 014 2026 | Proforma enviada (EUR, FOB) | Girar el anticipo del 50 %, confirmarla, registrar su factura |
| Pedido sugerido | 3 productos «pedir ya», 2 «pedir pronto», 3 cubiertos | Crear una proforma sugerida, ajustarla y enviarla |

Proveedores: LAB ORIENTE (PRUEBA) y FARMA IBERICA (PRUEBA). Productos PRB-001 a PRB-008.

## Volver a cargar los datos de prueba

Ejecutar `supabase/datos-prueba.sql` en el editor SQL de Supabase. Borra los datos operativos de `public` y deja el caso de prueba desde cero.

## Volver a los datos reales

Ejecutar `supabase/restaurar-respaldo.sql` (con el nombre del esquema de respaldo). Copia todo desde `respaldo_20261111` a `public`, sin disparadores, tal cual estaba. Lo registrado durante las pruebas se pierde.

Antes de restaurar conviene revisar que no haya migraciones nuevas que cambien columnas: si las hay, la restauración copia solo las columnas que existen en ambos lados.
