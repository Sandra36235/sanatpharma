// Pagos por giros, hoja de costos y planificación. Datos ficticios con la misma lógica
// que la hoja de costos real: CIF en Bs = lo pagado en Bs + diferencia de cambio,
// paramétrica = (CIF Bs + gastos al costo) / CIF Bs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const one = async sql => (await db.query(sql)).rows[0];
async function inTx(fn) { await db.exec('begin'); try { await fn(); } finally { await db.exec('rollback'); } }
async function fails(sql, pattern) {
  await db.exec('savepoint s');
  try { await assert.rejects(async () => { await db.exec(sql); await db.exec('set constraints all immediate'); }, pattern); }
  finally { await db.exec('rollback to savepoint s'); }
}
const near = (a, b, eps = 1e-4) => assert.ok(Math.abs(+a - b) < eps, `${a} ≈ ${b}`);

before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;`);
  for (const f of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into auth.users values ('${uid(1)}'),('${uid(2)}');
    insert into public.perfiles(id,nombre,rol) values ('${uid(1)}','Admin','administracion'),('${uid(2)}','Consulta','consulta');
    set role authenticated; set request.jwt.claim.sub = '${uid(1)}';`);
  await db.exec(await readFile(new URL('../supabase/tests/recorrido.sql', import.meta.url), 'utf8'));
  // Sin el pago antiguo del recorrido: aquí se paga con giros
  await db.exec(`delete from public.pagos;`);
});
after(async () => { await db?.close(); });

const PF1 = uid(111), PF2 = uid(112), FAC = uid(201);
async function pagarFactura() {
  await db.exec(`insert into public.giros(id,tipo,proveedor,proforma_id,fecha,banco,moneda,importe,tipo_cambio)
      values ('${uid(3001)}','anticipo','DEMO','${PF1}','2026-01-02','BANCO DEMO','USD',300,6.96);
    insert into public.giros_factura(giro_id,factura_id,importe) values ('${uid(3001)}','${FAC}',300);
    insert into public.giros(id,tipo,proveedor,factura_id,fecha,banco,moneda,importe,tipo_cambio)
      values ('${uid(3002)}','cancelacion','DEMO','${FAC}','2026-02-01','BANCO DEMO','USD',1000,9.99);`);
}
async function cargarGastos() {
  const c = async n => (await one(`select id from public.conceptos_gasto where nombre='${n}'`)).id;
  await db.exec(`insert into public.gastos(id,factura_id,concepto_id,tipo_documento,importe_bs) values
    ('${uid(4001)}','${FAC}','${await c('Diferencia de cambio')}','RECIBO',22),
    ('${uid(4002)}','${FAC}','${await c('Comisión agencia')}','FACTURA',1000),
    ('${uid(4003)}','${FAC}','${await c('IVA importación')}','DIM',500),
    ('${uid(4004)}','${FAC}','${await c('GAC')}','DIM',330);`);
}

test('el % al costo se sugiere por documento o concepto y se puede corregir', async () => inTx(async () => {
  await cargarGastos();
  const rows = (await db.query(`select id, por_costo_sugerido s, por_costo p, importe_costo_bs c from public.gastos order by id`)).rows;
  assert.deepEqual(rows.map(r => [+r.s, +r.p, +r.c]), [[100,100,22],[87,87,870],[0,0,0],[100,100,330]]);
  await db.exec(`update public.gastos set por_costo = 100 where id = '${uid(4002)}'`);
  const g = await one(`select por_costo_sugerido s, importe_costo_bs c from public.gastos where id='${uid(4002)}'`);
  assert.equal(+g.s, 87); assert.equal(+g.c, 1000);
}));

test('anticipo por proforma + cancelación por factura dejan la factura pagada', async () => inTx(async () => {
  await pagarFactura();
  const p = await one(`select * from public.v_control_pagos where factura_id='${FAC}'`);
  assert.equal(+p.anticipos_aplicados, 300); assert.equal(+p.cancelado, 1000);
  assert.equal(+p.saldo, 0); assert.equal(p.estado_financiero, 'PAGADO');
  near(p.pagado_bs, 300 * 6.96 + 1000 * 9.99);
  const g = await one(`select * from public.v_giros_proforma where proforma_id='${PF1}'`);
  assert.equal(+g.anticipo_esperado, 270); assert.equal(+g.girado, 300); assert.equal(+g.disponible, 0);
}));

test('hoja de costos: CIF en Bs, paramétrica y costo unitario como en la hoja real', async () => inTx(async () => {
  await pagarFactura(); await cargarGastos();
  const c = await one(`select * from public.v_costeo where factura_id='${FAC}'`);
  near(c.cif_bs, 12078 + 22);                 // pagado en Bs + diferencia de cambio
  near(c.gastos_costo_bs, 870 + 330);          // IVA al 0 %, factura al 87 %
  near(c.tc_efectivo, 12100 / 1300);
  near(c.parametrica, (12100 + 1200) / 12100);
  const l = await one(`select * from public.v_costeo_lotes where detalle_factura_id='${uid(401)}'`);
  near(l.costo_unitario_bs, 13300 / 130);
  const t = await one(`select sum(costo_total_bs) s from public.v_costeo_lotes where factura_id='${FAC}'`);
  near(t.s, 13300, 1e-3);
}));

test('factura sin pagar del todo: sin CIF hasta indicar un TC para el saldo', async () => inTx(async () => {
  await db.exec(`insert into public.giros(id,tipo,proveedor,proforma_id,fecha,moneda,importe,tipo_cambio)
      values ('${uid(3001)}','anticipo','DEMO','${PF1}','2026-01-02','USD',300,6.96);
    insert into public.giros_factura(giro_id,factura_id,importe) values ('${uid(3001)}','${FAC}',300);`);
  assert.equal((await one(`select cif_bs from public.v_costeo where factura_id='${FAC}'`)).cif_bs, null);
  await db.exec(`insert into public.costeos(factura_id,tipo_cambio_manual) values ('${FAC}',10)`);
  near((await one(`select cif_bs from public.v_costeo where factura_id='${FAC}'`)).cif_bs, 300 * 6.96 + 1000 * 10);
}));

test('lotes no superan lo facturado y una hoja cerrada no se modifica', async () => inTx(async () => {
  await db.exec(`insert into public.costeos(id,factura_id,condicion_entrega) values ('${uid(5001)}','${FAC}','CIF');
    insert into public.costeo_lotes(costeo_id,detalle_factura_id,lote,cantidad) values
      ('${uid(5001)}','${uid(401)}','L1',60),('${uid(5001)}','${uid(401)}','L2',40);`);
  const lots = await one(`select count(*) n, sum(cantidad) q from public.v_costeo_lotes where detalle_factura_id='${uid(401)}'`);
  assert.equal(+lots.n, 2); assert.equal(+lots.q, 100);
  await fails(`insert into public.costeo_lotes(costeo_id,detalle_factura_id,lote,cantidad) values ('${uid(5001)}','${uid(401)}','L3',1)`, /superan la cantidad facturada/);
  await db.exec(`update public.costeos set estado='cerrado', cerrado_en=now() where id='${uid(5001)}'`);
  await fails(`update public.costeo_lotes set cantidad=50 where lote='L1'`, /está cerrada/);
  const c = (await one(`select id from public.conceptos_gasto where nombre='GAC'`)).id;
  await fails(`insert into public.gastos(factura_id,concepto_id,tipo_documento,importe_bs) values ('${FAC}','${c}','DIM',1)`, /está cerrada/);
}));

test('no se aplica más de lo girado ni una cancelación como anticipo', async () => inTx(async () => {
  await pagarFactura();
  await fails(`update public.giros_factura set importe = 301 where giro_id='${uid(3001)}'`, /supera el importe del anticipo/);
  await fails(`insert into public.giros_factura(giro_id,factura_id,importe) values ('${uid(3002)}','${FAC}',1)`, /Solo se aplican anticipos/);
  await db.exec(`insert into public.proveedores(nombre) values ('OTRO')`);
  await fails(`insert into public.giros(tipo,proveedor,proforma_id,fecha,moneda,importe) values ('anticipo','OTRO','${PF1}','2026-01-01','USD',5)`, /proveedor de la proforma/);
}));

test('planificación: pronóstico, en camino, alerta y cantidad sugerida redondeada a cajas', async () => inTx(async () => {
  await db.exec(`update public.proveedores set lead_time_dias = 60 where nombre='DEMO';
    insert into public.productos_complemento(id,proveedor,unidades_por_caja,cantidad_minima) values ('${uid(101)}','DEMO',10,50);`);
  const meses = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-01`);
  const ventas = JSON.stringify([...meses.map(mes => ({ codigo: 'DEMO-001', sucursal: 'Cochabamba', mes, cantidad: 30 })),
    { codigo: 'NO-EXISTE', sucursal: 'COCHABAMBA', mes: '2026-12-01', cantidad: 1 }]);
  const r = await one(`select public.importar_planificacion('ventas','${ventas}'::jsonb) r`);
  assert.equal(r.r.importadas, 12); assert.deepEqual(r.r.sin_producto, ['NO-EXISTE']);
  await db.exec(`select public.importar_planificacion('existencias','${JSON.stringify([
    { codigo: 'DEMO-001', almacen: 'COCHABAMBA', fecha: '2026-12-31', cantidad: 20 },
    { codigo: 'DEMO-001', almacen: 'SANTA CRUZ', fecha: '2026-12-31', cantidad: 10 }])}'::jsonb)`);
  const p = await one(`select * from public.v_planificacion where codigo='DEMO-001'`);
  assert.equal(+p.pronostico_mensual, 30); assert.equal(+p.stock_total, 30);
  assert.equal(+p.en_camino, 90);           // 60 + 30 pendientes de llegar en las dos proformas
  near(p.punto_pedido, 90);
  assert.equal(p.alerta, 'PEDIR PRONTO');
  assert.equal(+p.cantidad_sugerida, 60);
}));

test('la proforma sugerida guarda lo sugerido y no cuenta como pedido hasta confirmarse', async () => inTx(async () => {
  const id = (await one(`select public.crear_proforma_sugerida('{"proveedor":"DEMO","numero":"SUG-1"}'::jsonb,
    '[{"producto_id":"${uid(101)}","cantidad":70,"cantidad_sugerida":60,"pronostico_mensual":30}]'::jsonb) id`)).id;
  const p = await one(`select estado from public.proformas where id='${id}'`);
  assert.equal(p.estado, 'sugerida');
  assert.equal(+(await one(`select pedido_vigente from public.v_forecast_producto where codigo='DEMO-001'`)).pedido_vigente, 150);
  await db.exec(`update public.proformas set estado='confirmada' where id='${id}'`);
  assert.equal(+(await one(`select pedido_vigente from public.v_forecast_producto where codigo='DEMO-001'`)).pedido_vigente, 220);
  const d = await one(`select cantidad_sugerida, cantidad_pedida from public.detalles_proforma where proforma_id='${id}'`);
  assert.equal(+d.cantidad_sugerida, 60); assert.equal(+d.cantidad_pedida, 70);
}));

test('consulta ve pagos y costos pero no registra; anónimo no ve nada', async () => {
  await db.exec(`set request.jwt.claim.sub='${uid(2)}'`);
  try {
    await db.exec('begin');
    try {
      await one('select count(*) from public.v_costeo');
      await fails(`insert into public.giros(tipo,proveedor,proforma_id,fecha,moneda,importe) values ('anticipo','DEMO','${PF1}','2026-01-01','USD',1)`, /row-level security/);
      await fails(`select public.guardar_gastos('${FAC}','[]'::jsonb)`, /administración/);
    } finally { await db.exec('rollback'); }
    await db.exec('reset role; set role anon');
    await inTx(async () => { await fails('select * from public.v_costeo', /permission denied/); await fails('select * from public.gastos', /permission denied/); });
  } finally { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid(1)}'`); }
});

test('factura desde proformas: cada línea queda asignada aunque traiga más cantidad o otro packing', async () => inTx(async () => {
  const id = (await one(`select public.crear_documento('factura',
    '{"proveedor":"DEMO","numero":"FAC-DESDE-PF","fecha_emision":"2026-03-01","moneda":"USD","importe_documento":"237.5"}'::jsonb,
    '[{"producto_id":"${uid(101)}","cantidad":"25","unidad":"CAJA","packing":"12 x 10","precio_unitario":"9.5","referencia_proforma_documento":"PF-DEMO-2",
       "asignaciones":[{"detalle_proforma_id":"${uid(302)}","cantidad":"25"}]}]'::jsonb) id`)).id;
  await db.exec('set constraints all immediate');
  const a = await one(`select a.facturado as cantidad, a.diferencia_packing, a.diferencia_precio from public.v_asignaciones a
    join public.detalles_factura d on d.id = a.detalle_factura_id where d.factura_id = '${id}'`);
  assert.equal(+a.cantidad, 25); assert.equal(a.diferencia_packing, true); assert.equal(a.diferencia_precio, true);
  const f = await one(`select facturado, exceso_facturado from public.v_forecast_proforma where detalle_proforma_id = '${uid(302)}'`);
  assert.equal(+f.facturado, 65); assert.equal(+f.exceso_facturado, 15);
}));
