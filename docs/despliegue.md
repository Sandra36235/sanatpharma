# Registro de despliegue

Proyecto: `fgdqzwqucmlkultcqkmk` (Tracking de Compras, Sanat Pharma).

## Validación local · 28 de octubre de 2026

16 pruebas automatizadas aprobadas sobre PostgreSQL mediante PGlite. Incluyen restricciones, permisos de administración/consulta/anónimo, auditoría, políticas de adjuntos y cálculos con factura compartida entre proformas.

Las pruebas simulan los contratos mínimos de Auth y Storage. No verifican peticiones HTTP reales, entrega de invitaciones, inicio de sesión ni subida de archivos al servicio Storage. La concurrencia entre sesiones no está probada localmente.

## Supabase

Se comprobó mediante SQL Editor que los esquemas `public` y `control_privado` no contienen tablas previas. Instalación pendiente de ejecución y verificación.

No hay usuarios operativos dados de alta ni información comercial importada.
