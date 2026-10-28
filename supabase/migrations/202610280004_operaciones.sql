begin;
-- Operaciones atómicas para que un documento no quede guardado sin sus líneas.
-- SECURITY INVOKER conserva RLS y no permite elevar privilegios desde la web.
create function public.crear_documento(tipo text, cabecera jsonb, lineas jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := coalesce((cabecera->>'id')::uuid, gen_random_uuid()); l jsonb; a jsonb; fila uuid; n integer := 0;
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  if tipo not in ('proforma','factura') then raise exception 'Documento no válido'; end if;
  if jsonb_typeof(lineas) <> 'array' or jsonb_array_length(lineas) = 0 or lineas is null then
    raise exception 'El documento debe contener productos'; end if;
  if tipo = 'proforma' then
    insert into public.proformas(id,proveedor,numero,fecha_documento,moneda,observaciones)
    values(doc, btrim(cabecera->>'proveedor'), btrim(cabecera->>'numero'), (cabecera->>'fecha_documento')::date,
      cabecera->>'moneda', cabecera->>'observaciones');
  else
    insert into public.facturas(id,proveedor,numero,fecha_emision,moneda,importe_documento,vencimiento_saldo,observaciones)
    values(doc, btrim(cabecera->>'proveedor'), btrim(cabecera->>'numero'), (cabecera->>'fecha_emision')::date,
      cabecera->>'moneda', (cabecera->>'importe_documento')::numeric,
      nullif(cabecera->>'vencimiento_saldo','')::date, cabecera->>'observaciones');
  end if;
  for l in select * from jsonb_array_elements(lineas) loop
    n := n + 1; fila := gen_random_uuid();
    if tipo = 'proforma' then
      insert into public.detalles_proforma(id,proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,packing,precio_unitario)
      values(fila,doc,(l->>'producto_id')::uuid,n,(l->>'cantidad')::numeric,btrim(l->>'unidad'),l->>'packing',(l->>'precio_unitario')::numeric);
    else
      insert into public.detalles_factura(id,factura_id,producto_id,numero_linea,referencia_proforma_documento,cantidad,unidad,packing,precio_unitario)
      values(fila,doc,(l->>'producto_id')::uuid,n,l->>'referencia_proforma_documento',(l->>'cantidad')::numeric,
        btrim(l->>'unidad'),l->>'packing',(l->>'precio_unitario')::numeric);
      for a in select * from jsonb_array_elements(coalesce(l->'asignaciones','[]'::jsonb)) loop
        insert into public.asignaciones(detalle_factura_id,detalle_proforma_id,cantidad)
        values(fila,(a->>'detalle_proforma_id')::uuid,(a->>'cantidad')::numeric);
      end loop;
    end if;
  end loop;
  return doc;
end;
$$;

create function public.registrar_recepcion(cabecera jsonb, lineas jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := coalesce((cabecera->>'id')::uuid, gen_random_uuid()); l jsonb; a jsonb; fila uuid;
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  if jsonb_typeof(lineas) <> 'array' or jsonb_array_length(lineas) = 0 or lineas is null then
    raise exception 'La recepción debe contener cantidades'; end if;
  insert into public.recepciones(id,embarque_id,fecha_real,almacen,documento,observaciones)
  values(doc,(cabecera->>'embarque_id')::uuid,(cabecera->>'fecha_real')::date,btrim(cabecera->>'almacen'),
    btrim(cabecera->>'documento'),cabecera->>'observaciones');
  for l in select * from jsonb_array_elements(lineas) loop
    fila := gen_random_uuid();
    insert into public.detalles_recepcion(id,recepcion_id,detalle_factura_id,cantidad_recibida)
    values(fila,doc,(l->>'detalle_factura_id')::uuid,(l->>'cantidad_recibida')::numeric);
    for a in select * from jsonb_array_elements(coalesce(l->'aplicaciones','[]'::jsonb)) loop
      insert into public.aplicaciones_recepcion(detalle_recepcion_id,asignacion_id,cantidad)
      values(fila,(a->>'asignacion_id')::uuid,(a->>'cantidad')::numeric);
    end loop;
  end loop;
  return doc;
end;
$$;

create function public.guardar_producto(datos jsonb, complemento jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc uuid := coalesce((datos->>'id')::uuid,gen_random_uuid());
begin
  if not control_privado.tiene_acceso(true) then raise exception 'Se requiere administración'; end if;
  insert into public.productos(id,codigo,nombre,estado,presentacion,observaciones)
  values(doc,btrim(datos->>'codigo'),btrim(datos->>'nombre'),datos->>'estado',datos->>'presentacion',datos->>'observaciones')
  on conflict(id) do update set codigo=excluded.codigo,nombre=excluded.nombre,estado=excluded.estado,
    presentacion=excluded.presentacion,observaciones=excluded.observaciones;
  insert into public.productos_complemento(id,nombre_proveedor,proveedor,packing_referencia,unidades_por_caja)
  values(doc,complemento->>'nombre_proveedor',complemento->>'proveedor',complemento->>'packing_referencia',
    nullif(complemento->>'unidades_por_caja','')::numeric)
  on conflict(id) do update set nombre_proveedor=excluded.nombre_proveedor,proveedor=excluded.proveedor,
    packing_referencia=excluded.packing_referencia,unidades_por_caja=excluded.unidades_por_caja;
  return doc;
end;
$$;
revoke all on function public.crear_documento(text,jsonb,jsonb), public.registrar_recepcion(jsonb,jsonb),
  public.guardar_producto(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.crear_documento(text,jsonb,jsonb), public.registrar_recepcion(jsonb,jsonb),
  public.guardar_producto(jsonb,jsonb) to authenticated;
commit;
