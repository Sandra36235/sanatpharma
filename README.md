# Sanatpharma · Control de importaciones

Herramienta para registrar proformas y facturas del proveedor, seguir sus embarques y consultar un forecast por producto, proforma y factura.

## Base acordada

- [Modelo de datos y diagrama ER](docs/modelo-de-datos.md)
- [Flujo, reglas de negocio y alcance](docs/reglas-de-negocio.md)
- [Estado del proyecto y decisiones pendientes](docs/estado-del-proyecto.md)
- [Instalación, permisos y validación de Supabase](docs/instalacion-supabase.md)
- [Interfaz, acceso y ejecución local](docs/interfaz.md)

La documentación conserva las decisiones tomadas durante el trabajo con el Excel FORECAST Y CONTROL. El repositorio incluye la interfaz web, las migraciones ejecutables de Supabase y pruebas de integridad, permisos, forecast y guardado de documentos.

Para abrir la interfaz: `npm ci`, completar `.env.local` según `.env.example` y ejecutar `npm run dev`. La compilación para alojamiento estático se genera con `npm run build`. Consultar `docs/interfaz.md` para el alcance y la configuración de cuentas.

## Usuarios

- Gerencia administrativa: registro y seguimiento.
- Gerencia general: consulta.

## Dirección técnica

Supabase para base de datos, autenticación y archivos privados. Aplicación web con código versionado en este repositorio. El alojamiento de la aplicación está pendiente de elección. El presupuesto inicial es cero; no se deben activar servicios de pago sin autorización.

El forecast será una consulta calculada sobre los documentos y movimientos registrados.

## Privacidad

Este repositorio es público. No subir documentos del proveedor, exportaciones del Excel, datos comerciales, contraseñas ni claves secretas. Los datos operativos se almacenarán fuera del repositorio.
