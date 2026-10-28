begin;

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre public.texto_requerido not null unique,
  pais text,
  moneda_habitual text check (moneda_habitual is null or moneda_habitual ~ '^[A-Z]{3}$'),
  activo boolean not null default true,
  observaciones text
);

alter table public.proveedores
  add column creado_en timestamptz not null default now(),
  add column creado_por uuid,
  add column actualizado_en timestamptz not null default now(),
  add column actualizado_por uuid;

create trigger preparar_cambio before insert or update on public.proveedores
  for each row execute function control_privado.preparar_cambio();
create trigger bloquear_borrado before delete on public.proveedores
  for each row execute function control_privado.bloquear_borrado();
create trigger auditar after insert or update or delete on public.proveedores
  for each row execute function control_privado.auditar();

alter table public.proveedores enable row level security;
revoke all on public.proveedores from public, anon, authenticated;
grant select, insert, update, delete on public.proveedores to authenticated;
create policy consultar on public.proveedores for select to authenticated
  using ((select control_privado.tiene_acceso(false)));
create policy registrar on public.proveedores for insert to authenticated
  with check ((select control_privado.tiene_acceso(true)));
create policy modificar on public.proveedores for update to authenticated
  using ((select control_privado.tiene_acceso(true))) with check ((select control_privado.tiene_acceso(true)));
create policy eliminar on public.proveedores for delete to authenticated
  using ((select control_privado.tiene_acceso(true)));

-- Proveedores que ya existen en los documentos
insert into public.proveedores(nombre)
select distinct btrim(p) from (
  select proveedor p from public.proformas
  union select proveedor from public.facturas
  union select proveedor from public.productos_complemento
) s where nullif(btrim(p), '') is not null;

-- Un proveedor nuevo escrito en un documento se registra solo, para no romper la pantalla actual
create function control_privado.asegurar_proveedor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if nullif(btrim(new.proveedor), '') is not null then
    insert into public.proveedores(nombre) values (btrim(new.proveedor)) on conflict (nombre) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function control_privado.asegurar_proveedor() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['proformas','facturas','productos_complemento'] loop
    execute format('create trigger asegurar_proveedor before insert or update of proveedor on public.%I
      for each row execute function control_privado.asegurar_proveedor()', t);
    execute format('alter table public.%I add constraint %I foreign key (proveedor)
      references public.proveedores(nombre) on update cascade', t, t || '_proveedor_fkey');
  end loop;
end;
$$;

commit;
