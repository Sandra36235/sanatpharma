# Estado del proyecto

## Acordado y documentado

- Modelo de control y lógica trabajados con el Excel.
- Registro manual de documentos y seguimiento de fechas reales y estimadas.
- Relación de facturas con múltiples proformas a nivel de líneas.
- Registro de cantidades, packing y precios propios de cada documento.
- Anticipo del 30 % calculado sobre la factura y pagos efectivos separados.
- Dos perfiles: administración con registro y gerencia con consulta.
- Supabase como dirección elegida para base de datos y acceso.
- Repositorio GitHub: https://github.com/Sandra36235/sanatpharma
- Presupuesto inicial cero.

## Conservación del trabajo de Excel

Se trabajaron el catálogo combinado, proformas y sus líneas, facturas y sus líneas, recepciones, control de llegadas y forecast por producto con columnas por documento. El Excel es la fuente operativa para una eventual migración, con validación previa. Este repositorio no contiene una copia del libro ni de sus datos.

La migración debe preservar las diferencias detectadas en el control: referencias sin correspondencia, cantidades facturadas mayores que las pedidas y fechas históricas que solo eran estimadas. No convertir esas situaciones en datos aparentemente conciliados.

## Implementación pendiente

Todavía no hay aplicación, esquema SQL desplegado, usuarios creados ni datos cargados desde este repositorio. Haber documentado el modelo no significa que esté implementado en Supabase.

El siguiente trabajo técnico parte de estas decisiones: implementar las migraciones y permisos, y después las pantallas de carga y forecast. No requiere volver a definir el flujo desde cero.

## Aspectos todavía abiertos

- Alojamiento del frontend, sin costo.
- Identificación y conexión del proyecto Supabase creado por la usuaria; no guardar claves secretas en Git.
- Plazo de pago del saldo de las facturas.
- Equivalencias de unidades, solamente si al cargar documentos se detectan unidades distintas.
- Formato de exportación que resulte más útil para el sistema empresarial y mecanismo de respaldo independiente.

Estos puntos no invalidan el flujo acordado ni justifican inventar fechas o condiciones comerciales.
