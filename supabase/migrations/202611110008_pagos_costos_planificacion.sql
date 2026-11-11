-- Fases 2 a 4: proveedor completo, estados de proforma, puerto, giros por proforma,
-- gastos de nacionalización con hoja de costos y planificación de compras.
-- Mismo patrón de seguridad que el resto: RLS, historial y controles al confirmar.
begin;

-- ───────────────────────── Proveedores y catálogo ─────────────────────────
alter table public.proveedores
  add column prefijo text check (prefijo is null or prefijo ~ '^[A-Z0-9]{1,3}$'),
  add column lead_time_dias integer check (lead_time_dias is null or lead_time_dias between 1 and 720),
  add column incoterm text check (incoterm is null or incoterm in ('EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DDP')),
  add column anticipo_por numeric(5,2) not null default 30 check (anticipo_por between 0 and 100),
  add column plazo_saldo_dias integer check (plazo_saldo_dias is null or plazo_saldo_dias between 0 and 720),
  add column condicion_pago text;

alter table public.productos_complemento
  add column codigo_nuevo text unique check (codigo_nuevo is null or codigo_nuevo ~ '^[A-Z0-9]{1,8}$'),
  add column linea text,
  add column laboratorio text,
  add column estado_forecast boolean not null default true,
  add column vida_util_meses integer check (vida_util_meses is null or vida_util_meses > 0);

-- ───────────────────────── Proformas: ciclo de vida ─────────────────────────
alter table public.proformas
  add column estado text not null default 'confirmada'
    check (estado in ('sugerida','enviada','confirmada','cerrada')),
  add column numero_proveedor text,
  add column incoterm text check (incoterm is null or incoterm in ('EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DDP')),
  add column lugar_entrega text,
  add column puerto_carga text,
  add column via text check (via is null or via in ('MARITIMA','AEREA','TERRESTRE')),
  add column condicion_pago text,
  add column anticipo_por numeric(5,2) check (anticipo_por is null or anticipo_por between 0 and 100),
  add column dias_produccion integer check (dias_produccion is null or dias_produccion between 0 and 720);
alter table public.detalles_proforma
  add column cantidad_sugerida public.cantidad_control,
  add column pronostico_mensual public.cantidad_control,
  add column descripcion_proveedor text;

-- El puerto de llegada puede ser Arica o Iquique. Las columnas arica_* guardan
-- las fechas del puerto que corresponda (se conservan para no romper datos).
alter table public.embarques
  add column puerto text not null default 'ARICA' check (puerto in ('ARICA','IQUIQUE','OTRO')),
  add column naviera text,
  add column aduana_real date;

-- ───────────────────────── Pagos: giros ─────────────────────────
-- Anticipo: se gira contra una proforma y luego se aplica, en partes, a sus facturas.
-- Cancelación: se gira contra una factura. El tipo de cambio es el del banco.
create table public.giros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('anticipo','cancelacion')),
  proveedor public.texto_requerido not null references public.proveedores(nombre) on update cascade,
  proforma_id uuid references public.proformas(id) on delete restrict,
  factura_id uuid references public.facturas(id) on delete restrict,
  fecha date not null,
  banco text,
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  importe public.importe_control not null check (importe > 0),
  tipo_cambio numeric(18,6) check (tipo_cambio is null or tipo_cambio > 0),
  referencia text,
  observaciones text,
  check ((tipo = 'anticipo' and proforma_id is not null and factura_id is null)
      or (tipo = 'cancelacion' and factura_id is not null and proforma_id is null))
);
create table public.giros_factura (
  id uuid primary key default gen_random_uuid(),
  giro_id uuid not null references public.giros(id) on delete restrict,
  factura_id uuid not null references public.facturas(id) on delete restrict,
  importe public.importe_control not null check (importe > 0),
  observaciones text,
  unique (giro_id, factura_id)
);

-- ───────────────────────── Costos de nacionalización ─────────────────────────
create table public.tipos_documento_gasto (
  codigo text primary key check (codigo ~ '^[A-Z_]+$'),
  nombre public.texto_requerido not null,
  por_costo numeric(5,2) not null check (por_costo between 0 and 100)
);
create table public.grupos_gasto (
  codigo text primary key check (codigo ~ '^[A-Z_]+$'),
  nombre public.texto_requerido not null,
  orden integer not null default 0,
  -- true: forma parte del valor de la factura en Bs (p. ej. diferencia de cambio), no es gasto de nacionalización
  es_valor_factura boolean not null default false
);
create table public.conceptos_gasto (
  id uuid primary key default gen_random_uuid(),
  grupo text not null references public.grupos_gasto(codigo) on update cascade,
  nombre public.texto_requerido not null unique,
  -- Si tiene valor, manda sobre el documento (IVA de la DIM e ITF: 0 %)
  por_costo_fijo numeric(5,2) check (por_costo_fijo is null or por_costo_fijo between 0 and 100),
  activo boolean not null default true
);
create table public.costeos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null unique references public.facturas(id) on delete restrict,
  condicion_entrega text,
  compra_onix text,
  dim text,
  fecha_dim date,
  tc_dim numeric(18,6) check (tc_dim is null or tc_dim > 0),
  -- Si la factura no está pagada del todo: tipo de cambio para valorar el saldo en Bs
  tipo_cambio_manual numeric(18,6) check (tipo_cambio_manual is null or tipo_cambio_manual > 0),
  estado text not null default 'borrador' check (estado in ('borrador','cerrado')),
  cerrado_en timestamptz,
  observaciones text,
  check ((estado = 'cerrado') = (cerrado_en is not null))
);
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas(id) on delete restrict,
  concepto_id uuid not null references public.conceptos_gasto(id) on delete restrict,
  tipo_documento text not null references public.tipos_documento_gasto(codigo) on update cascade,
  emisor text,
  intermediario text,
  numero_documento text,
  fecha date,
  descripcion text,
  moneda text not null default 'BOB' check (moneda ~ '^[A-Z]{3}$'),
  importe public.importe_control,
  tipo_cambio numeric(18,6) check (tipo_cambio is null or tipo_cambio > 0),
  importe_bs public.importe_control not null,
  por_costo_sugerido numeric(5,2) not null default 100,
  por_costo numeric(5,2) not null check (por_costo between 0 and 100),
  importe_costo_bs numeric(18,4) generated always as (round(importe_bs * por_costo / 100, 4)) stored,
  fecha_pago date,
  banco text,
  comprobante text,
  observaciones text
);
create table public.costeo_lotes (
  id uuid primary key default gen_random_uuid(),
  costeo_id uuid not null references public.costeos(id) on delete restrict,
  detalle_factura_id uuid not null references public.detalles_factura(id) on delete restrict,
  lote public.texto_requerido not null,
  vencimiento date,
  cantidad public.cantidad_control not null check (cantidad > 0),
  unique (costeo_id, detalle_factura_id, lote)
);

-- ───────────────────────── Planificación ─────────────────────────
create table public.parametros_planificacion (
  id boolean primary key default true check (id),
  meses_historia integer not null default 12 check (meses_historia between 3 and 36),
  peso_reciente numeric(4,2) not null default 0.6 check (peso_reciente between 0 and 1),
  dias_seguridad integer not null default 30 check (dias_seguridad between 0 and 365),
  dias_cobertura integer not null default 90 check (dias_cobertura between 0 and 720),
  lead_time_defecto integer not null default 120 check (lead_time_defecto between 1 and 720),
  dias_aviso integer not null default 30 check (dias_aviso between 0 and 365)
);
create table public.existencias (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete restrict,
  almacen text not null check (almacen in ('COCHABAMBA','SANTA CRUZ')),
  fecha_corte date not null,
  cantidad numeric(18,4) not null,
  unique (producto_id, almacen, fecha_corte)
);
create table public.ventas_mensuales (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete restrict,
  sucursal text not null check (sucursal in ('COCHABAMBA','SANTA CRUZ')),
  mes date not null check (extract(day from mes) = 1),
  cantidad numeric(18,4) not null check (cantidad >= 0),
  unique (producto_id, sucursal, mes)
);

-- Catálogos de la hoja de costos (configuración, no datos comerciales)
insert into public.tipos_documento_gasto(codigo, nombre, por_costo) values
  ('FACTURA','Factura',87), ('RECIBO','Recibo',100), ('RECIBO_RETENCION','Recibo con retención',100),
  ('NOTA_DEBITO','Nota de débito',100), ('DIM','DIM',100), ('FORMULARIO','Formulario',100),
  ('FACTURA_EXTERIOR','Factura del exterior',100), ('EXTRACTO','Extracto o comprobante bancario',100);
insert into public.grupos_gasto(codigo, nombre, orden, es_valor_factura) values
  ('VALOR','Valor de la factura (diferencia de cambio)',0,true),
  ('REMESA','Gastos bancarios remesa exterior',1,false),
  ('SEGURO','Seguro',2,false),
  ('AGEMED','Trámites AGEMED',3,false),
  ('DESTINO','Flete, gastos en destino y logística',4,false),
  ('TRIBUTOS','Tributos aduaneros de nacionalización',5,false),
  ('ALMACENAJE','Almacenaje y gastos en despacho',6,false),
  ('AGENCIA','Agencia despachante',7,false),
  ('TRANSPORTE','Transporte aduana – oficina',8,false);
insert into public.conceptos_gasto(grupo, nombre, por_costo_fijo) values
  ('VALOR','Diferencia de cambio',null),
  ('REMESA','Comisión bancaria',null), ('REMESA','ITF',0),
  ('SEGURO','Seguro de transporte',null),
  ('AGEMED','Permiso de desaduanización',null), ('AGEMED','Honorario trámite AGEMED',null),
  ('DESTINO','Flete marítimo',null), ('DESTINO','Flete terrestre',null), ('DESTINO','Despacho portuario',null),
  ('DESTINO','DTHC',null), ('DESTINO','Doc fee',null), ('DESTINO','Container protect',null),
  ('DESTINO','Cargo manifest',null), ('DESTINO','Handling',null), ('DESTINO','HBL',null),
  ('TRIBUTOS','GAC',null), ('TRIBUTOS','IVA importación',0), ('TRIBUTOS','Uso de sistema',null),
  ('ALMACENAJE','Almacenaje',null), ('ALMACENAJE','Recojo guía aérea',null), ('ALMACENAJE','Examen previo',null),
  ('ALMACENAJE','Multa',null),
  ('AGENCIA','Comisión agencia',null), ('AGENCIA','DAM',null), ('AGENCIA','DAV',null),
  ('AGENCIA','Gastos menores en trámites',null), ('AGENCIA','Otros gastos en despacho',null),
  ('TRANSPORTE','Traslado aduana – oficina',null);

insert into public.parametros_planificacion default values;

-- ───────────────────────── Seguridad e historial (mismo patrón) ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['giros','giros_factura','tipos_documento_gasto','grupos_gasto','conceptos_gasto',
    'costeos','gastos','costeo_lotes','parametros_planificacion','existencias','ventas_mensuales'] loop
    execute format('alter table public.%I add column creado_en timestamptz not null default now(),
      add column creado_por uuid, add column actualizado_en timestamptz not null default now(),
      add column actualizado_por uuid', t);
    execute format('create trigger bloquear_borrado before delete on public.%I
      for each row execute function control_privado.bloquear_borrado()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy consultar on public.%I for select to authenticated
      using ((select control_privado.tiene_acceso(false)))', t);
    execute format('create policy registrar on public.%I for insert to authenticated
      with check ((select control_privado.tiene_acceso(true)))', t);
    execute format('create policy modificar on public.%I for update to authenticated
      using ((select control_privado.tiene_acceso(true))) with check ((select control_privado.tiene_acceso(true)))', t);
    execute format('create policy eliminar on public.%I for delete to authenticated
      using ((select control_privado.tiene_acceso(true)))', t);
  end loop;
end;
$$;

-- preparar_cambio y auditar usan new.id (uuid). Las tablas con clave de texto o booleana
-- llevan su propia versión para no confundir la auditoría.
create function control_privado.preparar_cambio_simple() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update control_privado.exclusion set version = version + 1 where id;
  if tg_op = 'UPDATE' then
    new.creado_en := old.creado_en; new.creado_por := old.creado_por;
  else
    new.creado_en := now(); new.creado_por := auth.uid();
  end if;
  new.actualizado_en := now(); new.actualizado_por := auth.uid();
  return new;
end;
$$;
create function control_privado.auditar_simple() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historial(tabla, registro_id, operacion, usuario_id, anterior, nuevo)
  values (tg_table_name, '00000000-0000-0000-0000-000000000000', tg_op, auth.uid(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end;
$$;

-- Sugiere el % al costo: concepto fijo (IVA, ITF) > tipo de documento (factura 87 %).
-- Si quien registra no indica %, se usa el sugerido; si lo indica, se respeta (corregible).
create function control_privado.preparar_gasto() returns trigger
language plpgsql security definer set search_path = '' as $$
declare fijo numeric; doc numeric;
begin
  select por_costo_fijo into fijo from public.conceptos_gasto where id = new.concepto_id;
  select por_costo into doc from public.tipos_documento_gasto where codigo = new.tipo_documento;
  new.por_costo_sugerido := coalesce(fijo, doc, 100);
  if tg_op = 'INSERT' and new.por_costo is null then new.por_costo := new.por_costo_sugerido; end if;
  if tg_op = 'UPDATE' and new.por_costo is null then new.por_costo := new.por_costo_sugerido; end if;
  if new.importe_bs is null and new.importe is not null then
    new.importe_bs := round(new.importe * coalesce(new.tipo_cambio, case when new.moneda = 'BOB' then 1 end), 4);
  end if;
  return new;
end;
$$;
create trigger a_preparar_gasto before insert or update on public.gastos
  for each row execute function control_privado.preparar_gasto();

-- Una hoja de costos cerrada no admite cambios en sus gastos ni lotes (se reabre primero).
create function control_privado.bloquear_costeo_cerrado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare fac uuid[];
begin
  if tg_table_name = 'gastos' then
    if tg_op = 'DELETE' then fac := array[old.factura_id];
    elsif tg_op = 'UPDATE' then fac := array[new.factura_id, old.factura_id];
    else fac := array[new.factura_id]; end if;
  else
    if tg_op = 'DELETE' then select array_agg(factura_id) into fac from public.costeos where id = old.costeo_id;
    elsif tg_op = 'UPDATE' then select array_agg(factura_id) into fac from public.costeos where id in (new.costeo_id, old.costeo_id);
    else select array_agg(factura_id) into fac from public.costeos where id = new.costeo_id; end if;
  end if;
  if exists (select 1 from public.costeos where factura_id = any(fac) and estado = 'cerrado') then
    raise exception 'La hoja de costos de esta factura está cerrada. Reábrela para corregir.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger b_bloquear_cerrado before insert or update or delete on public.gastos
  for each row execute function control_privado.bloquear_costeo_cerrado();
create trigger b_bloquear_cerrado before insert or update or delete on public.costeo_lotes
  for each row execute function control_privado.bloquear_costeo_cerrado();

do $$
declare t text;
begin
  foreach t in array array['giros','giros_factura','conceptos_gasto','costeos','gastos','costeo_lotes',
    'existencias','ventas_mensuales'] loop
    execute format('create trigger preparar_cambio before insert or update on public.%I
      for each row execute function control_privado.preparar_cambio()', t);
    execute format('create trigger auditar after insert or update or delete on public.%I
      for each row execute function control_privado.auditar()', t);
  end loop;
  foreach t in array array['tipos_documento_gasto','grupos_gasto','parametros_planificacion'] loop
    execute format('create trigger preparar_cambio before insert or update on public.%I
      for each row execute function control_privado.preparar_cambio_simple()', t);
    execute format('create trigger auditar after insert or update or delete on public.%I
      for each row execute function control_privado.auditar_simple()', t);
  end loop;
end;
$$;

-- Controles de pagos y costos, al confirmar la transacción
create function control_privado.validar_pagos_costos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.giros g join public.proformas p on p.id = g.proforma_id
             where p.proveedor <> g.proveedor) then
    raise exception 'El anticipo debe girarse al proveedor de la proforma'; end if;
  if exists (select 1 from public.giros g join public.facturas f on f.id = g.factura_id
             where f.proveedor <> g.proveedor or f.moneda <> g.moneda) then
    raise exception 'La cancelación debe tener el proveedor y la moneda de la factura'; end if;
  if exists (select 1 from public.giros_factura a join public.giros g on g.id = a.giro_id
             join public.facturas f on f.id = a.factura_id
             where g.tipo <> 'anticipo' or f.proveedor <> g.proveedor or f.moneda <> g.moneda) then
    raise exception 'Solo se aplican anticipos del mismo proveedor y moneda de la factura'; end if;
  if exists (select 1 from public.giros g join public.giros_factura a on a.giro_id = g.id
             group by g.id having sum(a.importe) > g.importe) then
    raise exception 'Lo aplicado supera el importe del anticipo'; end if;
  if exists (select 1 from public.costeo_lotes l join public.costeos c on c.id = l.costeo_id
             join public.detalles_factura d on d.id = l.detalle_factura_id where d.factura_id <> c.factura_id) then
    raise exception 'El lote corresponde a otra factura'; end if;
  if exists (select 1 from public.costeo_lotes l join public.detalles_factura d on d.id = l.detalle_factura_id
             group by d.id having sum(l.cantidad) > d.cantidad) then
    raise exception 'Los lotes superan la cantidad facturada'; end if;
  return null;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['giros','giros_factura','costeos','costeo_lotes','proformas','facturas','detalles_factura'] loop
    execute format('create constraint trigger validar_pagos_costos after insert or update or delete on public.%I
      deferrable initially deferred for each row execute function control_privado.validar_pagos_costos()', t);
  end loop;
end;
$$;
revoke all on all functions in schema control_privado from public, anon, authenticated;
grant execute on function control_privado.tiene_acceso(boolean) to authenticated;

-- ───────────────────────── Vistas ─────────────────────────
-- Las proformas sugeridas todavía no son pedido: no cuentan en el forecast ni en tránsito.
create or replace view public.v_forecast_proforma with (security_invoker = true) as
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
  from public.v_asignaciones group by detalle_proforma_id) a on a.detalle_proforma_id = d.id
where p.estado <> 'sugerida';

create or replace view public.v_forecast_factura with (security_invoker = true) as
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
    when e.aduana_real is not null then 'EN ADUANA'
    when e.arica_real is not null then 'EN PUERTO'
    when e.salida_real is not null then 'EN TRANSITO'
    else 'SALIDA POR CONFIRMAR' end as estado_logistico,
  e.puerto
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

-- Pagos por factura: anticipos aplicados + cancelaciones (+ registros antiguos de «pagos»)
create or replace view public.v_control_pagos with (security_invoker = true) as
with ap as (select a.factura_id, sum(a.importe) importe, sum(a.importe * g.tipo_cambio) bs,
              bool_and(g.tipo_cambio is not null) con_tc
            from public.giros_factura a join public.giros g on g.id = a.giro_id group by a.factura_id),
     ca as (select factura_id, sum(importe) importe, sum(importe * tipo_cambio) bs,
              bool_and(tipo_cambio is not null) con_tc
            from public.giros where tipo = 'cancelacion' group by factura_id),
     pa as (select factura_id, sum(importe) pagado from public.pagos group by factura_id),
     li as (select factura_id, sum(cantidad * precio_unitario) importe_lineas
            from public.detalles_factura group by factura_id)
select f.id as factura_id, f.numero, f.proveedor, f.moneda, f.importe_documento,
  round(coalesce(f.importe_documento, li.importe_lineas) * 0.30, 2) as anticipo_requerido,
  coalesce(pa.pagado, 0) + coalesce(ap.importe, 0) + coalesce(ca.importe, 0) as pagado,
  coalesce(f.importe_documento, li.importe_lineas) - coalesce(pa.pagado, 0) - coalesce(ap.importe, 0) - coalesce(ca.importe, 0) as saldo,
  greatest(round(coalesce(f.importe_documento, li.importe_lineas) * 0.30, 2) - coalesce(pa.pagado, 0) - coalesce(ap.importe, 0), 0) as anticipo_pendiente,
  f.vencimiento_saldo,
  case when coalesce(f.importe_documento, li.importe_lineas) is null then 'IMPORTE POR CONFIRMAR'
    when coalesce(pa.pagado, 0) + coalesce(ap.importe, 0) + coalesce(ca.importe, 0) > coalesce(f.importe_documento, li.importe_lineas) then 'PAGO EN EXCESO'
    when coalesce(pa.pagado, 0) + coalesce(ap.importe, 0) + coalesce(ca.importe, 0) = coalesce(f.importe_documento, li.importe_lineas) then 'PAGADO'
    when f.vencimiento_saldo is null then 'PLAZO POR CONFIRMAR'
    when f.vencimiento_saldo < current_date then 'VENCIDO'
    else 'PENDIENTE' end as estado_financiero,
  coalesce(li.importe_lineas, 0) importe_lineas,
  f.importe_documento - coalesce(li.importe_lineas, 0) diferencia_importe_documento,
  coalesce(ap.importe, 0) as anticipos_aplicados,
  coalesce(ca.importe, 0) as cancelado,
  case when coalesce(ap.con_tc, true) and coalesce(ca.con_tc, true)
       then coalesce(ap.bs, 0) + coalesce(ca.bs, 0) end as pagado_bs
from public.facturas f
left join ap on ap.factura_id = f.id
left join ca on ca.factura_id = f.id
left join pa on pa.factura_id = f.id
left join li on li.factura_id = f.id;

-- Anticipos por proforma: cuánto se esperaba, cuánto se giró y cuánto queda por aplicar
create view public.v_giros_proforma with (security_invoker = true) as
select p.id as proforma_id, p.numero, p.proveedor, p.moneda, p.estado,
  coalesce(p.anticipo_por, v.anticipo_por, 30) as anticipo_por,
  l.importe_proforma,
  round(l.importe_proforma * coalesce(p.anticipo_por, v.anticipo_por, 30) / 100, 2) as anticipo_esperado,
  coalesce(g.girado, 0) as girado, coalesce(g.aplicado, 0) as aplicado,
  coalesce(g.girado, 0) - coalesce(g.aplicado, 0) as disponible
from public.proformas p
left join public.proveedores v on v.nombre = p.proveedor
left join (select proforma_id, sum((cantidad_pedida - cantidad_cancelada) * precio_unitario) importe_proforma
           from public.detalles_proforma group by proforma_id) l on l.proforma_id = p.id
left join (select g.proforma_id, sum(g.importe) girado, sum(coalesce(a.aplicado, 0)) aplicado
           from public.giros g left join (select giro_id, sum(importe) aplicado from public.giros_factura group by giro_id) a
             on a.giro_id = g.id
           where g.tipo = 'anticipo' group by g.proforma_id) g on g.proforma_id = p.id;

-- Hoja de costos: valor CIF en Bs = lo pagado en Bs (anticipos aplicados + cancelación)
-- + diferencias de cambio. Paramétrica = (CIF Bs + gastos al costo) / CIF Bs.
create view public.v_costeo with (security_invoker = true) as
with li as (select factura_id, sum(cantidad * precio_unitario) total_moneda,
              bool_and(precio_unitario is not null) precios_completos
            from public.detalles_factura group by factura_id),
     ga as (select g.factura_id,
              sum(g.importe_bs) filter (where gr.es_valor_factura) dif_cambio_bs,
              sum(g.importe_bs) filter (where not gr.es_valor_factura) gastos_bs,
              sum(g.importe_costo_bs) filter (where not gr.es_valor_factura) gastos_costo_bs,
              count(*) gastos
            from public.gastos g join public.conceptos_gasto c on c.id = g.concepto_id
            join public.grupos_gasto gr on gr.codigo = c.grupo group by g.factura_id),
     base as (
       select f.id as factura_id, f.numero, f.proveedor, f.moneda, f.fecha_emision,
         c.id as costeo_id, c.estado, c.condicion_entrega, c.compra_onix, c.dim, c.fecha_dim, c.tc_dim,
         c.tipo_cambio_manual, li.total_moneda, coalesce(li.precios_completos, false) precios_completos,
         p.pagado, p.pagado_bs, coalesce(ga.dif_cambio_bs, 0) dif_cambio_bs,
         coalesce(ga.gastos_bs, 0) gastos_bs, coalesce(ga.gastos_costo_bs, 0) gastos_costo_bs,
         coalesce(ga.gastos, 0) gastos,
         -- Pagada (99 % o más): lo pagado en Bs. Si falta pagar y hay TC manual: lo pagado + el resto al TC manual.
         case when c.tipo_cambio_manual is not null
                then round(coalesce(p.pagado_bs, 0) + greatest(li.total_moneda - coalesce(p.pagado, 0), 0) * c.tipo_cambio_manual, 4)
                     + coalesce(ga.dif_cambio_bs, 0)
              when p.pagado_bs is not null and p.pagado > 0 and p.pagado >= li.total_moneda * 0.99
                then p.pagado_bs + coalesce(ga.dif_cambio_bs, 0) end as cif_bs
       from public.facturas f
       left join public.costeos c on c.factura_id = f.id
       left join li on li.factura_id = f.id
       left join public.v_control_pagos p on p.factura_id = f.id
       left join ga on ga.factura_id = f.id)
select *,
  case when total_moneda > 0 and cif_bs > 0 then cif_bs / total_moneda end as tc_efectivo,
  case when cif_bs > 0 then (cif_bs + gastos_costo_bs) / cif_bs end as parametrica,
  case when cif_bs > 0 then cif_bs + gastos_costo_bs end as costo_total_bs
from base;

-- Costo por lote (o por línea si aún no se cargaron lotes)
create view public.v_costeo_lotes with (security_invoker = true) as
select d.factura_id, d.id as detalle_factura_id, l.id as lote_id, d.numero_linea, d.producto_id, x.codigo, x.nombre,
  d.unidad, l.lote, l.vencimiento, coalesce(l.cantidad, d.cantidad) as cantidad, d.precio_unitario,
  coalesce(l.cantidad, d.cantidad) * d.precio_unitario as total_moneda,
  d.precio_unitario * c.tc_efectivo as costo_unitario_origen_bs,
  d.precio_unitario * c.tc_efectivo * c.parametrica as costo_unitario_bs,
  coalesce(l.cantidad, d.cantidad) * d.precio_unitario * c.tc_efectivo * c.parametrica as costo_total_bs
from public.detalles_factura d
join public.productos x on x.id = d.producto_id
join public.v_costeo c on c.factura_id = d.factura_id
left join public.costeo_lotes l on l.detalle_factura_id = d.id;

-- Planificación: modelo base (promedio ponderado reciente / histórico) + lead time del proveedor.
create view public.v_planificacion with (security_invoker = true) as
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
  case when necesidad <= 0 then 0
       else ceil(greatest(necesidad, coalesce(cantidad_minima, 0)) / coalesce(nullif(unidades_por_caja, 0), 1))
            * coalesce(nullif(unidades_por_caja, 0), 1) end as cantidad_sugerida,
  case when venta_diaria <= 0 then 'SIN VENTAS'
       when stock_total + en_camino <= punto_pedido then 'PEDIR YA'
       when stock_total + en_camino <= punto_pedido + venta_diaria * dias_aviso then 'PEDIR PRONTO'
       else 'CUBIERTO' end as alerta
from sug;

revoke all on public.v_giros_proforma, public.v_costeo, public.v_costeo_lotes, public.v_planificacion
  from public, anon, authenticated;
grant select on public.v_giros_proforma, public.v_costeo, public.v_costeo_lotes, public.v_planificacion,
  public.v_control_pagos, public.v_forecast_proforma, public.v_forecast_factura to authenticated;

-- ───────────────────────── Operaciones ─────────────────────────
create or replace function public.guardar_producto(datos jsonb, complemento jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := coalesce((datos->>'id')::uuid,gen_random_uuid());
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  insert into public.productos(id,codigo,nombre,estado,presentacion,observaciones)
  values(doc,btrim(datos->>'codigo'),btrim(datos->>'nombre'),datos->>'estado',datos->>'presentacion',datos->>'observaciones')
  on conflict(id) do update set codigo=excluded.codigo,nombre=excluded.nombre,estado=excluded.estado,
    presentacion=excluded.presentacion,observaciones=excluded.observaciones;
  insert into public.productos_complemento(id,nombre_proveedor,proveedor,packing_referencia,unidades_por_caja,
    cantidad_minima,codigo_nuevo,linea,laboratorio,estado_forecast,vida_util_meses)
  values(doc,complemento->>'nombre_proveedor',nullif(btrim(complemento->>'proveedor'),''),complemento->>'packing_referencia',
    nullif(complemento->>'unidades_por_caja','')::numeric, nullif(complemento->>'cantidad_minima','')::numeric,
    nullif(upper(btrim(complemento->>'codigo_nuevo')),''), nullif(complemento->>'linea',''),
    nullif(complemento->>'laboratorio',''), coalesce((complemento->>'estado_forecast')::boolean, true),
    nullif(complemento->>'vida_util_meses','')::integer)
  on conflict(id) do update set nombre_proveedor=excluded.nombre_proveedor,proveedor=excluded.proveedor,
    packing_referencia=excluded.packing_referencia,unidades_por_caja=excluded.unidades_por_caja,
    cantidad_minima=excluded.cantidad_minima,codigo_nuevo=excluded.codigo_nuevo,linea=excluded.linea,
    laboratorio=excluded.laboratorio,estado_forecast=excluded.estado_forecast,vida_util_meses=excluded.vida_util_meses;
  return doc;
end;
$$;

-- Proforma sugerida: nace del pedido sugerido; guarda cantidad sugerida y pronóstico para medir el acierto.
create function public.crear_proforma_sugerida(cabecera jsonb, lineas jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := gen_random_uuid(); l jsonb; n integer := 0; prov public.proveedores%rowtype;
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  if jsonb_typeof(lineas) <> 'array' or jsonb_array_length(lineas) = 0 then
    raise exception 'Selecciona al menos un producto'; end if;
  select * into prov from public.proveedores where nombre = btrim(cabecera->>'proveedor');
  if not found then raise exception 'Proveedor no registrado'; end if;
  insert into public.proformas(id,proveedor,numero,fecha_documento,moneda,estado,incoterm,condicion_pago,anticipo_por,observaciones)
  values(doc, prov.nombre, btrim(cabecera->>'numero'), coalesce((cabecera->>'fecha')::date, current_date),
    coalesce(cabecera->>'moneda', prov.moneda_habitual, 'USD'), 'sugerida', prov.incoterm, prov.condicion_pago,
    prov.anticipo_por, 'Creada desde el pedido sugerido');
  for l in select * from jsonb_array_elements(lineas) loop
    n := n + 1;
    insert into public.detalles_proforma(proforma_id,producto_id,numero_linea,cantidad_pedida,cantidad_sugerida,
      pronostico_mensual,unidad,precio_unitario)
    values(doc,(l->>'producto_id')::uuid,n,(l->>'cantidad')::numeric,(l->>'cantidad_sugerida')::numeric,
      nullif(l->>'pronostico_mensual','')::numeric, coalesce(nullif(l->>'unidad',''),'CAJA'),
      nullif(l->>'precio_unitario','')::numeric);
  end loop;
  return doc;
end;
$$;

-- Importación de existencias y ventas exportadas de ONIX (por CODIGO). Devuelve los códigos no encontrados.
create function public.importar_planificacion(tipo text, filas jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r jsonb; prod uuid; ok integer := 0; faltan text[] := '{}';
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  if tipo not in ('existencias','ventas') then raise exception 'Tipo de importación no válido'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    select id into prod from public.productos where codigo = btrim(r->>'codigo');
    if prod is null then faltan := array_append(faltan, r->>'codigo'); continue; end if;
    if tipo = 'existencias' then
      insert into public.existencias(producto_id, almacen, fecha_corte, cantidad)
      values(prod, upper(btrim(r->>'almacen')), (r->>'fecha')::date, (r->>'cantidad')::numeric)
      on conflict (producto_id, almacen, fecha_corte) do update set cantidad = excluded.cantidad;
    else
      insert into public.ventas_mensuales(producto_id, sucursal, mes, cantidad)
      values(prod, upper(btrim(r->>'sucursal')), date_trunc('month', (r->>'mes')::date)::date, (r->>'cantidad')::numeric)
      on conflict (producto_id, sucursal, mes) do update set cantidad = excluded.cantidad;
    end if;
    ok := ok + 1;
  end loop;
  return jsonb_build_object('importadas', ok, 'sin_producto', to_jsonb(faltan));
end;
$$;

-- Guarda varios gastos de una factura juntos (todo o nada)
create function public.guardar_gastos(factura uuid, filas jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r jsonb; n integer := 0;
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    insert into public.gastos(factura_id, concepto_id, tipo_documento, emisor, intermediario, numero_documento, fecha,
      descripcion, moneda, importe, tipo_cambio, importe_bs, por_costo, fecha_pago, banco, comprobante, observaciones)
    values(factura, (r->>'concepto_id')::uuid, r->>'tipo_documento', r->>'emisor', r->>'intermediario',
      r->>'numero_documento', nullif(r->>'fecha','')::date, r->>'descripcion', coalesce(nullif(r->>'moneda',''),'BOB'),
      nullif(r->>'importe','')::numeric, nullif(r->>'tipo_cambio','')::numeric, nullif(r->>'importe_bs','')::numeric,
      nullif(r->>'por_costo','')::numeric, nullif(r->>'fecha_pago','')::date, r->>'banco', r->>'comprobante', r->>'observaciones');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.crear_proforma_sugerida(jsonb,jsonb), public.importar_planificacion(text,jsonb),
  public.guardar_gastos(uuid,jsonb), public.guardar_producto(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.crear_proforma_sugerida(jsonb,jsonb), public.importar_planificacion(text,jsonb),
  public.guardar_gastos(uuid,jsonb), public.guardar_producto(jsonb,jsonb) to authenticated;


-- crear_documento conoce ahora las condiciones de la proforma (estado, incoterm, puerto, pago)
create or replace function public.crear_documento(tipo text, cabecera jsonb, lineas jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := coalesce((cabecera->>'id')::uuid, gen_random_uuid()); l jsonb; a jsonb; fila uuid; n integer := 0;
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  if tipo not in ('proforma','factura') then raise exception 'Documento no válido'; end if;
  if jsonb_typeof(lineas) <> 'array' or jsonb_array_length(lineas) = 0 or lineas is null then
    raise exception 'El documento debe contener productos'; end if;
  if tipo = 'proforma' then
    insert into public.proformas(id,proveedor,numero,fecha_documento,moneda,observaciones,estado,numero_proveedor,
      incoterm,lugar_entrega,puerto_carga,via,condicion_pago,anticipo_por,dias_produccion)
    values(doc, btrim(cabecera->>'proveedor'), btrim(cabecera->>'numero'), (cabecera->>'fecha_documento')::date,
      cabecera->>'moneda', cabecera->>'observaciones', coalesce(nullif(cabecera->>'estado',''),'confirmada'),
      nullif(cabecera->>'numero_proveedor',''), nullif(cabecera->>'incoterm',''), nullif(cabecera->>'lugar_entrega',''),
      nullif(cabecera->>'puerto_carga',''), nullif(cabecera->>'via',''), nullif(cabecera->>'condicion_pago',''),
      nullif(cabecera->>'anticipo_por','')::numeric, nullif(cabecera->>'dias_produccion','')::integer);
  else
    insert into public.facturas(id,proveedor,numero,fecha_emision,moneda,importe_documento,vencimiento_saldo,observaciones)
    values(doc, btrim(cabecera->>'proveedor'), btrim(cabecera->>'numero'), (cabecera->>'fecha_emision')::date,
      cabecera->>'moneda', nullif(cabecera->>'importe_documento','')::numeric,
      nullif(cabecera->>'vencimiento_saldo','')::date, cabecera->>'observaciones');
  end if;
  for l in select * from jsonb_array_elements(lineas) loop
    n := n + 1; fila := gen_random_uuid();
    if tipo = 'proforma' then
      insert into public.detalles_proforma(id,proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,packing,precio_unitario,descripcion_proveedor)
      values(fila,doc,(l->>'producto_id')::uuid,n,(l->>'cantidad')::numeric,btrim(l->>'unidad'),l->>'packing',
        nullif(l->>'precio_unitario','')::numeric, nullif(l->>'descripcion_proveedor',''));
    else
      insert into public.detalles_factura(id,factura_id,producto_id,numero_linea,referencia_proforma_documento,cantidad,unidad,packing,precio_unitario)
      values(fila,doc,(l->>'producto_id')::uuid,n,l->>'referencia_proforma_documento',(l->>'cantidad')::numeric,
        btrim(l->>'unidad'),l->>'packing',nullif(l->>'precio_unitario','')::numeric);
      for a in select * from jsonb_array_elements(coalesce(l->'asignaciones','[]'::jsonb)) loop
        insert into public.asignaciones(detalle_factura_id,detalle_proforma_id,cantidad)
        values(fila,(a->>'detalle_proforma_id')::uuid,(a->>'cantidad')::numeric);
      end loop;
    end if;
  end loop;
  return doc;
end;
$$;
revoke all on function public.crear_documento(text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.crear_documento(text,jsonb,jsonb) to authenticated;

create index on public.giros(proforma_id);
create index on public.giros(factura_id);
create index on public.giros_factura(factura_id);
create index on public.gastos(factura_id);
create index on public.gastos(concepto_id);
create index on public.costeo_lotes(detalle_factura_id);
create index on public.existencias(producto_id, almacen, fecha_corte desc);
create index on public.ventas_mensuales(producto_id, mes);

commit;
