-- Ejecutar una sola vez en un proyecto Supabase nuevo (PostgreSQL 15+).
begin;

create schema if not exists control_privado;
revoke all on schema control_privado from public, anon, authenticated;
grant usage on schema control_privado to authenticated;

create domain public.texto_requerido as text check (length(btrim(value)) > 0);
create domain public.cantidad_control as numeric(18,4)
  check (value >= 0 and value < 'Infinity'::numeric);
create domain public.importe_control as numeric(18,4)
  check (value >= 0 and value < 'Infinity'::numeric);

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete restrict,
  nombre public.texto_requerido not null,
  rol text not null check (rol in ('administracion', 'consulta')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create function control_privado.tiene_acceso(escritura boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles
    where id = (select auth.uid()) and activo
      and (not escritura or rol = 'administracion'));
$$;

-- Un contador transaccional serializa escrituras del pequeño equipo y evita
-- que dos solicitudes superen juntas los límites de asignación/recepción.
create table control_privado.exclusion (id boolean primary key default true check (id), version bigint not null);
insert into control_privado.exclusion values (true, 0);
alter table control_privado.exclusion enable row level security;
revoke all on control_privado.exclusion from public, anon, authenticated;

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo public.texto_requerido not null unique,
  codigo_producto_origen text unique,
  nombre public.texto_requerido not null,
  estado public.texto_requerido not null default 'ACTIVO',
  presentacion text,
  origen text not null default 'manual' check (origen in ('base_datos','historico','manual')),
  observaciones text
);
create table public.productos_complemento (
  id uuid primary key references public.productos(id) on delete restrict,
  nombre_proveedor text,
  proveedor text,
  unidades_por_caja public.cantidad_control,
  cantidad_minima public.cantidad_control,
  tipo text,
  contenedor text,
  packing_referencia text
);
create table public.proformas (
  id uuid primary key default gen_random_uuid(),
  proveedor public.texto_requerido not null,
  numero public.texto_requerido not null,
  fecha_documento date not null,
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  observaciones text,
  unique (proveedor, numero)
);
create table public.detalles_proforma (
  id uuid primary key default gen_random_uuid(),
  proforma_id uuid not null references public.proformas(id) on delete restrict,
  producto_id uuid not null references public.productos(id) on delete restrict,
  numero_linea integer not null check (numero_linea > 0),
  cantidad_pedida public.cantidad_control not null check (cantidad_pedida > 0),
  cantidad_cancelada public.cantidad_control not null default 0,
  motivo_cancelacion text,
  fecha_cancelacion date,
  unidad public.texto_requerido not null,
  packing text,
  precio_unitario public.importe_control not null,
  observaciones text,
  unique (proforma_id, numero_linea),
  check (cantidad_cancelada <= cantidad_pedida),
  check (cantidad_cancelada = 0 or (length(btrim(motivo_cancelacion)) > 0 and fecha_cancelacion is not null and motivo_cancelacion is not null))
);
create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  proveedor public.texto_requerido not null,
  numero public.texto_requerido not null,
  fecha_emision date not null,
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  importe_documento public.importe_control not null,
  vencimiento_saldo date,
  cargado_sistema_en date,
  referencia_sistema text,
  observaciones text,
  unique (proveedor, numero),
  check (cargado_sistema_en is null or (referencia_sistema is not null and length(btrim(referencia_sistema)) > 0))
);
create table public.detalles_factura (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas(id) on delete restrict,
  producto_id uuid not null references public.productos(id) on delete restrict,
  numero_linea integer not null check (numero_linea > 0),
  referencia_proforma_documento text,
  cantidad public.cantidad_control not null check (cantidad > 0),
  unidad public.texto_requerido not null,
  packing text,
  precio_unitario public.importe_control not null,
  observaciones text,
  unique (factura_id, numero_linea)
);
create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  detalle_proforma_id uuid not null references public.detalles_proforma(id) on delete restrict,
  detalle_factura_id uuid not null references public.detalles_factura(id) on delete restrict,
  cantidad public.cantidad_control not null check (cantidad > 0),
  observaciones text,
  unique (detalle_proforma_id, detalle_factura_id)
);
create table public.embarques (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null unique references public.facturas(id) on delete restrict,
  numero_bl public.texto_requerido unique,
  fecha_bl date,
  salida_estimada date,
  salida_real date,
  arica_estimada date,
  arica_real date,
  cochabamba_estimada date,
  cochabamba_real date,
  observaciones text
);
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas(id) on delete restrict,
  fecha date not null,
  importe public.importe_control not null check (importe > 0),
  referencia public.texto_requerido not null,
  observaciones text
);
create table public.recepciones (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null references public.embarques(id) on delete restrict,
  fecha_real date not null,
  almacen public.texto_requerido not null,
  documento public.texto_requerido not null,
  observaciones text,
  unique (embarque_id, documento)
);
create table public.detalles_recepcion (
  id uuid primary key default gen_random_uuid(),
  recepcion_id uuid not null references public.recepciones(id) on delete restrict,
  detalle_factura_id uuid not null references public.detalles_factura(id) on delete restrict,
  cantidad_recibida public.cantidad_control not null check (cantidad_recibida > 0),
  observaciones text,
  unique (recepcion_id, detalle_factura_id)
);
create table public.aplicaciones_recepcion (
  id uuid primary key default gen_random_uuid(),
  detalle_recepcion_id uuid not null references public.detalles_recepcion(id) on delete restrict,
  asignacion_id uuid not null references public.asignaciones(id) on delete restrict,
  cantidad public.cantidad_control not null check (cantidad > 0),
  unique (detalle_recepcion_id, asignacion_id)
);
create table public.adjuntos (
  id uuid primary key default gen_random_uuid(),
  proforma_id uuid references public.proformas(id) on delete restrict,
  factura_id uuid references public.facturas(id) on delete restrict,
  pago_id uuid references public.pagos(id) on delete restrict,
  nombre public.texto_requerido not null,
  ruta public.texto_requerido not null unique,
  check (num_nonnulls(proforma_id, factura_id, pago_id) = 1),
  check (ruta like id::text || '/%')
);
create table public.historial (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid not null,
  operacion text not null,
  usuario_id uuid,
  fecha timestamptz not null default now(),
  anterior jsonb,
  nuevo jsonb
);
revoke all on sequence public.historial_id_seq from public, anon, authenticated;

create function control_privado.preparar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update control_privado.exclusion set version = version + 1 where id;
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'No se permite cambiar la identidad del registro'; end if;
    new.creado_en := old.creado_en;
    new.creado_por := old.creado_por;
  else
    new.creado_en := now();
    new.creado_por := auth.uid();
  end if;
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;
create function control_privado.bloquear_borrado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update control_privado.exclusion set version = version + 1 where id;
  return old;
end;
$$;
create function control_privado.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historial(tabla, registro_id, operacion, usuario_id, anterior, nuevo)
  values (tg_table_name, coalesce(new.id, old.id), tg_op, auth.uid(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end;
$$;

-- Se valida al terminar cada transacción: permite corregir varios registros
-- juntos y también impide evadir los controles editando la fila padre.
create function control_privado.validar_relaciones() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.asignaciones a
    join public.detalles_proforma p on p.id = a.detalle_proforma_id
    join public.detalles_factura f on f.id = a.detalle_factura_id
    join public.proformas pr on pr.id = p.proforma_id
    join public.facturas fa on fa.id = f.factura_id
    where p.producto_id <> f.producto_id or p.unidad <> f.unidad or pr.proveedor <> fa.proveedor
  ) then raise exception 'La asignación requiere el mismo producto, unidad y proveedor'; end if;
  if exists (
    select 1 from public.detalles_factura f join public.asignaciones a on a.detalle_factura_id = f.id
    group by f.id having sum(a.cantidad) > f.cantidad
  ) then raise exception 'La cantidad asignada supera la cantidad facturada'; end if;
  if exists (
    select 1 from public.detalles_recepcion d
    join public.recepciones r on r.id = d.recepcion_id
    join public.embarques e on e.id = r.embarque_id
    join public.detalles_factura f on f.id = d.detalle_factura_id
    where e.factura_id <> f.factura_id
  ) then raise exception 'La recepción y la línea deben pertenecer a la misma factura'; end if;
  if exists (
    select 1 from public.aplicaciones_recepcion a
    join public.detalles_recepcion r on r.id = a.detalle_recepcion_id
    join public.asignaciones s on s.id = a.asignacion_id
    where r.detalle_factura_id <> s.detalle_factura_id
  ) then raise exception 'La recepción aplicada corresponde a otra línea de factura'; end if;
  if exists (
    select 1 from public.detalles_recepcion r
    join public.aplicaciones_recepcion a on a.detalle_recepcion_id = r.id
    group by r.id having sum(a.cantidad) > r.cantidad_recibida
  ) then raise exception 'La recepción aplicada supera la cantidad recibida'; end if;
  if exists (
    select 1 from public.asignaciones s
    join public.aplicaciones_recepcion a on a.asignacion_id = s.id
    group by s.id having sum(a.cantidad) > s.cantidad
  ) then raise exception 'La recepción aplicada supera la cantidad asignada'; end if;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['productos','productos_complemento','proformas','detalles_proforma',
    'facturas','detalles_factura','asignaciones','embarques','pagos','recepciones',
    'detalles_recepcion','aplicaciones_recepcion','adjuntos'] loop
    execute format('alter table public.%I add column creado_en timestamptz not null default now(),
      add column creado_por uuid, add column actualizado_en timestamptz not null default now(),
      add column actualizado_por uuid', t);
    execute format('create trigger preparar_cambio before insert or update on public.%I
      for each row execute function control_privado.preparar_cambio()', t);
    execute format('create trigger bloquear_borrado before delete on public.%I
      for each row execute function control_privado.bloquear_borrado()', t);
    execute format('create trigger auditar after insert or update or delete on public.%I
      for each row execute function control_privado.auditar()', t);
    execute format('create constraint trigger validar_relaciones after insert or update or delete on public.%I
      deferrable initially deferred for each row execute function control_privado.validar_relaciones()', t);
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

alter table public.perfiles enable row level security;
alter table public.historial enable row level security;
revoke all on public.perfiles, public.historial from public, anon, authenticated;
grant select on public.perfiles, public.historial to authenticated;
create policy consultar on public.perfiles for select to authenticated
  using ((select control_privado.tiene_acceso(false)));
create policy consultar on public.historial for select to authenticated
  using ((select control_privado.tiene_acceso(false)));
create trigger auditar after insert or update or delete on public.perfiles
  for each row execute function control_privado.auditar();
revoke all on all functions in schema control_privado from public, anon, authenticated;
grant execute on function control_privado.tiene_acceso(boolean) to authenticated;

create index on public.detalles_proforma(producto_id);
create index on public.detalles_factura(producto_id);
create index on public.asignaciones(detalle_factura_id);
create index on public.pagos(factura_id);
create index on public.recepciones(embarque_id);
create index on public.detalles_recepcion(detalle_factura_id);
create index on public.aplicaciones_recepcion(asignacion_id);
create index on public.adjuntos(proforma_id);
create index on public.adjuntos(factura_id);
create index on public.adjuntos(pago_id);
create index on public.historial(tabla, registro_id, fecha);

commit;
