-- DATOS FICTICIOS. Ejecutar solo en pruebas, dentro de una transacción
-- con ROL authenticated y perfil de administración, y terminar con ROLLBACK.
insert into public.productos(id,codigo,nombre,presentacion) values
('00000000-0000-0000-0000-000000000101','DEMO-001','Producto ficticio','Caja');
insert into public.proformas(id,proveedor,numero,fecha_documento,moneda) values
('00000000-0000-0000-0000-000000000111','DEMO','PF-DEMO-1','2026-01-01','USD'),
('00000000-0000-0000-0000-000000000112','DEMO','PF-DEMO-2','2026-01-02','USD');
insert into public.detalles_proforma(id,proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,packing,precio_unitario) values
('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000101',1,100,'CAJA','10 cajas',9),
('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000112','00000000-0000-0000-0000-000000000101',1,50,'CAJA','10 cajas',9);
insert into public.facturas(id,proveedor,numero,fecha_emision,moneda,importe_documento) values
('00000000-0000-0000-0000-000000000201','DEMO','FAC-DEMO-1','2026-01-03','USD',1300);
insert into public.detalles_factura(id,factura_id,producto_id,numero_linea,referencia_proforma_documento,cantidad,unidad,packing,precio_unitario) values
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101',1,'PF-DEMO-1',100,'CAJA','12 cajas',10),
('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101',2,'PF-DEMO-2',20,'CAJA','12 cajas',10),
('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101',3,'DESCONOCIDA',10,'CAJA','12 cajas',10);
insert into public.asignaciones(id,detalle_proforma_id,detalle_factura_id,cantidad) values
('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000401',80),
('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000401',20),
('00000000-0000-0000-0000-000000000503','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000402',20);
insert into public.embarques(id,factura_id,numero_bl,cochabamba_estimada) values
('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000201','BL-DEMO','2026-02-10');
insert into public.pagos(factura_id,fecha,importe,referencia) values
('00000000-0000-0000-0000-000000000201','2026-01-04',390,'Anticipo ficticio');
insert into public.recepciones(id,embarque_id,fecha_real,almacen,documento) values
('00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000601','2026-02-12','Almacén ficticio','REC-DEMO');
insert into public.detalles_recepcion(id,recepcion_id,detalle_factura_id,cantidad_recibida) values
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000401',40),
('00000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000402',20);
insert into public.aplicaciones_recepcion(id,detalle_recepcion_id,asignacion_id,cantidad) values
('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000501',40),
('00000000-0000-0000-0000-000000000802','00000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000503',20);
