-- =====================================================================
-- Tarea 1 · Relación PRODUCTO–PROVEEDOR y columnas para importaciones
-- Base: samya_almacen_cbba (y luego su espejo de Santa Cruz)
-- Motor: MySQL 5.5.60 · Ejecutar con el cliente mysql, que se detiene
-- ante el primer error. Probar SIEMPRE antes en una copia de la base.
--
-- Qué hace:
--   0. Respalda PRODUCTO y PROVEEDOR.
--   1. Agrega a PROVEEDOR: prefijo, lead time, incoterm, moneda y
--      condiciones de pago.
--   2. Crea LINEA (línea comercial con su prefijo de 1 letra).
--   3. Agrega a PRODUCTO: COD_LINEA, COD_PROVEEDOR (el laboratorio, ahora
--      como clave de PROVEEDOR), CODIGO_NUEVO, ESTADO_FORECAST y
--      TIPO_CONTENEDOR.
--   4. Crea PRODUCTO_PROVEEDOR: a quién se le puede comprar cada producto
--      (puede ser más de uno), con uno solo marcado como habitual.
--
-- Notas:
--   * Las columnas nuevas van al FINAL de cada tabla y aceptan vacío,
--     para no alterar el orden de las existentes. Antes de ejecutar,
--     Sistemas debe confirmar que ONIX no usa «INSERT INTO PRODUCTO
--     VALUES (...)» ni «INSERT INTO PROVEEDOR VALUES (...)» sin nombrar
--     columnas: esas sentencias fallarían al haber columnas nuevas.
--   * Todo se cruza por PRODUCTO.CODIGO y por el nombre del proveedor,
--     nunca por COD_PRODUCTO ni COD_PROVEEDOR, porque pueden ser
--     distintos entre Cochabamba y Santa Cruz.
--   * La moneda y las condiciones de pago quedan vacías: aún no están
--     confirmadas.
-- =====================================================================

SET NAMES utf8;

-- ---------------------------------------------------------------------
-- 0. Respaldo (cambiar la fecha si se vuelve a ejecutar otro día)
-- ---------------------------------------------------------------------
CREATE TABLE BK_PRODUCTO_20261110 ENGINE = InnoDB AS SELECT * FROM PRODUCTO;
CREATE TABLE BK_PROVEEDOR_20261110 ENGINE = InnoDB AS SELECT * FROM PROVEEDOR;

-- ---------------------------------------------------------------------
-- 1. PROVEEDOR
-- ---------------------------------------------------------------------
ALTER TABLE PROVEEDOR
  ADD COLUMN PREFIJO          CHAR(2)       NULL COMMENT '2 letras para el código nuevo (JR, BE…)',
  ADD COLUMN LEAD_TIME_DIAS   INT           NULL COMMENT 'Días desde la proforma hasta el almacén',
  ADD COLUMN INCOTERM         VARCHAR(3)    NULL COMMENT 'FOB, CFR, CIF, FCA, CPT, CIP…',
  ADD COLUMN COD_MONEDA       INT           NULL COMMENT 'Moneda habitual (MONEDA.COD_MONEDA)',
  ADD COLUMN ANTICIPO_POR     DECIMAL(5,2)  NULL COMMENT 'Anticipo sobre factura, en %',
  ADD COLUMN PLAZO_SALDO_DIAS INT           NULL COMMENT 'Días para pagar el saldo',
  ADD UNIQUE INDEX UQ_PROVEEDOR_PREFIJO (PREFIJO),
  ADD INDEX IDX_PROVEEDOR_MONEDA (COD_MONEDA);

-- ---------------------------------------------------------------------
-- 2. LINEA
-- ---------------------------------------------------------------------
CREATE TABLE LINEA (
  COD_LINEA  INT          NOT NULL AUTO_INCREMENT,
  NOMBRE     VARCHAR(300) NOT NULL COMMENT 'Igual al texto de PRODUCTO.LINEA',
  PREFIJO    CHAR(1)      NULL     COMMENT '1 letra para el código nuevo (S, B…)',
  ENCARGADO  VARCHAR(100) NOT NULL DEFAULT '',
  ESTADO     VARCHAR(10)  NOT NULL DEFAULT 'activo',
  PRIMARY KEY (COD_LINEA),
  UNIQUE INDEX UQ_LINEA_NOMBRE (NOMBRE),
  UNIQUE INDEX UQ_LINEA_PREFIJO (PREFIJO)
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci;

INSERT INTO LINEA (NOMBRE, ENCARGADO)
SELECT DISTINCT TRIM(LINEA), 'migracion' FROM PRODUCTO
WHERE LINEA IS NOT NULL AND TRIM(LINEA) <> '';

-- Los prefijos de línea (1 letra) se cargan con los datos, aparte.

-- ---------------------------------------------------------------------
-- 3. PRODUCTO
-- ---------------------------------------------------------------------
ALTER TABLE PRODUCTO
  ADD COLUMN COD_LINEA       INT         NULL COMMENT 'LINEA.COD_LINEA',
  ADD COLUMN COD_PROVEEDOR   INT         NULL COMMENT 'Laboratorio: PROVEEDOR.COD_PROVEEDOR. Reemplaza al texto LABORATORIO',
  ADD COLUMN CODIGO_NUEVO    VARCHAR(8)  NULL COMMENT 'LPP#####: línea + proveedor + correlativo. No se reutiliza.',
  ADD COLUMN ESTADO_FORECAST TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '1 = habilitado para compras y forecast',
  ADD COLUMN TIPO_CONTENEDOR TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '0 = normal, 1 = refrigerado',
  ADD UNIQUE INDEX UQ_PRODUCTO_CODIGO_NUEVO (CODIGO_NUEVO),
  ADD INDEX IDX_PRODUCTO_COD_LINEA (COD_LINEA),
  ADD INDEX IDX_PRODUCTO_COD_PROVEEDOR (COD_PROVEEDOR),
  ADD CONSTRAINT FK_PRODUCTO_LINEA FOREIGN KEY (COD_LINEA) REFERENCES LINEA (COD_LINEA)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT FK_PRODUCTO_PROVEEDOR FOREIGN KEY (COD_PROVEEDOR) REFERENCES PROVEEDOR (COD_PROVEEDOR)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
-- La columna de texto LABORATORIO se conserva por ahora: ONIX la usa. Se podrá
-- retirar cuando ONIX lea COD_PROVEEDOR.

UPDATE PRODUCTO p
JOIN LINEA l ON l.NOMBRE = TRIM(p.LINEA)
SET p.COD_LINEA = l.COD_LINEA;

-- ---------------------------------------------------------------------
-- 4. PRODUCTO_PROVEEDOR
-- ---------------------------------------------------------------------
CREATE TABLE PRODUCTO_PROVEEDOR (
  COD_PP             INT           NOT NULL AUTO_INCREMENT,
  COD_PRODUCTO       INT           NOT NULL,
  COD_PROVEEDOR      INT           NOT NULL,
  HABITUAL           TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = proveedor habitual del producto',
  HABITUAL_UNICO     INT           NULL COMMENT 'Lo llena el trigger: impide dos habituales por producto',
  CODIGO_PROVEEDOR   VARCHAR(50)   NULL COMMENT 'Código del producto en los documentos del proveedor',
  NOMBRE_PROVEEDOR   VARCHAR(300)  NULL COMMENT 'Nombre del producto en los documentos del proveedor',
  MIN_PEDIDO         DECIMAL(12,2) NULL COMMENT 'Cantidad mínima negociada',
  UNIDAD_COMPRA      VARCHAR(30)   NULL COMMENT 'Unidad en la que se pide (caja, unidad…)',
  UNIDADES_CAJA      DECIMAL(12,2) NULL,
  PACKING_REFERENCIA VARCHAR(100)  NULL,
  LEAD_TIME_DIAS     INT           NULL COMMENT 'Solo si difiere del lead time del proveedor',
  ENCARGADO          VARCHAR(100)  NOT NULL DEFAULT '',
  GRABADO            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ESTADO             VARCHAR(10)   NOT NULL DEFAULT 'activo',
  PRIMARY KEY (COD_PP),
  UNIQUE INDEX UQ_PP_PRODUCTO_PROVEEDOR (COD_PRODUCTO, COD_PROVEEDOR),
  UNIQUE INDEX UQ_PP_HABITUAL (HABITUAL_UNICO),
  INDEX IDX_PP_PROVEEDOR (COD_PROVEEDOR),
  CONSTRAINT FK_PP_PRODUCTO FOREIGN KEY (COD_PRODUCTO) REFERENCES PRODUCTO (COD_PRODUCTO)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT FK_PP_PROVEEDOR FOREIGN KEY (COD_PROVEEDOR) REFERENCES PROVEEDOR (COD_PROVEEDOR)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci;

DELIMITER ;;
CREATE TRIGGER PRODUCTO_PROVEEDOR_BI BEFORE INSERT ON PRODUCTO_PROVEEDOR FOR EACH ROW
BEGIN
  IF NEW.HABITUAL NOT IN (0, 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'HABITUAL debe ser 0 o 1';
  END IF;
  SET NEW.HABITUAL_UNICO = IF(NEW.HABITUAL = 1, NEW.COD_PRODUCTO, NULL);
END;;
CREATE TRIGGER PRODUCTO_PROVEEDOR_BU BEFORE UPDATE ON PRODUCTO_PROVEEDOR FOR EACH ROW
BEGIN
  IF NEW.HABITUAL NOT IN (0, 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'HABITUAL debe ser 0 o 1';
  END IF;
  SET NEW.HABITUAL_UNICO = IF(NEW.HABITUAL = 1, NEW.COD_PRODUCTO, NULL);
END;;
DELIMITER ;

-- La carga inicial (prefijos, lead times y cruce línea–laboratorio–proveedor)
-- usa datos comerciales y se entrega aparte, fuera de este repositorio.
