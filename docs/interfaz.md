# Interfaz del control

Aplicación React y Vite conectada a Supabase con la clave pública de publicación y los permisos RLS del proyecto. No utiliza claves secretas ni operaciones administrativas de Auth desde el navegador.

## Uso local

1. Instalar dependencias: `npm ci`.
2. Copiar `.env.example` a `.env.local` y completar la clave **publishable**, disponible en Settings → API Keys. Nunca usar una clave secret o service_role.
3. Ejecutar `npm run dev`.
4. Abrir la dirección que muestra Vite. La configuración local de esta entrega usa `http://127.0.0.1:5173/`.

`npm run build` genera `dist/` para un alojamiento estático. El alojamiento definitivo todavía no está elegido. No se publicaron datos ni documentos en un hosting nuevo.

En esta computadora, las dependencias y la configuración pública local ya están preparadas. El archivo `INICIAR CONTROL.cmd` permite volver a iniciar el servidor en el puerto 5173; mantener su ventana abierta durante el uso. Si el servidor ya está abierto, utilizar directamente su dirección y no abrir otra instancia en el mismo puerto.

## Pantallas

- Inicio de sesión con correo y contraseña, recuperación y establecimiento de contraseña por invitación.
- Forecast por producto y unidad, filtros por proforma/factura, detalle desplegable, matriz de documentos y exportación CSV para Excel.
- Catálogo de productos y complementos del proveedor, con registro y edición para administración.
- Proformas y facturas: cabecera y líneas guardadas juntas. La factura conserva precios, packing y referencia de proforma del PDF.
- Conciliación: cada línea de factura se puede repartir entre varias líneas de proformas compatibles; lo no vinculado permanece visible.
- BL y fechas estimadas/reales de salida, Arica y Cochabamba.
- Pagos efectivos y control del anticipo del 30 %.
- Recepciones físicas parciales y aplicación posterior a las proformas desde el detalle de factura.
- PDFs privados asociados a los documentos, enlaces temporales y reintento de cargas pendientes.
- Equipo: consulta de perfiles activos y sus roles. La aplicación no puede elevar sus propios permisos ni crear cuentas administrativas.

El rol consulta puede navegar y exportar. El rol administración dispone de los formularios. La base de datos vuelve a comprobar los permisos de todas las escrituras, incluidas las funciones transaccionales de la migración `202610280004_operaciones.sql`.

## Accesos reales

Los correos del equipo se proporcionaron en la conversación y no se guardan en el repositorio público. Antes de enviar invitaciones, configurar en Supabase Authentication → URL Configuration la URL real de la aplicación y sus redirecciones permitidas. No enviar a otras personas enlaces que apunten al localhost de otra máquina.

Crear las cuentas mediante Authentication, utilizando invitaciones para que cada persona defina su contraseña. Después, asignar los UUID correspondientes en `perfiles`: administración para las personas responsables del registro y consulta para gerencia. No introducir contraseñas en SQL ni en este repositorio.

La entrega local no sustituye el alojamiento accesible desde las computadoras del equipo. La prueba de inicio de sesión con una cuenta real requiere que su titular complete su contraseña.

La usuaria eligió la prueba local y confirmó tres accesos: dos de administración y uno de consulta. El estado comprobado de altas e invitaciones se conserva en `docs/despliegue.md`. La URL de autenticación está configurada para `http://127.0.0.1:5173/?acceso=1`; debe cambiarse antes de invitar usuarios para un alojamiento definitivo.

## Ejemplo visual

En desarrollo, `/?ejemplo=1` muestra datos ficticios y bloquea guardados. Esa entrada está deshabilitada por `import.meta.env.DEV` en la compilación de producción. No sirve como un acceso alternativo a Supabase.

## Validación

Las pruebas de base de datos incluyen permisos y operaciones atómicas: una línea inválida revierte el documento completo. Se verifica también que consulta no pueda llamar las operaciones de escritura. La compilación de producción se comprueba con `npm run build`. Las pruebas visuales utilizan datos ficticios, sin sustituir la aceptación de los usuarios ni una prueba de correo/contraseña en el entorno final.

Referencias: [autenticación por contraseña](https://supabase.com/docs/guides/auth/passwords), [usuarios e invitaciones](https://supabase.com/docs/guides/auth/users), [redirecciones](https://supabase.com/docs/guides/auth/redirect-urls), [alojamiento de Vite](https://vite.dev/guide/static-deploy).
