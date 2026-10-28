begin;

create view public.v_asignaciones with (security_invoker = true) as
select a.id, a.detalle_proforma_id, a.detalle_factura_id, p.proforma_id, f.factura_id,
  p.producto_id, p.unidad, a.cantidad as facturado,
  coalesce(r.recibido, 0) as recibido,
  a.cantidad - coalesce(r.recibido, 0) as pendiente_recepcion,
  p.precio_unitario as precio_proforma, f.precio_unitario as precio_factura,
  pr.moneda as moneda_proforma, fa.moneda as moneda_factura,
  (pr.moneda <> fa.moneda or p.precio_unitario <> f.precio_unitario) as diferencia_precio,
  (p.packing is distinct from f.packing) as diferencia_packing
from public.asignaciones a
join public.detalles_proforma p on p.id = a.detalle_proforma_id
join public.detalles_factura f on f.id = a.detalle_factura_id
join public.proformas pr on pr.id = p.proforma_id
join public.facturas fa on fa.id = f.factura_id
left join (select asignacion_id, sum(cantidad) as recibido
  from public.aplicaciones_recepcion group by asignacion_id) r on r.asignacion_id = a.id;

create view public.v_forecast_proforma with (security_invoker = true) as
select d.id as detalle_proforma_id, d.proforma_id, p.numero as proforma,
  d.producto_id, x.codigo, x.nombre, d.unidad, d.packing, p.fecha_documento,
  d.cantidad_pedida, d.cantidad_cancelada,
  d.cantidad_pedida - d.cantidad_cancelada as pedido_vigente,
  coalesce(a.facturado, 0) as facturado, coalesce(a.recibido, 0) as recibido,
  greatest(d.cantidad_pedida - d.cantidad_cancelada - coalesce(a.facturado, 0), 0) as pendiente_facturar,
  greatest(coalesce(a.facturado, 0) - d.cantidad_pedida + d.cantidad_cancelada, 0) as exceso_facturado,
  coalesce(a.facturado, 0) - coalesce(a.recibido, 0) as facturado_pendiente_recepcion,
  greatest(d.cantidad_pedida - d.cantidad_cancelada - coalesce(a.recibido, 0), 0) as pendiente_llegada_pedido
from public.detalles_proforma d
join public.proformas p on p.id = d.proforma_id
join public.productos x on x.id = d.producto_id
left join (select detalle_proforma_id, sum(facturado) facturado, sum(recibido) recibido
  from public.v_asignaciones group by detalle_proforma_id) a on a.detalle_proforma_id = d.id;

create view public.v_forecast_factura with (security_invoker = true) as
select d.id as detalle_factura_id, d.factura_id, f.numero as factura, f.fecha_emision,
  d.producto_id, p.codigo, p.nombre, d.unidad, d.packing, d.referencia_proforma_documento,
  d.cantidad as facturado, coalesce(a.asignado, 0) as asignado,
  d.cantidad - coalesce(a.asignado, 0) as sin_asignar,
  coalesce(r.recibido, 0) as recibido,
  greatest(d.cantidad - coalesce(r.recibido, 0), 0) as pendiente_recepcion,
  greatest(coalesce(r.recibido, 0) - d.cantidad, 0) as exceso_recibido,
  coalesce(r.recibido, 0) - coalesce(ap.aplicado, 0) as recibido_sin_aplicar,
  e.numero_bl, e.fecha_bl, e.salida_estimada, e.salida_real,
  e.arica_estimada, e.arica_real, e.cochabamba_estimada, e.cochabamba_real,
  case when coalesce(r.recibido, 0) >= d.cantidad then 'RECIBIDO'
    when coalesce(r.recibido, 0) > 0 then 'RECEPCION PARCIAL'
    when e.cochabamba_real is not null then 'EN COCHABAMBA, RECEPCION PENDIENTE'
    when e.arica_real is not null then 'EN ARICA'
    when e.salida_real is not null then 'EN TRANSITO'
    else 'SALIDA POR CONFIRMAR' end as estado_logistico
from public.detalles_factura d
join public.facturas f on f.id = d.factura_id
join public.productos p on p.id = d.producto_id
left join public.embarques e on e.factura_id = f.id
left join (select detalle_factura_id, sum(cantidad) asignado
  from public.asignaciones group by detalle_factura_id) a on a.detalle_factura_id = d.id
left join (select detalle_factura_id, sum(cantidad_recibida) recibido
  from public.detalles_recepcion group by detalle_factura_id) r on r.detalle_factura_id = d.id
left join (select r.detalle_factura_id, sum(a.cantidad) aplicado
  from public.aplicaciones_recepcion a join public.detalles_recepcion r on r.id = a.detalle_recepcion_id
  group by r.detalle_factura_id) ap on ap.detalle_factura_id = d.id;

-- Las cantidades se agrupan por producto Y unidad. Nunca mezclar cajas y unidades.
create view public.v_forecast_producto with (security_invoker = true) as
with pedidos as (
  select producto_id, unidad, sum(pedido_vigente) pedido_vigente, sum(facturado) asignado,
    sum(recibido) recibido_aplicado, sum(pendiente_facturar) pendiente_facturar,
    sum(exceso_facturado) exceso_facturado, sum(facturado_pendiente_recepcion) asignado_pendiente_recepcion,
    sum(pendiente_llegada_pedido) pendiente_llegada_pedido
  from public.v_forecast_proforma group by producto_id, unidad
), facturas as (
  select producto_id, unidad, sum(facturado) facturado, sum(recibido) recibido,
    sum(sin_asignar) sin_asignar, sum(pendiente_recepcion) pendiente_recepcion,
    sum(exceso_recibido) exceso_recibido, sum(recibido_sin_aplicar) recibido_sin_aplicar
  from public.v_forecast_factura group by producto_id, unidad
), unidades as (
  select producto_id, unidad from pedidos union select producto_id, unidad from facturas
)
select p.id as producto_id, p.codigo, p.nombre, p.estado, p.presentacion, u.unidad,
  coalesce(o.pedido_vigente, 0) pedido_vigente,
  coalesce(o.asignado, 0) asignado_proformas,
  coalesce(f.facturado, 0) facturado,
  coalesce(f.recibido, 0) recibido,
  coalesce(o.recibido_aplicado, 0) recibido_aplicado_proformas,
  coalesce(o.pendiente_facturar, 0) pendiente_facturar,
  coalesce(o.exceso_facturado, 0) exceso_facturado,
  coalesce(o.asignado_pendiente_recepcion, 0) asignado_pendiente_recepcion,
  coalesce(o.pendiente_llegada_pedido, 0) pendiente_llegada_pedido,
  coalesce(f.sin_asignar, 0) sin_asignar,
  coalesce(f.pendiente_recepcion, 0) pendiente_recepcion,
  coalesce(f.exceso_recibido, 0) exceso_recibido,
  coalesce(f.recibido_sin_aplicar, 0) recibido_sin_aplicar
from public.productos p
left join unidades u on u.producto_id = p.id
left join pedidos o on o.producto_id = p.id and o.unidad = u.unidad
left join facturas f on f.producto_id = p.id and f.unidad = u.unidad;

create view public.v_control_pagos with (security_invoker = true) as
select f.id as factura_id, f.numero, f.proveedor, f.moneda, f.importe_documento,
  round(f.importe_documento * 0.30, 2) as anticipo_requerido,
  coalesce(p.pagado, 0) pagado,
  f.importe_documento - coalesce(p.pagado, 0) as saldo,
  greatest(round(f.importe_documento * 0.30, 2) - coalesce(p.pagado, 0), 0) as anticipo_pendiente,
  f.vencimiento_saldo,
  case when coalesce(p.pagado, 0) > f.importe_documento then 'PAGO EN EXCESO'
    when coalesce(p.pagado, 0) = f.importe_documento then 'PAGADO'
    when f.vencimiento_saldo is null then 'PLAZO POR CONFIRMAR'
    when f.vencimiento_saldo < current_date then 'VENCIDO'
    else 'PENDIENTE' end as estado_financiero,
  coalesce(l.importe_lineas, 0) importe_lineas,
  f.importe_documento - coalesce(l.importe_lineas, 0) diferencia_importe_documento
from public.facturas f
left join (select factura_id, sum(importe) pagado from public.pagos group by factura_id) p on p.factura_id = f.id
left join (select factura_id, sum(cantidad * precio_unitario) importe_lineas
  from public.detalles_factura group by factura_id) l on l.factura_id = f.id;

revoke all on public.v_asignaciones, public.v_forecast_proforma, public.v_forecast_factura,
  public.v_forecast_producto, public.v_control_pagos from public, anon, authenticated;
grant select on public.v_asignaciones, public.v_forecast_proforma, public.v_forecast_factura,
  public.v_forecast_producto, public.v_control_pagos to authenticated;
commit;
