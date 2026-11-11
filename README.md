# Sanatpharma · Control de importaciones

Herramienta para planificar compras (pedido sugerido), registrar proformas y facturas del proveedor, seguir sus embarques, controlar anticipos y cancelaciones, y calcular la hoja de costos por lote.

**Aplicación publicada:** https://sandra36235.github.io/sanatpharma/ · **Vista de ejemplo con datos ficticios:** https://sandra36235.github.io/sanatpharma/?ejemplo=1

## Base acordada

- [Modelo de datos y diagrama ER](docs/modelo-de-datos.md)
- [Flujo, reglas de negocio y alcance](docs/reglas-de-negocio.md)
- [Estado del proyecto y decisiones pendientes](docs/estado-del-proyecto.md)
- [Instalación, permisos y validación de Supabase](docs/instalacion-supabase.md)
- [Interfaz, acceso y ejecución local](docs/interfaz.md)
- [Pagos, hoja de costos y pedido sugerido](docs/pagos-costos-planificacion.md)
- [Scripts para ONIX (MySQL 5.5)](onix/LEEME.md)
- [Datos de prueba y respaldo](docs/datos-de-prueba.md)

La documentación conserva las decisiones tomadas durante el trabajo con el Excel FORECAST Y CONTROL. El repositorio incluye la interfaz web, las migraciones ejecutables de Supabase y pruebas de integridad, permisos, forecast y guardado de documentos.

Para abrir la interfaz: `npm ci`, completar `.env.local` según `.env.example` y ejecutar `npm run dev`. La compilación para alojamiento estático se genera con `npm run build`. Consultar `docs/interfaz.md` para el alcance y la configuración de cuentas.

## Usuarios

- Gerencia administrativa: registro y seguimiento.
- Gerencia general: consulta.

## Dirección técnica

Prototipo: Supabase para base de datos, autenticación y archivos privados, y aplicación web publicada en GitHub Pages (cada cambio en `main` se prueba y se publica solo). Destino final: el módulo vivirá dentro de ONIX sobre MySQL 5.5; la estructura está en `onix/`. El presupuesto inicial es cero; no se deben activar servicios de pago sin autorización.

El forecast será una consulta calculada sobre los documentos y movimientos registrados.

## Privacidad

Este repositorio es público. No subir documentos del proveedor, exportaciones del Excel, datos comerciales, contraseñas ni claves secretas. Los datos operativos se almacenarán fuera del repositorio.
