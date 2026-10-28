# Registro de despliegue

Proyecto: `fgdqzwqucmlkultcqkmk` (Tracking de Compras, Sanat Pharma).

## Validación local · 28 de octubre de 2026

18 pruebas automatizadas aprobadas sobre PostgreSQL mediante PGlite. Incluyen restricciones, permisos de administración/consulta/anónimo, auditoría, políticas de adjuntos y cálculos con factura compartida entre proformas. También se comprueba que el script de verificación revierte todos los datos de prueba.

Las pruebas simulan los contratos mínimos de Auth y Storage. No verifican peticiones HTTP reales, entrega de invitaciones, inicio de sesión ni subida de archivos al servicio Storage. La concurrencia entre sesiones no está probada localmente.

## Supabase

Se comprobó mediante SQL Editor que los esquemas `public` y `control_privado` no contenían tablas previas. Se aplicaron correctamente las tres migraciones del repositorio, en orden, el 28 de octubre de 2026:

- `202610280001_control.sql`.
- `202610280002_forecast.sql`.
- `202610280003_documentos.sql`.

Se ejecutó el recorrido de `supabase/tests/verificar_proyecto.sql` en el proyecto real. Resultado: «APROBADO: forecast, pagos, RLS, vistas y bucket; prueba revertida». El script verificó los totales de forecast, el anticipo y saldo, RLS, la configuración de las vistas, el bucket privado y la ausencia de acceso para una sesión autenticada sin perfil. La transacción se revirtió al terminar, sin guardar los documentos ficticios.

Las migraciones se aplicaron por SQL Editor. No se registraron como despliegue de Supabase CLI; reconciliar ese historial antes de usar `supabase db push`.

No hay usuarios operativos dados de alta ni información comercial importada.
