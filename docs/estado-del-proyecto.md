# Estado del proyecto

## Acordado y documentado

- Modelo de control y lógica trabajados con el Excel.
- Registro manual de documentos y seguimiento de fechas reales y estimadas.
- Relación de facturas con múltiples proformas a nivel de líneas.
- Registro de cantidades, packing y precios propios de cada documento.
- Anticipo por proforma (30 % habitual), aplicado en partes a sus facturas; cancelación por factura con su tipo de cambio.
- Hoja de costos por factura: % al costo sugerido por documento y corregible, prorrateo por valor (paramétrica) y costo por lote.
- Pedido sugerido con stock y ventas de ONIX, lead time del proveedor y proforma sugerida.
- El módulo definitivo vivirá en ONIX (MySQL 5.5); scripts en `onix/`.
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

- URL de GitHub Pages en la configuración de Auth de Supabase (enlaces de invitación y recuperación).
- Validar el pedido sugerido con la primera exportación real de existencias y ventas de ONIX.
- Proyecto Supabase identificado: `fgdqzwqucmlkultcqkmk`; no guardar claves secretas en Git.
- Reparto de un anticipo entre facturas cuando el proveedor no lo indica.
- Incoterm de los envíos aéreos.
- Equivalencias de unidades, solamente si al cargar documentos se detectan unidades distintas.
- Formato de exportación que resulte más útil para el sistema empresarial y mecanismo de respaldo independiente.

Estos puntos no invalidan el flujo acordado ni justifican inventar fechas o condiciones comerciales.
