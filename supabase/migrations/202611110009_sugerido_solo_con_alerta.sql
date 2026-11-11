-- El pedido sugerido propone cantidad solo para productos en alerta (pedir ya / pedir pronto).
create or replace view public.v_planificacion with (security_invoker = true) as
with par as (select * from public.parametros_planificacion where id),
     ult as (select max(mes) ultimo from public.ventas_mensuales),
     ve as (select v.producto_id,
              sum(v.cantidad) filter (where v.mes > ult.ultimo - make_interval(months => 3)) / 3.0 as prom_3,
              sum(v.cantidad) filter (where v.mes > ult.ultimo - make_interval(months => par.meses_historia)) / par.meses_historia::numeric as prom_hist,
              sum(v.cantidad) filter (where v.mes = ult.ultimo) as ultimo_mes
            from public.ventas_mensuales v cross join ult cross join par group by v.producto_id, par.meses_historia),
     ex as (select producto_id,
              sum(cantidad) filter (where almacen = 'COCHABAMBA') stock_cbba,
              sum(cantidad) filter (where almacen = 'SANTA CRUZ') stock_scz,
              max(fecha_corte) fecha_corte
            from (select distinct on (producto_id, almacen) * from public.existencias
                  order by producto_id, almacen, fecha_corte desc) e group by producto_id),
     tr as (select producto_id, sum(pendiente_llegada_pedido) en_camino
            from public.v_forecast_proforma group by producto_id),
     calc as (
       select p.id as producto_id, p.codigo, p.nombre, p.presentacion, c.codigo_nuevo, c.linea,
         coalesce(c.proveedor, c.laboratorio) as proveedor, c.cantidad_minima, c.unidades_por_caja,
         coalesce(v.lead_time_dias, par.lead_time_defecto) as lead_time_dias,
         par.dias_seguridad, par.dias_cobertura, par.dias_aviso,
         coalesce(ex.stock_cbba, 0) stock_cbba, coalesce(ex.stock_scz, 0) stock_scz, ex.fecha_corte,
         coalesce(ex.stock_cbba, 0) + coalesce(ex.stock_scz, 0) as stock_total,
         coalesce(tr.en_camino, 0) en_camino,
         round(par.peso_reciente * coalesce(ve.prom_3, 0) + (1 - par.peso_reciente) * coalesce(ve.prom_hist, 0), 4) as pronostico_mensual,
         ve.ultimo_mes
       from public.productos p
       join public.productos_complemento c on c.id = p.id and c.estado_forecast
       cross join par
       left join public.proveedores v on v.nombre = c.proveedor
       left join ve on ve.producto_id = p.id
       left join ex on ex.producto_id = p.id
       left join tr on tr.producto_id = p.id
       where p.estado = 'ACTIVO'),
     dia as (select *, pronostico_mensual / 30.0 as venta_diaria from calc),
     sug as (select *,
       case when venta_diaria > 0 then round((stock_total + en_camino) / venta_diaria, 1) end as cobertura_dias,
       case when venta_diaria > 0 then round(stock_total / venta_diaria, 1) end as dias_stock,
       round(venta_diaria * (lead_time_dias + dias_seguridad), 4) as punto_pedido,
       greatest(venta_diaria * (lead_time_dias + dias_seguridad + dias_cobertura) - stock_total - en_camino, 0) as necesidad
       from dia)
select *,
  case when venta_diaria > 0 then current_date + floor(stock_total / venta_diaria)::integer end as fecha_quiebre,
  -- Solo se sugiere cantidad cuando hay que pedir (ya o pronto); los cubiertos quedan en 0.
  case when necesidad <= 0 or venta_diaria <= 0
         or stock_total + en_camino > punto_pedido + venta_diaria * dias_aviso then 0
       else ceil(greatest(necesidad, coalesce(cantidad_minima, 0)) / coalesce(nullif(unidades_por_caja, 0), 1))
            * coalesce(nullif(unidades_por_caja, 0), 1) end as cantidad_sugerida,
  case when venta_diaria <= 0 then 'SIN VENTAS'
       when stock_total + en_camino <= punto_pedido then 'PEDIR YA'
       when stock_total + en_camino <= punto_pedido + venta_diaria * dias_aviso then 'PEDIR PRONTO'
       else 'CUBIERTO' end as alerta
from sug;
