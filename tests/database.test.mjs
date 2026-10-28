import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
let setupSQL;
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function scalar(sql) { return (await db.query(sql)).rows[0]; }
async function rejected(sql, pattern) {
  await db.exec('begin');
  try {
    await assert.rejects(async () => { await db.exec(sql); await db.exec('set constraints all immediate'); }, pattern);
  } finally { await db.exec('rollback'); }
}
before(async () => {
  db = new PGlite();
  // Emula solo los contratos de Auth/Storage que utiliza la migración.
  // No sustituye la comprobación de API/Storage en el proyecto Supabase real.
  setupSQL = `create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;`;
  await db.exec(setupSQL);
  for (const f of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into auth.users values ('${uid(1)}'),('${uid(2)}'),('${uid(3)}');
    insert into public.perfiles(id,nombre,rol) values
    ('${uid(1)}','Administradora de prueba','administracion'),('${uid(2)}','Consulta de prueba','consulta');
    set role authenticated; set request.jwt.claim.sub = '${uid(1)}';`);
  await db.exec(await readFile(new URL('../supabase/tests/recorrido.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });

test('proformas múltiples, factura compartida y recepción parcial sin duplicar totales', async () => {
  const a = await scalar(`select * from public.v_forecast_producto where codigo = 'DEMO-001'`);
  assert.equal(+a.pedido_vigente, 150);
  assert.equal(+a.facturado, 130);
  assert.equal(+a.recibido, 60);
  assert.equal(+a.pendiente_facturar, 30);
  assert.equal(+a.pendiente_recepcion, 70);
  assert.equal(+a.sin_asignar, 10);
  assert.equal(+a.recibido_sin_aplicar, 0);
  const lines = (await db.query('select * from public.v_forecast_proforma order by proforma')).rows;
  assert.deepEqual(lines.map(x => [+x.facturado, +x.recibido]), [[80,40],[40,20]]);
});
test('precio y packing se conservan y las diferencias son visibles', async () => {
  const a = await scalar('select bool_and(diferencia_precio) precio, bool_and(diferencia_packing) packing from public.v_asignaciones');
  assert.equal(a.precio, true); assert.equal(a.packing, true);
});
test('30% es anticipo; pago real y plazo desconocido separados', async () => {
  const a = await scalar('select * from public.v_control_pagos');
  assert.equal(+a.importe_documento, 1300); assert.equal(+a.anticipo_requerido, 390);
  assert.equal(+a.pagado,390); assert.equal(+a.saldo,910);
  assert.equal(a.estado_financiero,'PLAZO POR CONFIRMAR');
});
test('ETA no implica recepción ni salida real', async () => {
  const a = await scalar(`select estado_logistico from public.v_forecast_factura where referencia_proforma_documento = 'DESCONOCIDA'`);
  assert.equal(a.estado_logistico,'SALIDA POR CONFIRMAR');
});
test('no permite asignar dos veces la misma cantidad, ni reducir padre por debajo de asignaciones', async () => {
  await rejected(`update public.asignaciones set cantidad=101 where id='${uid(501)}'`, /supera la cantidad facturada/);
  await rejected(`update public.detalles_factura set cantidad=70 where id='${uid(401)}'`, /supera la cantidad facturada/);
});
test('no permite cambiar producto/unidad después de asignar', async () => {
  await rejected(`update public.detalles_factura set unidad='UNIDAD' where id='${uid(401)}'`, /mismo producto, unidad y proveedor/);
});
test('no permite aplicar una recepción dos veces ni reducir su cantidad ya aplicada', async () => {
  await rejected(`update public.aplicaciones_recepcion set cantidad=41 where id='${uid(801)}'`, /supera la cantidad recibida/);
  await rejected(`update public.detalles_recepcion set cantidad_recibida=39 where id='${uid(701)}'`, /supera la cantidad recibida/);
});
test('no permite trasladar una recepción a una factura diferente', async () => {
  await rejected(`insert into public.facturas(id,proveedor,numero,fecha_emision,moneda,importe_documento)
    values ('${uid(999)}','DEMO','F-OTRA','2026-01-01','USD',0);
    update public.embarques set factura_id='${uid(999)}' where id='${uid(601)}'`, /misma factura/);
});
test('exceso facturado se registra como discrepancia comercial', async () => {
  await db.exec('begin');
  try {
    await db.exec(`update public.detalles_proforma set cantidad_pedida=70 where id='${uid(301)}'; set constraints all immediate;`);
    const a = await scalar(`select exceso_facturado from public.v_forecast_proforma where detalle_proforma_id='${uid(301)}'`);
    assert.equal(+a.exceso_facturado,10);
  } finally { await db.exec('rollback'); }
});
test('recepción en exceso y recepción sin conciliar permanecen visibles', async () => {
  await db.exec('begin');
  try {
    await db.exec(`update public.detalles_recepcion set cantidad_recibida=110 where id='${uid(701)}'; set constraints all immediate;`);
    const a=await scalar(`select exceso_recibido, recibido_sin_aplicar from public.v_forecast_factura where detalle_factura_id='${uid(401)}'`);
    assert.equal(+a.exceso_recibido,10); assert.equal(+a.recibido_sin_aplicar,70);
  } finally { await db.exec('rollback'); }
});
test('unidades distintas nunca se suman como una sola cantidad', async () => {
  await db.exec('begin');
  try {
    await db.exec(`insert into public.detalles_factura(factura_id,producto_id,numero_linea,cantidad,unidad,precio_unitario)
      values ('${uid(201)}','${uid(101)}',4,5,'UNIDAD',1); set constraints all immediate;`);
    assert.equal((await db.query(`select * from public.v_forecast_producto where codigo='DEMO-001'`)).rows.length,2);
  } finally { await db.exec('rollback'); }
});
test('gerencia consulta pero no registra; tampoco puede elevar su rol ni alterar historial', async () => {
  await db.exec(`set request.jwt.claim.sub='${uid(2)}'`);
  try {
    assert.equal(+(await scalar('select count(*) n from public.v_forecast_factura')).n,3);
    await rejected(`insert into public.productos(codigo,nombre) values ('PROHIBIDO','Prueba')`, /row-level security/);
    await rejected(`update public.perfiles set rol='administracion' where id='${uid(2)}'`, /permission denied/);
    await rejected('delete from public.historial', /permission denied/);
    assert.equal(+(await scalar(`with t as (update public.facturas set numero='PROHIBIDO' returning id) select count(*) n from t`)).n,0);
  } finally { await db.exec(`set request.jwt.claim.sub='${uid(1)}'`); }
});
test('usuario sin perfil y usuario desactivado no ven datos, tampoco mediante vistas', async () => {
  await db.exec(`set request.jwt.claim.sub='${uid(3)}'`);
  assert.equal(+(await scalar('select count(*) n from public.v_forecast_producto')).n,0);
  await rejected(`insert into public.productos(codigo,nombre) values ('PROHIBIDO','Prueba')`, /row-level security/);
  await db.exec('reset role');
  await db.exec(`update public.perfiles set activo=false where id='${uid(2)}'; set role authenticated; set request.jwt.claim.sub='${uid(2)}'`);
  assert.equal(+(await scalar('select count(*) n from public.v_control_pagos')).n,0);
  await db.exec(`set request.jwt.claim.sub='${uid(1)}'`);
});
test('anónimo no tiene privilegios sobre tablas ni vistas', async () => {
  await db.exec('reset role; set role anon');
  try {
    await rejected('select * from public.productos', /permission denied/);
    await rejected('select * from public.v_forecast_producto', /permission denied/);
  } finally { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid(1)}'`); }
});
test('todas las tablas de control tienen RLS y la secuencia del historial es privada', async () => {
  await db.exec('reset role');
  try {
    assert.equal(+(await scalar(`select count(*) n from pg_tables where schemaname in ('public','control_privado') and not rowsecurity`)).n,0);
    const a=await scalar(`select has_sequence_privilege('anon','public.historial_id_seq','USAGE') anon, has_sequence_privilege('authenticated','public.historial_id_seq','USAGE') autenticado`);
    assert.equal(a.anon,false); assert.equal(a.autenticado,false);
  } finally { await db.exec(`set role authenticated; set request.jwt.claim.sub='${uid(1)}'`); }
});
test('fechas reales y estimadas quedan auditadas y separadas', async () => {
  await db.exec(`update public.embarques set salida_real='2026-01-05' where id='${uid(601)}'`);
  const a=await scalar(`select anterior, nuevo, usuario_id from public.historial where tabla='embarques' and operacion='UPDATE' order by id desc limit 1`);
  assert.equal(a.anterior.salida_real,null); assert.equal(a.nuevo.salida_real,'2026-01-05');
  assert.equal(a.nuevo.cochabamba_estimada,'2026-02-10'); assert.equal(a.usuario_id,uid(1));
});
test('PDF privado: solo personal autorizado accede a rutas registradas; consulta no sube', async () => {
  const route=`${uid(901)}/prueba.pdf`;
  await db.exec(`insert into public.adjuntos(id,factura_id,nombre,ruta) values ('${uid(901)}','${uid(201)}','prueba.pdf','${route}');
    insert into storage.objects(bucket_id,name) values ('documentos-control','${route}');`);
  await rejected(`insert into storage.objects(bucket_id,name) values ('documentos-control','sin-registro.pdf')`, /row-level security/);
  await rejected(`update public.adjuntos set nombre='otro.pdf'`, /permission denied/);
  await db.exec(`reset role; update public.perfiles set activo=true where id='${uid(2)}'; set role authenticated; set request.jwt.claim.sub='${uid(2)}'`);
  assert.equal(+(await scalar('select count(*) n from storage.objects')).n,1);
  await rejected(`insert into storage.objects(bucket_id,name) values ('documentos-control','${route}')`, /row-level security/);
  await db.exec(`set request.jwt.claim.sub='${uid(3)}'`);
  assert.equal(+(await scalar('select count(*) n from storage.objects')).n,0);
  await db.exec(`set request.jwt.claim.sub='${uid(1)}'`);
});
test('el script de verificación del proyecto revierte todos los datos de prueba', async () => {
  const sandbox = new PGlite();
  try {
    await sandbox.exec(setupSQL);
    for (const f of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
      await sandbox.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
    }
    const results=await sandbox.exec(await readFile(new URL('../supabase/tests/verificar_proyecto.sql', import.meta.url),'utf8'));
    const r=results.at(-1).rows[0];
    assert.match(r.resultado,/APROBADO/);
    assert.equal(+r.productos_guardados,0);
    assert.equal(+r.facturas_guardadas,0);
    assert.equal(+r.historial_guardado,0);
  } finally { await sandbox.close(); }
});
