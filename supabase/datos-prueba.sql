-- =====================================================================
-- DATOS DE PRUEBA (todo ficticio) para recorrer el proceso completo.
-- ¡BORRA los datos operativos de public! Conserva usuarios (perfiles) y
-- catálogos de costos (tipos de documento, grupos, conceptos, parámetros).
-- Ejecutar solo después de un respaldo (ver docs/datos-de-prueba.md).
--
-- Qué deja cargado:
--   · 2 proveedores y 8 productos con catálogo completo
--   · PRB LO 001 2026: ciclo cerrado (proforma → factura → embarque → recibido
--     → anticipo aplicado + cancelación → hoja de costos cerrada)
--   · PRB LO 002 2026: factura parcial en tránsito, saldo pendiente
--   · PRB FI 014 2026: proforma enviada, sin factura ni anticipo
--   · Existencias y 12 meses de ventas: hay productos para «pedir ya»,
--     «pedir pronto» y cubiertos, listos para crear una proforma sugerida
-- =====================================================================
begin;

truncate public.aplicaciones_recepcion, public.detalles_recepcion, public.recepciones, public.costeo_lotes,
  public.gastos, public.costeos, public.giros_factura, public.giros, public.pagos, public.adjuntos,
  public.asignaciones, public.embarques, public.detalles_factura, public.facturas, public.detalles_proforma,
  public.proformas, public.existencias, public.ventas_mensuales, public.productos_complemento, public.productos,
  public.proveedores, public.historial;

do $$
declare
  pfa uuid; pfb uuid; pfc uuid; f1 uuid; f2 uuid; e1 uuid; e2 uuid; r1 uuid; co uuid; g uuid;
  r record;
begin
  insert into public.proveedores(nombre,pais,moneda_habitual,prefijo,lead_time_dias,incoterm,anticipo_por,plazo_saldo_dias,condicion_pago,observaciones) values
    ('LAB ORIENTE (PRUEBA)','India','USD','LO',140,'CIF',30,null,'30 % anticipo, 70 % contra documentos de embarque','Proveedor ficticio'),
    ('FARMA IBERICA (PRUEBA)','España','EUR','FI',90,'FOB',50,30,'50 % anticipo, saldo a 30 días','Proveedor ficticio');

  insert into public.productos(codigo,nombre,estado,presentacion) values
    ('PRB-001','AMOXICILINA 500 MG','ACTIVO','Caja x 100 cápsulas'),
    ('PRB-002','IBUPROFENO 400 MG','ACTIVO','Caja x 100 comprimidos'),
    ('PRB-003','PARACETAMOL 500 MG','ACTIVO','Caja x 100 comprimidos'),
    ('PRB-004','CEFTRIAXONA 1 G','ACTIVO','Vial'),
    ('PRB-005','OMEPRAZOL 20 MG','ACTIVO','Caja x 30 cápsulas'),
    ('PRB-006','LORATADINA 10 MG','ACTIVO','Caja x 20 comprimidos'),
    ('PRB-007','DICLOFENACO 50 MG','ACTIVO','Caja x 20 comprimidos'),
    ('PRB-008','VITAMINA C 1 G EFERVESCENTE','ACTIVO','Tubo x 10');
  insert into public.productos_complemento(id,proveedor,laboratorio,linea,codigo_nuevo,cantidad_minima,unidades_por_caja,vida_util_meses,estado_forecast,nombre_proveedor)
  select p.id, v.prov, v.prov, 'S', v.cn, v.minimo, v.caja, 36, true, v.np from public.productos p join (values
    ('PRB-001','LAB ORIENTE (PRUEBA)','SLO00001',5000,100,'AMOXYCILLIN CAPS 500MG'),
    ('PRB-002','LAB ORIENTE (PRUEBA)','SLO00002',5000,100,'IBUPROFEN TAB 400MG'),
    ('PRB-003','LAB ORIENTE (PRUEBA)','SLO00003',10000,100,'PARACETAMOL TAB 500MG'),
    ('PRB-004','LAB ORIENTE (PRUEBA)','SLO00004',2000,50,'CEFTRIAXONE INJ 1G'),
    ('PRB-005','LAB ORIENTE (PRUEBA)','SLO00005',5000,100,'OMEPRAZOLE CAPS 20MG'),
    ('PRB-006','FARMA IBERICA (PRUEBA)','SFI00001',2000,50,'LORATADINA 10 MG'),
    ('PRB-007','FARMA IBERICA (PRUEBA)','SFI00002',2000,50,'DICLOFENACO 50 MG'),
    ('PRB-008','FARMA IBERICA (PRUEBA)','SFI00003',1000,20,'VITAMINA C 1 G')) v(cod,prov,cn,minimo,caja,np) on v.cod = p.codigo;

  -- ── Ciclo 1 completo ──
  insert into public.proformas(proveedor,numero,numero_proveedor,fecha_documento,moneda,estado,incoterm,lugar_entrega,puerto_carga,via,condicion_pago,anticipo_por,dias_produccion)
  values('LAB ORIENTE (PRUEBA)','PRB LO 001 2026','LO/PI/2026/001','2026-03-10','USD','confirmada','CIF','Cochabamba','Nhava Sheva','MARITIMA','30 % anticipo, 70 % contra documentos de embarque',30,90) returning id into pfa;
  insert into public.detalles_proforma(proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,precio_unitario,descripcion_proveedor)
  select pfa, p.id, v.n, v.q, 'UNIDAD', v.pr, c.nombre_proveedor from (values (1,'PRB-001',20000,0.35),(2,'PRB-002',15000,0.40),(3,'PRB-003',30000,0.25),(4,'PRB-004',5000,0.55)) v(n,cod,q,pr)
    join public.productos p on p.codigo = v.cod join public.productos_complemento c on c.id = p.id;
  insert into public.giros(tipo,proveedor,proforma_id,fecha,banco,moneda,importe,tipo_cambio,referencia)
  values('anticipo','LAB ORIENTE (PRUEBA)',pfa,'2026-03-15','BANCO DE PRUEBA','USD',6975,6.96,'Anticipo 30 % PRB LO 001') returning id into g;

  insert into public.facturas(proveedor,numero,fecha_emision,moneda,importe_documento,observaciones)
  values('LAB ORIENTE (PRUEBA)','PRB-INV-101','2026-06-20','USD',22000,'Paracetamol: llegan 25.000 de 30.000; el resto queda pendiente') returning id into f1;
  insert into public.detalles_factura(factura_id,producto_id,numero_linea,referencia_proforma_documento,cantidad,unidad,precio_unitario)
  select f1, p.id, v.n, 'LO/PI/2026/001', v.q, 'UNIDAD', v.pr from (values (1,'PRB-001',20000,0.35),(2,'PRB-002',15000,0.40),(3,'PRB-003',25000,0.25),(4,'PRB-004',5000,0.55)) v(n,cod,q,pr)
    join public.productos p on p.codigo = v.cod;
  insert into public.asignaciones(detalle_factura_id,detalle_proforma_id,cantidad)
  select df.id, dp.id, df.cantidad from public.detalles_factura df join public.detalles_proforma dp on dp.producto_id = df.producto_id and dp.proforma_id = pfa where df.factura_id = f1;
  insert into public.giros_factura(giro_id,factura_id,importe) values(g,f1,6600);
  insert into public.giros(tipo,proveedor,factura_id,fecha,banco,moneda,importe,tipo_cambio,referencia)
  values('cancelacion','LAB ORIENTE (PRUEBA)',f1,'2026-08-05','BANCO DE PRUEBA','USD',15400,9.95,'Cancelación contra documentos');
  insert into public.embarques(factura_id,numero_bl,naviera,puerto,fecha_bl,salida_estimada,salida_real,arica_estimada,arica_real,aduana_real,cochabamba_estimada,cochabamba_real)
  values(f1,'BL-PRUEBA-0101','NAVIERA DE PRUEBA','ARICA','2026-06-24','2026-06-25','2026-06-26','2026-08-05','2026-08-10','2026-08-18','2026-08-20','2026-08-22') returning id into e1;
  insert into public.recepciones(embarque_id,fecha_real,almacen,documento) values(e1,'2026-08-22','COCHABAMBA','NI-PRUEBA-370') returning id into r1;
  insert into public.detalles_recepcion(recepcion_id,detalle_factura_id,cantidad_recibida) select r1, id, cantidad from public.detalles_factura where factura_id = f1;
  insert into public.aplicaciones_recepcion(detalle_recepcion_id,asignacion_id,cantidad)
  select dr.id, a.id, dr.cantidad_recibida from public.detalles_recepcion dr join public.asignaciones a on a.detalle_factura_id = dr.detalle_factura_id where dr.recepcion_id = r1;

  insert into public.costeos(factura_id,condicion_entrega,compra_onix,dim,fecha_dim,tc_dim) values(f1,'CIF','370','DIM-PRUEBA-0101','2026-08-18',9.90) returning id into co;
  for r in select * from (values
    ('Diferencia de cambio','EXTRACTO','BANCO DE PRUEBA','BOB',null::numeric,null::numeric,1180.00,'Diferencia de cambio entre anticipo y cancelación'),
    ('Comisión bancaria','FACTURA','BANCO DE PRUEBA','BOB',null,null,920.00,'Comisión giro anticipo y cancelación'),
    ('ITF','EXTRACTO','BANCO DE PRUEBA','BOB',null,null,165.40,'ITF envíos'),
    ('Seguro de transporte','FACTURA','ASEGURADORA DE PRUEBA','BOB',null,null,450.00,'Póliza de transporte'),
    ('Permiso de desaduanización','FACTURA','AGEMED','BOB',null,null,149.00,'Permiso de desaduanización'),
    ('Despacho portuario','FORMULARIO','PUERTO DE PRUEBA','USD',95.00,11.70,1111.50,'Despacho portuario Arica'),
    ('DTHC','NOTA_DEBITO','NAVIERA DE PRUEBA','USD',260.00,11.70,3042.00,'DTHC'),
    ('Handling','NOTA_DEBITO','NAVIERA DE PRUEBA','USD',120.00,11.70,1404.00,'Handling'),
    ('Flete terrestre','FACTURA','TRANSPORTE DE PRUEBA','BOB',null,null,5200.00,'Arica – Cochabamba'),
    ('GAC','DIM','ADUANA NACIONAL','BOB',null,null,10890.00,'GAC 5 %'),
    ('IVA importación','DIM','ADUANA NACIONAL','BOB',null,null,30120.00,'IVA de la DIM (no va al costo)'),
    ('Uso de sistema','DIM','ADUANA NACIONAL','BOB',null,null,100.00,'Formulario 187'),
    ('Almacenaje','FACTURA','DEPÓSITO ADUANERO DE PRUEBA','BOB',null,null,780.00,'Almacenaje en aduana'),
    ('Comisión agencia','FACTURA','AGENCIA DE PRUEBA','BOB',null,null,2400.00,'Comisión agencia despachante'),
    ('DAM','FACTURA','AGENCIA DE PRUEBA','BOB',null,null,250.00,'DAM'),
    ('Traslado aduana – oficina','RECIBO','TRANSPORTE DE PRUEBA','BOB',null,null,600.00,'Camión y cargadores')
  ) v(concepto,doc,emisor,mon,imp,tc,bs,descr) loop
    insert into public.gastos(factura_id,concepto_id,tipo_documento,emisor,moneda,importe,tipo_cambio,importe_bs,descripcion,fecha)
    values(f1,(select id from public.conceptos_gasto where nombre = r.concepto),r.doc,r.emisor,r.mon,r.imp,r.tc,r.bs,r.descr,'2026-08-18');
  end loop;
  -- Un % corregido a mano para ver la diferencia con el sugerido
  update public.gastos set por_costo = 100, observaciones = 'Corregido: el seguro va completo al costo'
    where factura_id = f1 and concepto_id = (select id from public.conceptos_gasto where nombre = 'Seguro de transporte');
  insert into public.costeo_lotes(costeo_id,detalle_factura_id,lote,vencimiento,cantidad)
  select co, df.id, v.lote, v.venc::date, v.q from (values
    ('PRB-001','AMX2601','2029-01-31',12000),('PRB-001','AMX2602','2029-03-31',8000),
    ('PRB-002','IBU2604','2029-02-28',15000),('PRB-003','PAR2605','2029-04-30',25000),('PRB-004','CEF2603','2028-12-31',5000)) v(cod,lote,venc,q)
  join public.productos p on p.codigo = v.cod join public.detalles_factura df on df.factura_id = f1 and df.producto_id = p.id;
  update public.costeos set estado = 'cerrado', cerrado_en = '2026-08-25 18:00-04' where id = co;

  -- ── Ciclo 2: factura parcial en tránsito ──
  insert into public.proformas(proveedor,numero,numero_proveedor,fecha_documento,moneda,estado,incoterm,lugar_entrega,puerto_carga,via,condicion_pago,anticipo_por,dias_produccion)
  values('LAB ORIENTE (PRUEBA)','PRB LO 002 2026','LO/PI/2026/014','2026-07-20','USD','confirmada','CIF','Cochabamba','Nhava Sheva','MARITIMA','30 % anticipo, 70 % contra documentos de embarque',30,90) returning id into pfb;
  insert into public.detalles_proforma(proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,precio_unitario,descripcion_proveedor)
  select pfb, p.id, v.n, v.q, 'UNIDAD', v.pr, c.nombre_proveedor from (values (1,'PRB-001',25000,0.36),(2,'PRB-005',18000,0.30)) v(n,cod,q,pr)
    join public.productos p on p.codigo = v.cod join public.productos_complemento c on c.id = p.id;
  insert into public.giros(tipo,proveedor,proforma_id,fecha,banco,moneda,importe,tipo_cambio,referencia)
  values('anticipo','LAB ORIENTE (PRUEBA)',pfb,'2026-07-25','BANCO DE PRUEBA','USD',4320,6.96,'Anticipo 30 % PRB LO 002') returning id into g;
  insert into public.facturas(proveedor,numero,fecha_emision,moneda,importe_documento,vencimiento_saldo,observaciones)
  values('LAB ORIENTE (PRUEBA)','PRB-INV-118','2026-10-15','USD',9000,'2026-12-10','Primera parte: solo amoxicilina; el omeprazol sale en el próximo embarque') returning id into f2;
  insert into public.detalles_factura(factura_id,producto_id,numero_linea,referencia_proforma_documento,cantidad,unidad,precio_unitario)
  select f2, id, 1, 'LO/PI/2026/014', 25000, 'UNIDAD', 0.36 from public.productos where codigo = 'PRB-001';
  insert into public.asignaciones(detalle_factura_id,detalle_proforma_id,cantidad)
  select df.id, dp.id, 25000 from public.detalles_factura df join public.detalles_proforma dp on dp.producto_id = df.producto_id and dp.proforma_id = pfb where df.factura_id = f2;
  insert into public.giros_factura(giro_id,factura_id,importe) values(g,f2,2700);
  insert into public.embarques(factura_id,numero_bl,naviera,puerto,fecha_bl,salida_estimada,salida_real,arica_estimada,cochabamba_estimada)
  values(f2,'BL-PRUEBA-0118','NAVIERA DE PRUEBA','IQUIQUE','2026-10-19','2026-10-20','2026-10-21','2026-12-01','2026-12-10') returning id into e2;
  insert into public.costeos(factura_id,condicion_entrega,compra_onix) values(f2,'CIF',null);
  insert into public.gastos(factura_id,concepto_id,tipo_documento,emisor,moneda,importe_bs,descripcion,fecha)
  values(f2,(select id from public.conceptos_gasto where nombre = 'Comisión bancaria'),'FACTURA','BANCO DE PRUEBA','BOB',310,'Comisión giro anticipo','2026-07-25');

  -- ── Ciclo 3: proforma enviada, todavía sin anticipo ──
  insert into public.proformas(proveedor,numero,numero_proveedor,fecha_documento,moneda,estado,incoterm,lugar_entrega,puerto_carga,via,condicion_pago,anticipo_por,dias_produccion)
  values('FARMA IBERICA (PRUEBA)','PRB FI 014 2026','FI-2026-014','2026-10-28','EUR','enviada','FOB','Valencia','Valencia','MARITIMA','50 % anticipo, saldo a 30 días',50,45) returning id into pfc;
  insert into public.detalles_proforma(proforma_id,producto_id,numero_linea,cantidad_pedida,unidad,precio_unitario,descripcion_proveedor)
  select pfc, p.id, v.n, v.q, 'UNIDAD', v.pr, c.nombre_proveedor from (values (1,'PRB-006',6000,1.10),(2,'PRB-007',8000,0.85)) v(n,cod,q,pr)
    join public.productos p on p.codigo = v.cod join public.productos_complemento c on c.id = p.id;

  -- ── Existencias al 10/11/2026 y ventas de 12 meses ──
  insert into public.existencias(producto_id,almacen,fecha_corte,cantidad)
  select p.id, a.alm, '2026-11-10', a.q from public.productos p join (values
    ('PRB-001','COCHABAMBA',20000),('PRB-001','SANTA CRUZ',9000),('PRB-002','COCHABAMBA',9000),('PRB-002','SANTA CRUZ',4000),
    ('PRB-003','COCHABAMBA',18000),('PRB-003','SANTA CRUZ',12000),('PRB-004','COCHABAMBA',4000),('PRB-004','SANTA CRUZ',2500),
    ('PRB-005','COCHABAMBA',3000),('PRB-005','SANTA CRUZ',1500),('PRB-006','COCHABAMBA',2000),('PRB-006','SANTA CRUZ',1000),
    ('PRB-007','COCHABAMBA',2500),('PRB-007','SANTA CRUZ',2000),('PRB-008','COCHABAMBA',1000),('PRB-008','SANTA CRUZ',500)) a(cod,alm,q) on a.cod = p.codigo;
  -- Venta mensual base por producto, con estacionalidad suave (más en invierno: may–ago) y 60 % Cochabamba / 40 % Santa Cruz
  insert into public.ventas_mensuales(producto_id,sucursal,mes,cantidad)
  select p.id, s.suc, m.mes::date,
    round(b.base * s.part * (1 + 0.15 * cos((extract(month from m.mes) - 7) * pi() / 6)))
  from public.productos p
  join (values ('PRB-001',6000),('PRB-002',4500),('PRB-003',7000),('PRB-004',1000),('PRB-005',3000),('PRB-006',1500),('PRB-007',2500),('PRB-008',800)) b(cod,base) on b.cod = p.codigo
  cross join (values ('COCHABAMBA',0.6),('SANTA CRUZ',0.4)) s(suc,part)
  cross join generate_series('2025-11-01'::date,'2026-10-01'::date,'1 month') m(mes);
end $$;

commit;
