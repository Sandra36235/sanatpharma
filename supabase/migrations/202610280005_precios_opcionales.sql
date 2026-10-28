-- Los costos y el importe de las facturas migradas desde Excel no tienen fuente válida.
-- Se permite dejarlos vacíos (null) en vez de registrar 0, que parecería un precio real.
begin;
alter table public.detalles_proforma alter column precio_unitario drop not null;
alter table public.detalles_factura alter column precio_unitario drop not null;
alter table public.facturas alter column importe_documento drop not null;
commit;
