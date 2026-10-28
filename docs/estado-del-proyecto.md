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

Se implementaron las migraciones SQL de tablas, permisos, historial, forecast y almacenamiento privado, junto con la interfaz React para su operación. Incluyen pruebas automatizadas con datos ficticios y funciones transaccionales para guardar documentos. El despliegue y sus verificaciones se registran en `docs/despliegue.md`. El estado de cuentas reales y alojamiento se documenta en `docs/interfaz.md`; no se importaron datos comerciales.

La interfaz dispone de pantallas de carga y forecast sobre estas decisiones y migraciones. La puesta en uso requiere completar cuentas, alojamiento y validación con documentos reales.

## Aspectos todavía abiertos

- Alojamiento del frontend, sin costo.
- Proyecto Supabase identificado: `fgdqzwqucmlkultcqkmk`; no guardar claves secretas en Git.
- Plazo de pago del saldo de las facturas.
- Equivalencias de unidades, solamente si al cargar documentos se detectan unidades distintas.
- Formato de exportación que resulte más útil para el sistema empresarial y mecanismo de respaldo independiente.

Estos puntos no invalidan el flujo acordado ni justifican inventar fechas o condiciones comerciales.
