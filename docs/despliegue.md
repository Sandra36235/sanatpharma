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

## Interfaz y operaciones · 28 de octubre de 2026

Se aplicó correctamente `202610280004_operaciones.sql` mediante SQL Editor: guardado transaccional de proformas/facturas con sus líneas, productos con complementos y recepciones con sus aplicaciones. Todas las funciones utilizan permisos del usuario que las ejecuta y comprueban administración. Pasaron 22 pruebas locales y la compilación de producción.

La interfaz se sirve localmente en `http://127.0.0.1:5173/`, conectada con la clave publishable del proyecto guardada en `.env.local` (archivo excluido de Git). Se revisaron navegación, búsqueda y filtros del forecast, la matriz por documento, el formulario de proformas y sus líneas dinámicas, el detalle de factura con conciliaciones y el seguimiento de embarques. La revisión visual utilizó datos ficticios de desarrollo; no se importó información comercial.

La usuaria eligió probar primero en esta computadora. Se configuró la URL de autenticación local y se confirmó el reparto de tres accesos. Se crearon dos cuentas mediante invitación y se habilitaron sus perfiles de administración. La tercera invitación no se completó y el formulario no mostró un motivo; los registros de Auth consultados tampoco aportaron una causa. No se afirma que sea un límite de correos ni que las invitaciones hayan sido entregadas en las bandejas de destino.

El intento alternativo de alta manual fue bloqueado por revisión automática. La usuaria eligió completar ella misma ese paso en el panel. La tercera cuenta y su perfil de consulta deben comprobarse tras ese alta; no se consideran completados antes de verificarlo. No se introdujeron ni guardaron contraseñas por parte del agente. Los correos y UUID reales no se incluyen en el repositorio público.

Queda pendiente la prueba de inicio de sesión con contraseña definida por su titular y el alojamiento accesible para todo el equipo. Los enlaces de autenticación locales deben reemplazarse por la URL final antes del uso desde otras computadoras.
