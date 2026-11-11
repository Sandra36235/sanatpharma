-- Borra las existencias y ventas de prueba (estimadas a partir de las proformas)
-- antes de importar la primera exportación real de ONIX.
-- No toca proformas, facturas, pagos ni costos.
begin;
delete from public.ventas_mensuales;
delete from public.existencias;
commit;
