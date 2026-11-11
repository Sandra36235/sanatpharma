-- Tarea 1 · Verificación (solo lectura). Ejecutar después de 01 a 04.

-- 1. Resumen: cuántos productos tienen línea, proveedor y código nuevo
SELECT COUNT(*) AS productos,
       SUM(p.COD_LINEA IS NOT NULL) AS con_linea,
       SUM(p.COD_PROVEEDOR IS NOT NULL) AS con_laboratorio,
       SUM(pp.COD_PP IS NOT NULL) AS con_proveedor_habitual,
       SUM(p.CODIGO_NUEVO IS NOT NULL) AS con_codigo_nuevo,
       SUM(p.TIPO_CONTENEDOR = 1) AS refrigerados
FROM PRODUCTO p
LEFT JOIN PRODUCTO_PROVEEDOR pp ON pp.COD_PRODUCTO = p.COD_PRODUCTO AND pp.HABITUAL = 1;

-- 2. Pendientes: productos sin proveedor habitual o sin código nuevo
SELECT p.COD_PRODUCTO, p.CODIGO, p.NOMBRE, p.LINEA, p.LABORATORIO, p.ESTADO,
       IF(pp.COD_PP IS NULL, 'sin proveedor', '') AS falta_proveedor,
       IF(p.CODIGO_NUEVO IS NULL, 'sin codigo nuevo', '') AS falta_codigo
FROM PRODUCTO p
LEFT JOIN PRODUCTO_PROVEEDOR pp ON pp.COD_PRODUCTO = p.COD_PRODUCTO AND pp.HABITUAL = 1
WHERE pp.COD_PP IS NULL OR p.CODIGO_NUEVO IS NULL
ORDER BY p.LINEA, p.LABORATORIO, p.CODIGO;

-- 3. Coherencia del código nuevo: la letra de línea y las 2 del laboratorio
--    deben coincidir con LINEA.PREFIJO y el PREFIJO de PRODUCTO.COD_PROVEEDOR.
SELECT p.CODIGO, p.CODIGO_NUEVO, l.PREFIJO AS prefijo_linea, v.PREFIJO AS prefijo_proveedor
FROM PRODUCTO p
LEFT JOIN LINEA l ON l.COD_LINEA = p.COD_LINEA
LEFT JOIN PROVEEDOR v ON v.COD_PROVEEDOR = p.COD_PROVEEDOR
WHERE p.CODIGO_NUEVO IS NOT NULL
  AND (l.PREFIJO IS NULL OR v.PREFIJO IS NULL
       OR SUBSTRING(p.CODIGO_NUEVO, 1, 1) <> l.PREFIJO
       OR SUBSTRING(p.CODIGO_NUEVO, 2, 2) <> v.PREFIJO);

-- 4. Proveedores con sus datos nuevos
SELECT COD_PROVEEDOR, NOMBRE, PREFIJO, LEAD_TIME_DIAS, INCOTERM, COD_MONEDA, ANTICIPO_POR, PLAZO_SALDO_DIAS
FROM PROVEEDOR ORDER BY COD_PROVEEDOR;

-- 5. Líneas y prefijos
SELECT l.COD_LINEA, l.NOMBRE, l.PREFIJO, COUNT(p.COD_PRODUCTO) AS productos
FROM LINEA l LEFT JOIN PRODUCTO p ON p.COD_LINEA = l.COD_LINEA
GROUP BY l.COD_LINEA, l.NOMBRE, l.PREFIJO ORDER BY productos DESC;
