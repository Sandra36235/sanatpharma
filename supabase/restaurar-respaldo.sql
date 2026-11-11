-- =====================================================================
-- Restaura TODAS las tablas de public desde un esquema de respaldo
-- (por ejemplo respaldo_20261111, creado antes de cargar datos de prueba).
-- Borra lo que haya en public (incluidos los datos de prueba).
-- Ejecutar en el editor SQL de Supabase. Cambiar el nombre del esquema abajo.
-- =====================================================================
begin;
-- Sin disparadores: conserva fechas, autores e historial originales tal cual.
set local session_replication_role = replica;
do $$
declare
  origen text := 'respaldo_20261111';   -- ← esquema de respaldo a restaurar
  t text; cols text;
begin
  if not exists (select 1 from pg_namespace where nspname = origen) then
    raise exception 'No existe el esquema %', origen; end if;
  execute (select 'truncate ' || string_agg(format('public.%I', tablename), ', ')
           from pg_tables where schemaname = 'public');
  for t in select tablename from pg_tables where schemaname = origen loop
    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into cols
    from information_schema.columns c
    join information_schema.columns r on r.table_schema = origen and r.table_name = t and r.column_name = c.column_name
    where c.table_schema = 'public' and c.table_name = t and c.is_generated = 'NEVER';
    execute format('insert into public.%I (%s) select %s from %I.%I', t, cols, cols, origen, t);
  end loop;
end $$;
commit;
