-- Prueba reversible sobre un proyecto sin datos operativos.
-- Ejecutar como propietario en SQL Editor. No crea usuarios ni guarda datos ficticios.
begin;
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

set constraints all immediate;
do $$
declare r record;
begin
  select * into strict r from public.v_forecast_producto where codigo = 'DEMO-001';
  if r.pedido_vigente <> 150 or r.facturado <> 130 or r.recibido <> 60
    or r.pendiente_facturar <> 30 or r.pendiente_recepcion <> 70 or r.sin_asignar <> 10 then
    raise exception 'No coinciden los totales del forecast';
  end if;
  select * into strict r from public.v_control_pagos where numero = 'FAC-DEMO-1';
  if r.anticipo_requerido <> 390 or r.saldo <> 910 or r.estado_financiero <> 'PLAZO POR CONFIRMAR' then
    raise exception 'No coincide el control del anticipo y saldo';
  end if;
  if exists(select 1 from pg_tables where schemaname in ('public','control_privado') and not rowsecurity) then
    raise exception 'Una tabla no tiene RLS';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='v' and c.relname like 'v_%'
    and not coalesce(c.reloptions @> array['security_invoker=true'],false)) then
    raise exception 'Una vista no respeta los permisos del usuario';
  end if;
  if not exists(select 1 from storage.buckets where id='documentos-control' and not public) then
    raise exception 'El bucket privado no existe';
  end if;
end;
$$;
-- Sin perfil activo, una sesión autenticada tampoco ve los datos de prueba.
set local role authenticated;
do $$
begin
  if exists(select 1 from public.v_forecast_producto) then
    raise exception 'Un usuario sin perfil accede al forecast';
  end if;
end;
$$;
reset role;
rollback;
select 'APROBADO: forecast, pagos, RLS, vistas y bucket; prueba revertida' as resultado,
  (select count(*) from public.productos) as productos_guardados,
  (select count(*) from public.facturas) as facturas_guardadas,
  (select count(*) from public.historial) as historial_guardado;

