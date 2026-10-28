begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-control', 'documentos-control', false, 10485760, array['application/pdf']);

-- Registrar primero el adjunto; la ruta debe ser <uuid-adjunto>/<nombre>.pdf.
-- Los PDFs son inmutables desde la aplicación; para reemplazar uno se crea otro
-- adjunto. Así un cambio de contenido no destruye evidencia del documento.
create policy control_documentos_consultar on storage.objects
for select to authenticated using (
  bucket_id = 'documentos-control'
  and (select control_privado.tiene_acceso(false))
  and exists (select 1 from public.adjuntos a where a.ruta = name)
);
create policy control_documentos_registrar on storage.objects
for insert to authenticated with check (
  bucket_id = 'documentos-control'
  and (select control_privado.tiene_acceso(true))
  and exists (select 1 from public.adjuntos a where a.ruta = name)
);

-- Metadatos inmutables: evita redirigir un adjunto a otro documento.
revoke update, delete on public.adjuntos from authenticated;
commit;
