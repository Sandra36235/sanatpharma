// Datos ficticios solo disponibles en desarrollo con ?ejemplo=1. Nunca se envían a Supabase.
import { TABLES } from './lib';
export function demoData() {
  const d=Object.fromEntries(TABLES.map(t=>[t,[]]));
  d.perfiles=[{id:'demo',nombre:'Vista de ejemplo',rol:'administracion',activo:true}];
  const names=[['DEMO-001','Producto de ejemplo A','Caja de 30 tabletas',150,130,60,30,70,10],['DEMO-002','Producto de ejemplo B','Frasco de 100 ml',200,120,0,80,120,0],['DEMO-003','Producto de ejemplo C','Caja de 10 sobres',80,80,80,0,0,0],['DEMO-004','Producto de ejemplo D','Caja de 20 cápsulas',100,0,0,100,0,0]];
  d.productos=names.map(([codigo,nombre,presentacion],i)=>({id:'p'+i,codigo,nombre,presentacion,estado:'ACTIVO'}));
  d.v_forecast_producto=names.map(([codigo,nombre,presentacion,pedido_vigente,facturado,recibido,pendiente_facturar,pendiente_recepcion,sin_asignar],i)=>({producto_id:'p'+i,codigo,nombre,presentacion,unidad:'CAJA',pedido_vigente,facturado,recibido,pendiente_facturar,pendiente_recepcion,sin_asignar,exceso_facturado:0,recibido_sin_aplicar:0}));
  d.proformas=[{id:'pf1',proveedor:'Proveedor de ejemplo',numero:'PF-DEMO-01',fecha_documento:'2026-08-20',moneda:'USD'},{id:'pf2',proveedor:'Proveedor de ejemplo',numero:'PF-DEMO-02',fecha_documento:'2026-09-15',moneda:'USD'}];
  d.facturas=[{id:'f1',proveedor:'Proveedor de ejemplo',numero:'FAC-DEMO-01',fecha_emision:'2026-09-25',moneda:'USD',importe_documento:1300}];
  d.detalles_proforma=d.productos.map((p,i)=>({id:'dp'+i,proforma_id:i%2?'pf2':'pf1',producto_id:p.id,numero_linea:i+1,cantidad_pedida:i===0?100:names[i][3],cantidad_cancelada:0,unidad:'CAJA',precio_unitario:9,packing:'10 cajas'}));
  d.detalles_proforma.push({id:'dp4',proforma_id:'pf2',producto_id:'p0',numero_linea:5,cantidad_pedida:50,cantidad_cancelada:0,unidad:'CAJA',precio_unitario:9,packing:'10 cajas'});
  d.v_forecast_proforma=d.detalles_proforma.map((l)=>{const i=Number(l.producto_id.slice(1)),a=l.id==='dp0'?80:l.id==='dp4'?40:names[i][4],r=l.id==='dp0'?40:l.id==='dp4'?20:names[i][5];return {...d.v_forecast_producto[i],detalle_proforma_id:l.id,proforma_id:l.proforma_id,proforma:d.proformas.find(p=>p.id===l.proforma_id).numero,pedido_vigente:l.cantidad_pedida,facturado:a,recibido:r,pendiente_facturar:l.cantidad_pedida-a,facturado_pendiente_recepcion:a-r,sin_asignar:0};});
  d.detalles_factura=[{id:'df1',factura_id:'f1',producto_id:'p0',numero_linea:1,cantidad:130,unidad:'CAJA',packing:'12 cajas',precio_unitario:10,referencia_proforma_documento:'PF-DEMO-01'}];
  d.v_forecast_factura=[{...d.v_forecast_producto[0],detalle_factura_id:'df1',factura_id:'f1',factura:'FAC-DEMO-01',cochabamba_estimada:'2026-11-15',salida_real:'2026-10-05',numero_bl:'BL-DEMO-001',estado_logistico:'EN TRANSITO',exceso_recibido:0}];
  d.embarques=[{id:'e1',factura_id:'f1',numero_bl:'BL-DEMO-001',salida_real:'2026-10-05',cochabamba_estimada:'2026-11-15'}];
  d.v_control_pagos=[{factura_id:'f1',numero:'FAC-DEMO-01',moneda:'USD',importe_documento:1300,anticipo_requerido:390,pagado:390,saldo:910,anticipo_pendiente:0,estado_financiero:'PLAZO POR CONFIRMAR',diferencia_importe_documento:0}];
  d.pagos=[{id:'pa1',factura_id:'f1',fecha:'2026-09-26',importe:390,referencia:'Anticipo de ejemplo'}];
  d.detalles_factura[0].cantidad=100;
  d.detalles_factura.push({...d.detalles_factura[0],id:'df2',numero_linea:2,cantidad:20,referencia_proforma_documento:'PF-DEMO-02'}, {...d.detalles_factura[0],id:'df3',numero_linea:3,cantidad:10,referencia_proforma_documento:'Por confirmar'});
  d.facturas.push({id:'f2',proveedor:'Proveedor de ejemplo',numero:'FAC-DEMO-02',fecha_emision:'2026-09-10',moneda:'USD',importe_documento:2000});
  for(const [i,q] of [[1,120],[2,80]])d.detalles_factura.push({id:'df'+(i+3),factura_id:'f2',producto_id:'p'+i,numero_linea:i,cantidad:q,unidad:'CAJA',precio_unitario:10,packing:'10 cajas'});
  d.asignaciones=[{id:'a1',detalle_proforma_id:'dp0',detalle_factura_id:'df1',cantidad:80},{id:'a2',detalle_proforma_id:'dp4',detalle_factura_id:'df1',cantidad:20},{id:'a3',detalle_proforma_id:'dp4',detalle_factura_id:'df2',cantidad:20},{id:'a4',detalle_proforma_id:'dp1',detalle_factura_id:'df4',cantidad:120},{id:'a5',detalle_proforma_id:'dp2',detalle_factura_id:'df5',cantidad:80}];
  d.v_asignaciones=d.asignaciones.map(a=>{const p=d.detalles_proforma.find(p=>p.id===a.detalle_proforma_id),f=d.detalles_factura.find(f=>f.id===a.detalle_factura_id);return {...a,proforma_id:p.proforma_id,factura_id:f.factura_id,producto_id:p.producto_id,unidad:'CAJA',facturado:a.cantidad,recibido:a.id==='a1'?40:a.id==='a3'?20:a.id==='a5'?80:0,diferencia_precio:true,diferencia_packing:p.packing!==f.packing};});
  d.v_forecast_factura=d.detalles_factura.map(f=>{const p=d.productos.find(p=>p.id===f.producto_id),a=d.v_asignaciones.filter(a=>a.detalle_factura_id===f.id),recibido=a.reduce((n,a)=>n+a.recibido,0),asignado=a.reduce((n,a)=>n+a.facturado,0);return {...f,...p,producto_id:p.id,detalle_factura_id:f.id,factura_id:f.factura_id,factura:d.facturas.find(d=>d.id===f.factura_id).numero,facturado:f.cantidad,recibido,pendiente_recepcion:f.cantidad-recibido,sin_asignar:f.cantidad-asignado,recibido_sin_aplicar:0,exceso_recibido:0,cochabamba_estimada:'2026-11-15',estado_logistico:recibido>=f.cantidad?'RECIBIDO':recibido?'RECEPCION PARCIAL':'EN TRANSITO'};});
  d.v_control_pagos.push({factura_id:'f2',numero:'FAC-DEMO-02',moneda:'USD',importe_documento:2000,anticipo_requerido:600,pagado:0,saldo:2000,anticipo_pendiente:600,estado_financiero:'PLAZO POR CONFIRMAR',diferencia_importe_documento:0});
  d.embarques.push({id:'e2',factura_id:'f2',numero_bl:'BL-DEMO-002',salida_real:'2026-09-20',cochabamba_estimada:'2026-10-20'});
  d.recepciones=[{id:'r1',embarque_id:'e1',fecha_real:'2026-10-25',almacen:'Ejemplo',documento:'REC-DEMO-01'},{id:'r2',embarque_id:'e2',fecha_real:'2026-10-20',almacen:'Ejemplo',documento:'REC-DEMO-02'}];
  d.detalles_recepcion=[{id:'dr1',recepcion_id:'r1',detalle_factura_id:'df1',cantidad_recibida:40},{id:'dr2',recepcion_id:'r1',detalle_factura_id:'df2',cantidad_recibida:20},{id:'dr3',recepcion_id:'r2',detalle_factura_id:'df5',cantidad_recibida:80}];
  d.aplicaciones_recepcion=[{id:'ar1',detalle_recepcion_id:'dr1',asignacion_id:'a1',cantidad:40},{id:'ar2',detalle_recepcion_id:'dr2',asignacion_id:'a3',cantidad:20},{id:'ar3',detalle_recepcion_id:'dr3',asignacion_id:'a5',cantidad:80}];
  return d;
}
