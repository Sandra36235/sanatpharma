-- Tarea 1 · Limpieza segura: solo quita espacios sobrantes al inicio y al final.
-- No cambia mayúsculas, acentos ni contenido. Lo demás del «Plan de limpieza»
-- requiere decisión de Bioquímica, Compras o Sistemas y no está aquí.
SET NAMES utf8;
UPDATE PRODUCTO
SET INTERNO = TRIM(INTERNO),
    ENVASE  = TRIM(ENVASE),
    NOMBRE  = TRIM(NOMBRE),
    ABREV   = TRIM(ABREV),
    LINEA   = TRIM(LINEA),
    LABORATORIO = TRIM(LABORATORIO)
WHERE INTERNO <> TRIM(INTERNO) OR ENVASE <> TRIM(ENVASE) OR NOMBRE <> TRIM(NOMBRE)
   OR ABREV <> TRIM(ABREV) OR LINEA <> TRIM(LINEA) OR LABORATORIO <> TRIM(LABORATORIO);
