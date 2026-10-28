# Sanatpharma · Control de importaciones

Herramienta para registrar proformas y facturas del proveedor, seguir sus embarques y consultar un forecast por producto, proforma y factura.

## Base acordada

- [Modelo de datos y diagrama ER](docs/modelo-de-datos.md)
- [Flujo, reglas de negocio y alcance](docs/reglas-de-negocio.md)
- [Estado del proyecto y decisiones pendientes](docs/estado-del-proyecto.md)

La documentación conserva las decisiones tomadas durante el trabajo con el Excel FORECAST Y CONTROL. El repositorio todavía no contiene una aplicación ni migraciones ejecutables.

## Usuarios

- Gerencia administrativa: registro y seguimiento.
- Gerencia general: consulta.

## Dirección técnica

Supabase para base de datos, autenticación y archivos privados. Aplicación web con código versionado en este repositorio. El alojamiento de la aplicación está pendiente de elección. El presupuesto inicial es cero; no se deben activar servicios de pago sin autorización.

El forecast será una consulta calculada sobre los documentos y movimientos registrados.

## Privacidad

Este repositorio es público. No subir documentos del proveedor, exportaciones del Excel, datos comerciales, contraseñas ni claves secretas. Los datos operativos se almacenarán fuera del repositorio.
