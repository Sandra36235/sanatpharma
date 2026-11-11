// Fases 2 a 4: planificación (pedido sugerido), proveedores, pagos por giros y hoja de costos.
import React, { useMemo, useState } from 'react';
import { BellRing, AlarmClock, ShieldCheck, CircleSlash, Plus, Upload, Download, Settings2, Wallet, Landmark, ReceiptText, ArrowLeft, Lock, Unlock, Calculator, Trash2, Building2, PackagePlus, Pencil } from 'lucide-react';
import { exampleMode, number, money, date, today, rpc, save, remove, insertMany, downloadCSV, parseTable, toNumber, toDate, pct, bs, dec } from './lib';
import { Badge, Field, Empty, Button, SearchBox, FormFooter, Metrics, sum, byId } from './ui';

const INCOTERMS=['EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DDP'];
const CURRENCIES=['USD','BOB','EUR','INR','CNY'];
const ALERT_TONE={'PEDIR YA':'red','PEDIR PRONTO':'amber','CUBIERTO':'green','SIN VENTAS':''};
const ESTADOS_PROFORMA=['sugerida','enviada','confirmada','cerrada'];
export const ESTADO_LABEL={sugerida:'Sugerida',enviada:'Enviada',confirmada:'Confirmada',cerrada:'Cerrada'};
const blank=v=>v===''||v==null?null:v;
const numOrNull=v=>v===''||v==null?null:Number(v);

// ───────────────────────────── Planificación ─────────────────────────────
export function Planning({data,admin,open}){
  const rows=data.v_planificacion||[];
  const [filter,setFilter]=useState('accion'),[prov,setProv]=useState(''),[q,setQ]=useState(''),[sel,setSel]=useState({});
  const providers=[...new Set(rows.map(r=>r.proveedor).filter(Boolean))].sort();
  const count=a=>rows.filter(r=>r.alerta===a).length;
  const visible=rows.filter(r=>(filter==='all'||(filter==='accion'?['PEDIR YA','PEDIR PRONTO'].includes(r.alerta):r.alerta===filter))&&(!prov||r.proveedor===prov)&&`${r.codigo} ${r.codigo_nuevo||''} ${r.nombre}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=>(a.alerta==='PEDIR YA'?0:a.alerta==='PEDIR PRONTO'?1:2)-(b.alerta==='PEDIR YA'?0:b.alerta==='PEDIR PRONTO'?1:2)||(+a.cobertura_dias||1e9)-(+b.cobertura_dias||1e9));
  const cut=rows.reduce((m,r)=>r.fecha_corte&&r.fecha_corte>m?r.fecha_corte:m,'');
  const hasSales=rows.some(r=>+r.pronostico_mensual>0);
  const picked=Object.entries(sel).filter(([,v])=>v!=null).map(([id,cantidad])=>({...rows.find(r=>r.producto_id===id),cantidad}));
  const pickedProviders=[...new Set(picked.map(p=>p.proveedor))];
  const toggle=r=>setSel(s=>({...s,[r.producto_id]:s[r.producto_id]!=null?null:(+r.cantidad_sugerida||+r.cantidad_minima||0)}));
  const params=data.parametros_planificacion?.[0]||{};
  return <>
    <Metrics items={[['Pedir ya',count('PEDIR YA'),BellRing,'Stock + en camino no alcanza para el lead time'],['Pedir pronto',count('PEDIR PRONTO'),AlarmClock,`Entran en alerta en ${params.dias_aviso??30} días`],['Cubiertos',count('CUBIERTO'),ShieldCheck,'Con stock suficiente'],['Sin ventas',count('SIN VENTAS'),CircleSlash,'Sin historia de ventas cargada']]}/>
    {(!cut||!hasSales)&&<div className="inline-note planning-note">{!hasSales?'Todavía no hay ventas cargadas. ':''}{!cut?'Todavía no hay existencias cargadas. ':''}Exporta de ONIX las existencias (Cochabamba y Santa Cruz) y las ventas por mes, e impórtalas aquí para que el pedido sugerido tenga con qué calcular.</div>}
    <div className="panel"><div className="panel-title"><div><h2>Pedido sugerido <span className="count">{visible.length}</span></h2><p>Stock de ambas sucursales, lo que viene en camino y la venta pronosticada frente al lead time de cada proveedor.{cut&&<> Existencias al {date(cut)}.</>}</p></div>
      <div className="title-actions">{admin&&<><Button secondary icon={Upload} onClick={()=>open('import','existencias')}>Existencias</Button><Button secondary icon={Upload} onClick={()=>open('import','ventas')}>Ventas</Button></>}<Button secondary icon={Download} disabled={!visible.length} onClick={()=>downloadCSV('pedido-sugerido.csv',visible.map(r=>({codigo:r.codigo,codigo_nuevo:r.codigo_nuevo,producto:r.nombre,proveedor:r.proveedor,stock_cbba:r.stock_cbba,stock_scz:r.stock_scz,en_camino:r.en_camino,venta_mensual:r.pronostico_mensual,cobertura_dias:r.cobertura_dias,lead_time:r.lead_time_dias,punto_pedido:r.punto_pedido,alerta:r.alerta,sugerido:r.cantidad_sugerida})))}>Exportar</Button></div></div>
      <div className="filterbar"><div className="segments">{[['accion','Para pedir'],['PEDIR YA','Pedir ya'],['PEDIR PRONTO','Pronto'],['CUBIERTO','Cubiertos'],['SIN VENTAS','Sin ventas'],['all','Todos']].map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}</div><SearchBox value={q} onChange={setQ}/><select aria-label="Proveedor" value={prov} onChange={e=>setProv(e.target.value)}><option value="">Todos los proveedores</option>{providers.map(p=><option key={p}>{p}</option>)}</select></div>
      {visible.length?<div className="table-scroll"><table><thead><tr>{admin&&<th/>}<th>Producto</th><th>Proveedor</th><th className="num">Stock Cbba</th><th className="num">Stock Scz</th><th className="num">En camino</th><th className="num">Venta / mes</th><th className="num">Cobertura</th><th>Se acaba</th><th className="num">Lead time</th><th>Alerta</th><th className="num">Sugerido</th></tr></thead><tbody>{visible.map(r=><tr key={r.producto_id} className={sel[r.producto_id]!=null?'row-selected':''}>
        {admin&&<td><input type="checkbox" aria-label={`Incluir ${r.codigo}`} checked={sel[r.producto_id]!=null} onChange={()=>toggle(r)}/></td>}
        <td><strong>{r.nombre}</strong><small>{r.codigo}{r.codigo_nuevo?' · '+r.codigo_nuevo:''}</small></td><td>{r.proveedor||<span className="muted">Sin proveedor</span>}</td>
        <td className="num">{number(r.stock_cbba)}</td><td className="num">{number(r.stock_scz)}</td><td className="num">{number(r.en_camino)}</td><td className="num">{dec(r.pronostico_mensual,1)}</td>
        <td className="num">{r.cobertura_dias==null?'—':`${number(Math.round(r.cobertura_dias))} d`}</td><td>{r.fecha_quiebre?date(r.fecha_quiebre):'—'}</td><td className="num">{r.lead_time_dias} d</td>
        <td><Badge tone={ALERT_TONE[r.alerta]}>{r.alerta}</Badge></td>
        <td className="num">{sel[r.producto_id]!=null?<input className="qty-input" type="number" min="0" aria-label={`Cantidad ${r.codigo}`} value={sel[r.producto_id]} onChange={e=>setSel({...sel,[r.producto_id]:e.target.value})}/>:<strong>{number(r.cantidad_sugerida)}</strong>}</td></tr>)}</tbody></table></div>
        :<Empty title="Nada por aquí" text={rows.length?'Cambia el filtro para ver otros productos.':'Marca productos con «forecast» en el catálogo para que aparezcan.'}/>}
      {admin&&picked.length>0&&<div className="selection-bar"><span>{picked.length} productos seleccionados · {number(sum(picked,'cantidad'))} unidades</span>{pickedProviders.length>1&&<span className="pending">Elige productos de un solo proveedor para armar la proforma.</span>}<Button icon={PackagePlus} disabled={pickedProviders.length!==1||!pickedProviders[0]} onClick={()=>open('suggest',{proveedor:pickedProviders[0],lineas:picked})}>Crear proforma sugerida</Button></div>}
      <div className="table-note"><span><i className="legend-dot"/>Sugerido = venta diaria × (lead time + {params.dias_seguridad??30} días de seguridad + {params.dias_cobertura??90} días de cobertura) − stock − en camino, redondeado a cajas.</span>{admin&&<button className="text-button" onClick={()=>open('params')}><Settings2 size={14}/>Parámetros</button>}</div>
    </div>
    <div className="panel model-panel"><div className="panel-title"><div><h2>Cómo calcula</h2><p>Modelo base, simple y explicable. Cuando haya historia suficiente se compara contra un modelo de ML y se queda el que acierte más.</p></div></div>
      <div className="model-grid"><div><strong>Pronóstico mensual</strong><p>{Math.round((params.peso_reciente??0.6)*100)} % el promedio de los últimos 3 meses + {Math.round((1-(params.peso_reciente??0.6))*100)} % el promedio de {params.meses_historia??12} meses.</p></div><div><strong>En camino</strong><p>Lo pedido en proformas enviadas o confirmadas que todavía no se recibió. Las sugeridas no cuentan.</p></div><div><strong>Lead time</strong><p>El del proveedor ({params.lead_time_defecto??120} días si no tiene). Luego se reemplaza por el medido con fechas reales.</p></div><div><strong>Acierto</strong><p>Cada proforma sugerida guarda lo sugerido y el pronóstico para compararlos con lo pedido y lo vendido.</p></div></div></div>
  </>;
}
export function ImportForm({kind,busy,action}){
  const [text,setText]=useState(''),[error,setError]=useState('');
  const sales=kind==='ventas';
  const rows=useMemo(()=>parseTable(text),[text]);
  const parsed=rows.map(r=>sales?{codigo:r[0],sucursal:(r[1]||'').toUpperCase().replace('CBBA','COCHABAMBA').replace('SCZ','SANTA CRUZ'),mes:toDate(r[2]),cantidad:toNumber(r[3])}:{codigo:r[0],almacen:(r[1]||'').toUpperCase().replace('CBBA','COCHABAMBA').replace('SCZ','SANTA CRUZ'),fecha:toDate(r[2]),cantidad:toNumber(r[3])});
  const bad=parsed.filter(r=>!r.codigo||!(sales?r.mes:r.fecha)||Number.isNaN(r.cantidad)||!['COCHABAMBA','SANTA CRUZ'].includes(sales?r.sucursal:r.almacen));
  async function file(f){if(!f)return;setText(await f.text());}
  return <form onSubmit={e=>{e.preventDefault();if(!parsed.length||bad.length){setError(bad.length?`${bad.length} filas no se pueden leer. Revisa el formato.`:'Pega o carga al menos una fila.');return;}
    action(async()=>{let ok=0,missing=[];for(let i=0;i<parsed.length;i+=500){const r=await rpc('importar_planificacion',{tipo:sales?'ventas':'existencias',filas:parsed.slice(i,i+500)});ok+=r.importadas;missing.push(...r.sin_producto);}return {ok,missing};},
      r=>`${number(r.ok)} filas importadas.${r.missing.length?` ${r.missing.length} códigos no existen en el catálogo: ${[...new Set(r.missing)].slice(0,12).join(', ')}${r.missing.length>12?'…':''}`:''}`);}}>
    <p>Exporta de ONIX {sales?'las ventas por producto, sucursal y mes':'el stock por producto y almacén'} y pégalo aquí (desde Excel funciona directo) o carga el CSV. Se cruza por <strong>CODIGO</strong>; si ya existe la misma fecha, se reemplaza.</p>
    <pre className="format-hint">{sales?'CODIGO ; SUCURSAL ; MES ; CANTIDAD\n8904306500481 ; COCHABAMBA ; 2026-09 ; 1250\n8904306500481 ; SANTA CRUZ ; 2026-09 ; 830':'CODIGO ; ALMACEN ; FECHA ; CANTIDAD\n8904306500481 ; COCHABAMBA ; 2026-11-10 ; 4200\n8904306500481 ; SANTA CRUZ ; 2026-11-10 ; 1900'}</pre>
    {error&&<div className="message error" role="alert">{error}</div>}
    <Field label="Datos"><textarea rows={8} value={text} onChange={e=>{setText(e.target.value);setError('');}} placeholder="Pega aquí las filas"/></Field>
    <label className="button secondary upload-button"><Upload size={16}/>Cargar CSV<input type="file" accept=".csv,.txt,text/csv" onChange={e=>file(e.target.files[0])}/></label>
    <p className="footnote">{parsed.length} filas leídas{bad.length?` · ${bad.length} con problemas (sucursal debe ser Cochabamba o Santa Cruz)`:''}.</p>
    <FormFooter busy={busy} label="Importar"/></form>;
}
export function SuggestForm({value,data,busy,action}){
  const prov=data.proveedores.find(p=>p.nombre===value.proveedor)||{};
  const [numero,setNumero]=useState(`SUG ${prov.prefijo||value.proveedor.slice(0,3).toUpperCase()} ${today()}`),[unidad,setUnidad]=useState('CAJA');
  const [lines,setLines]=useState(value.lineas.map(l=>({...l,cantidad:String(l.cantidad||'')})));
  return <form onSubmit={e=>{e.preventDefault();action(()=>rpc('crear_proforma_sugerida',{cabecera:{proveedor:value.proveedor,numero,fecha:today(),moneda:prov.moneda_habitual||'USD'},lineas:lines.filter(l=>+l.cantidad>0).map(l=>({producto_id:l.producto_id,cantidad:l.cantidad,cantidad_sugerida:l.cantidad_sugerida,pronostico_mensual:l.pronostico_mensual,unidad}))}),'Proforma sugerida creada. Revísala en Proformas y envíala al proveedor.');}}>
    <p>Proveedor <strong>{value.proveedor}</strong>{prov.incoterm?` · ${prov.incoterm}`:''}{prov.anticipo_por!=null?` · anticipo ${pct(prov.anticipo_por)}`:''}. Queda en estado «sugerida»: no cuenta como pedido hasta que la confirmes.</p>
    <div className="form-grid"><Field label="Número de la proforma"><input required value={numero} onChange={e=>setNumero(e.target.value)}/></Field><Field label="Unidad comercial"><input required value={unidad} onChange={e=>setUnidad(e.target.value)}/></Field></div>
    <div className="table-scroll"><table><thead><tr><th>Producto</th><th className="num">Sugerido</th><th className="num">A pedir</th></tr></thead><tbody>{lines.map((l,i)=><tr key={l.producto_id}><td><strong>{l.nombre}</strong><small>{l.codigo}</small></td><td className="num">{number(l.cantidad_sugerida)}</td><td className="num"><input className="qty-input" type="number" min="0" aria-label={`A pedir ${l.codigo}`} value={l.cantidad} onChange={e=>setLines(lines.map((x,j)=>j===i?{...x,cantidad:e.target.value}:x))}/></td></tr>)}</tbody></table></div>
    <FormFooter busy={busy} label="Crear proforma sugerida"/></form>;
}
export function ParamsForm({data,busy,action}){
  const p=data.parametros_planificacion?.[0]||{};const [f,setF]=useState({meses_historia:p.meses_historia??12,peso_reciente:p.peso_reciente??0.6,dias_seguridad:p.dias_seguridad??30,dias_cobertura:p.dias_cobertura??90,lead_time_defecto:p.lead_time_defecto??120,dias_aviso:p.dias_aviso??30});
  const input=(k,l,h,extra={})=><Field label={l} hint={h}><input type="number" required value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})} {...extra}/></Field>;
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('parametros_planificacion',Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Number(v)])),true),'Parámetros actualizados');}}><div className="form-grid">{input('meses_historia','Meses de historia','Entre 3 y 36',{min:3,max:36})}{input('peso_reciente','Peso de los últimos 3 meses','0 a 1 (0,6 = 60 %)',{min:0,max:1,step:'0.05'})}{input('dias_seguridad','Días de seguridad','Colchón por atrasos',{min:0})}{input('dias_cobertura','Días de cobertura del pedido','Cuánto debe durar lo que llega',{min:0})}{input('lead_time_defecto','Lead time por defecto (días)','Si el proveedor no tiene',{min:1})}{input('dias_aviso','Días de aviso','Para la alerta «pedir pronto»',{min:0})}</div><FormFooter busy={busy}/></form>;
}

// ───────────────────────────── Proveedores ─────────────────────────────
export function Suppliers({data,admin,open}){
  const [q,setQ]=useState('');const rows=data.proveedores.filter(p=>p.nombre.toLowerCase().includes(q.toLowerCase()));
  const products=n=>data.productos_complemento.filter(c=>c.proveedor===n||c.laboratorio===n).length;
  return <div className="panel"><div className="panel-title"><div><h2>Proveedores <span className="count">{rows.length}</span></h2><p>Cada proforma hereda incoterm, moneda y condición de pago de su proveedor. El lead time alimenta la alerta de compra.</p></div>{admin&&<Button icon={Plus} onClick={()=>open('supplier')}>Nuevo proveedor</Button>}</div><div className="filterbar"><SearchBox value={q} onChange={setQ} placeholder="Buscar proveedor…"/></div>
    {rows.length?<div className="table-scroll"><table><thead><tr><th>Proveedor</th><th>Prefijo</th><th>Moneda</th><th>Incoterm</th><th className="num">Lead time</th><th className="num">Anticipo</th><th>Saldo</th><th className="num">Productos</th><th>Estado</th>{admin&&<th/>}</tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.nombre}</strong><small>{p.pais||'País por completar'}</small></td><td className="code">{p.prefijo||'—'}</td><td>{p.moneda_habitual||'—'}</td><td>{p.incoterm||'—'}</td><td className="num">{p.lead_time_dias?`${p.lead_time_dias} d`:<span className="pending">Falta</span>}</td><td className="num">{pct(p.anticipo_por)}</td><td>{p.condicion_pago||(p.plazo_saldo_dias!=null?`${p.plazo_saldo_dias} días`:'—')}</td><td className="num">{products(p.nombre)}</td><td><Badge tone={p.activo?'green':''}>{p.activo?'Activo':'Inactivo'}</Badge></td>{admin&&<td><button className="text-button" onClick={()=>open('supplier',p)}>Editar</button></td>}</tr>)}</tbody></table></div>:<Empty title="Sin proveedores" text="Se crean solos al registrar documentos, o aquí."/>}</div>;
}
export function SupplierForm({value,busy,action}){
  const [f,setF]=useState({nombre:'',pais:'',moneda_habitual:'USD',prefijo:'',lead_time_dias:'',incoterm:'',anticipo_por:30,plazo_saldo_dias:'',condicion_pago:'',activo:true,observaciones:'',...value});
  const set=(k,v)=>setF({...f,[k]:v});
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('proveedores',{nombre:f.nombre.trim(),pais:blank(f.pais),moneda_habitual:blank(f.moneda_habitual),prefijo:blank(f.prefijo?.toUpperCase()),lead_time_dias:numOrNull(f.lead_time_dias),incoterm:blank(f.incoterm),anticipo_por:Number(f.anticipo_por||0),plazo_saldo_dias:numOrNull(f.plazo_saldo_dias),condicion_pago:blank(f.condicion_pago),activo:!!f.activo,observaciones:blank(f.observaciones)},value?.id),'Proveedor guardado');}}>
    <div className="form-grid three"><Field label="Nombre"><input required value={f.nombre} onChange={e=>set('nombre',e.target.value)}/></Field><Field label="País"><input value={f.pais||''} onChange={e=>set('pais',e.target.value)}/></Field><Field label="Prefijo" hint="1 a 3 letras para el código nuevo (JR)"><input maxLength={3} value={f.prefijo||''} onChange={e=>set('prefijo',e.target.value.toUpperCase())}/></Field>
      <Field label="Moneda"><select value={f.moneda_habitual||''} onChange={e=>set('moneda_habitual',e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Incoterm habitual"><select value={f.incoterm||''} onChange={e=>set('incoterm',e.target.value)}><option value="">Sin definir</option>{INCOTERMS.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Lead time (días)" hint="Del pedido al almacén"><input type="number" min="1" max="720" value={f.lead_time_dias??''} onChange={e=>set('lead_time_dias',e.target.value)}/></Field>
      <Field label="Anticipo (%)"><input type="number" min="0" max="100" step="0.01" value={f.anticipo_por} onChange={e=>set('anticipo_por',e.target.value)}/></Field><Field label="Plazo del saldo (días)" hint="Vacío si es contra documentos"><input type="number" min="0" value={f.plazo_saldo_dias??''} onChange={e=>set('plazo_saldo_dias',e.target.value)}/></Field><Field label="Condición de pago"><input value={f.condicion_pago||''} onChange={e=>set('condicion_pago',e.target.value)} placeholder="30 % anticipo, 70 % contra documentos"/></Field></div>
    <label className="check"><input type="checkbox" checked={!!f.activo} onChange={e=>set('activo',e.target.checked)}/> Proveedor activo</label>
    <Field label="Observaciones"><textarea rows={2} value={f.observaciones||''} onChange={e=>set('observaciones',e.target.value)}/></Field><FormFooter busy={busy}/></form>;
}

// ───────────────────────────── Pagos ─────────────────────────────
function giroDisponible(data,g){return +g.importe-sum(data.giros_factura.filter(a=>a.giro_id===g.id),'importe');}
function Bar({parts,total}){const t=total||parts.reduce((n,p)=>n+Math.max(0,+p.v||0),0)||1;return <div className="bar">{parts.filter(p=>+p.v>0).map(p=><span key={p.k} className={'seg '+p.c} style={{width:`${Math.min(100,Math.max(0,+p.v)/t*100)}%`}} title={`${p.k}: ${number(p.v)}`}/>)}</div>;}
function Legend({parts,moneda}){return <div className="legend">{parts.map(p=><span key={p.k}><i className={'dot '+p.c}/>{p.k} <strong>{money(p.v,moneda)}</strong></span>)}</div>;}
export function Payments({data,admin,open}){
  const [tab,setTab]=useState('facturas'),[filtro,setFiltro]=useState('pendientes'),[q,setQ]=useState(''),[abierta,setAbierta]=useState(null);
  const giros=[...data.giros].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const totalBs=giros.reduce((n,g)=>n+(g.tipo_cambio?+g.importe*+g.tipo_cambio:0),0);
  const disponibles=(prov,mon)=>data.giros.filter(g=>g.tipo==='anticipo'&&g.proveedor===prov&&g.moneda===mon).map(g=>({...g,disponible:giroDisponible(data,g)})).filter(g=>g.disponible>0.005);
  const importe=p=>p.importe_documento!=null?+p.importe_documento:+p.importe_lineas||null;
  const facs=data.v_control_pagos.map(p=>({...p,importe:importe(p)})).filter(p=>`${p.numero} ${p.proveedor}`.toLowerCase().includes(q.toLowerCase()));
  const grupos={pendientes:facs.filter(p=>p.importe&&+p.saldo>0.005),pagadas:facs.filter(p=>p.importe&&+p.saldo<=0.005),sinimporte:facs.filter(p=>!p.importe),todas:facs};
  const lista=grupos[filtro].sort((a,b)=>(+b.pagado>0)-(+a.pagado>0)||b.numero.localeCompare(a.numero));
  const pfs=data.v_giros_proforma.filter(r=>r.estado!=='sugerida'&&`${r.numero} ${r.proveedor}`.toLowerCase().includes(q.toLowerCase())&&(+r.girado>0||['enviada','confirmada'].includes(r.estado))).sort((a,b)=>(+b.disponible>0)-(+a.disponible>0)||b.numero.localeCompare(a.numero));
  const docOf=g=>g.tipo==='anticipo'?byId(data.proformas,g.proforma_id)?.numero:byId(data.facturas,g.factura_id)?.numero;
  return <>
    <Metrics items={[['Por pagar',money(sum(grupos.pendientes,'saldo'),'USD'),Landmark,`${grupos.pendientes.length} ${grupos.pendientes.length===1?'factura':'facturas'} con saldo`],['Anticipo sin aplicar',money(data.giros.filter(g=>g.tipo==='anticipo').reduce((n,g)=>n+giroDisponible(data,g),0),'USD'),Wallet,'Listo para aplicar a facturas'],['Facturas pagadas',grupos.pagadas.length,ReceiptText,'Saldo en cero'],['Girado en Bs',bs(totalBs),Calculator,`${giros.length} giros registrados`]]}/>
    <div className="panel"><div className="panel-title"><div><h2>Pagos al proveedor</h2><p>El anticipo se gira contra la proforma y se va aplicando a sus facturas; el saldo se paga contra cada factura.</p></div></div>
      <div className="filterbar"><div className="segments">{[['facturas','Facturas'],['proformas','Anticipos'],['giros','Historial']].map(([v,l])=><button key={v} className={tab===v?'selected':''} onClick={()=>setTab(v)}>{l}</button>)}</div><SearchBox value={q} onChange={setQ} placeholder="Buscar documento…"/></div>
      {tab==='facturas'&&<>
        <div className="subfilter">{[['pendientes','Con saldo'],['pagadas','Pagadas'],['sinimporte','Sin importe'],['todas','Todas']].map(([v,l])=><button key={v} className={filtro===v?'selected':''} onClick={()=>setFiltro(v)}>{l} <span>{grupos[v].length}</span></button>)}</div>
        {lista.length?<div className="card-grid">{lista.map(p=>{const disp=disponibles(p.proveedor,p.moneda);const parts=[{k:'Anticipo aplicado',v:+p.anticipos_aplicados,c:'a'},{k:'Cancelado',v:+p.cancelado,c:'b'},{k:'Saldo',v:Math.max(0,+p.saldo||0),c:'c'}];const pagos=[...data.giros_factura.filter(a=>a.factura_id===p.factura_id).map(a=>({...byId(data.giros,a.giro_id),aplicado:a.importe,key:a.id})),...data.giros.filter(g=>g.factura_id===p.factura_id).map(g=>({...g,aplicado:g.importe,key:g.id}))].sort((a,b)=>a.fecha.localeCompare(b.fecha));
          return <div className="pay-card" key={p.factura_id}>
            <div className="pay-top"><div><strong>{p.numero}</strong><small>{p.proveedor} · {p.moneda}</small></div><Badge tone={p.estado_financiero==='PAGADO'?'green':['VENCIDO','PAGO EN EXCESO'].includes(p.estado_financiero)?'amber':''}>{p.estado_financiero}</Badge></div>
            {p.importe?<><div className="pay-amount"><small>{+p.saldo>0.005?'Saldo por pagar':'Total pagado'}</small><strong>{money(+p.saldo>0.005?p.saldo:p.pagado,p.moneda)}</strong><span>de {money(p.importe,p.moneda)}{p.pagado_bs?` · ${bs(p.pagado_bs)} pagados`:''}</span></div><Bar parts={parts} total={Math.max(p.importe,+p.pagado)}/><Legend parts={parts} moneda={p.moneda}/></>:<p className="soft-empty">Falta el importe de la factura (o los precios de sus líneas).</p>}
            {admin&&<div className="pay-actions">{disp.length>0&&+p.saldo>0.005&&<Button secondary onClick={()=>open('applyToInvoice',p)}>Aplicar anticipo</Button>}{(+p.saldo>0.005||!p.importe)&&<Button onClick={()=>open('giro',{tipo:'cancelacion',doc:byId(data.facturas,p.factura_id)})}>Pagar saldo</Button>}</div>}
            {pagos.length>0&&<button className="text-button" onClick={()=>setAbierta(abierta===p.factura_id?null:p.factura_id)}>{abierta===p.factura_id?'Ocultar':'Ver'} {pagos.length} {pagos.length===1?'pago':'pagos'}</button>}
            {abierta===p.factura_id&&<ol className="timeline">{pagos.map(g=><li key={g.key}><span>{date(g.fecha)}</span><strong>{g.tipo==='anticipo'?`Anticipo de ${byId(data.proformas,g.proforma_id)?.numero}`:'Cancelación'}</strong><em>{money(g.aplicado,g.moneda)}{g.tipo_cambio?` · TC ${dec(g.tipo_cambio)}`:''}</em></li>)}</ol>}
          </div>;})}</div>:<Empty title="Nada por aquí" text="Cambia el filtro para ver otras facturas."/>}
      </>}
      {tab==='proformas'&&(pfs.length?<div className="card-grid">{pfs.map(r=>{const falta=r.anticipo_esperado!=null?Math.max(0,+r.anticipo_esperado-+r.girado):0;const parts=[{k:'Aplicado a facturas',v:+r.aplicado,c:'a'},{k:'Disponible',v:+r.disponible,c:'d'},{k:'Falta girar',v:falta,c:'c'}];
          return <div className="pay-card" key={r.proforma_id}>
            <div className="pay-top"><div><strong>{r.numero}</strong><small>{r.proveedor} · anticipo {pct(r.anticipo_por)}</small></div><Badge>{ESTADO_LABEL[r.estado]}</Badge></div>
            <div className="pay-amount"><small>Anticipo girado</small><strong>{money(r.girado,r.moneda)}</strong><span>{r.anticipo_esperado==null?'Sin precios para calcular el esperado':`esperado ${money(r.anticipo_esperado,r.moneda)}`}</span></div>
            <Bar parts={parts}/><Legend parts={parts} moneda={r.moneda}/>
            {admin&&<div className="pay-actions">{+r.disponible>0.005&&<Button secondary onClick={()=>open('applyGiro',r)}>Aplicar a factura</Button>}<Button onClick={()=>open('giro',{tipo:'anticipo',doc:byId(data.proformas,r.proforma_id)})}>Girar anticipo</Button></div>}
          </div>;})}</div>:<Empty title="Sin anticipos" text="Las proformas enviadas o confirmadas aparecen aquí para girar su anticipo."/>)}
      {tab==='giros'&&(giros.length?<div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Banco</th><th className="num">Importe</th><th className="num">T/C</th><th className="num">En Bs</th><th>Aplicado a</th>{admin&&<th/>}</tr></thead><tbody>{giros.map(g=><tr key={g.id}><td>{date(g.fecha)}</td><td><Badge tone={g.tipo==='anticipo'?'':'green'}>{g.tipo==='anticipo'?'Anticipo':'Cancelación'}</Badge></td><td><strong>{docOf(g)}</strong><small>{g.referencia||''}</small></td><td>{g.banco||'—'}</td><td className="num">{money(g.importe,g.moneda)}</td><td className="num">{g.tipo_cambio?dec(g.tipo_cambio):'—'}</td><td className="num">{g.tipo_cambio?bs(+g.importe*+g.tipo_cambio):'—'}</td><td>{g.tipo==='anticipo'?data.giros_factura.filter(a=>a.giro_id===g.id).map(a=><small key={a.id}>{byId(data.facturas,a.factura_id)?.numero}: {money(a.importe,g.moneda)}</small>):<small>Su factura</small>}</td>{admin&&<td><button className="text-button" onClick={()=>open('giro',{tipo:g.tipo,doc:g.tipo==='anticipo'?byId(data.proformas,g.proforma_id):byId(data.facturas,g.factura_id),giro:g})}>Editar</button></td>}</tr>)}</tbody></table></div>:<Empty title="Todavía no hay giros" text="Registra el anticipo desde la proforma o la cancelación desde la factura."/>)}
    </div></>;
}
// Aplicar a una factura, de una vez, la parte de uno o varios anticipos disponibles del proveedor
export function ApplyToInvoiceForm({value,data,busy,action}){
  const disp=data.giros.filter(g=>g.tipo==='anticipo'&&g.proveedor===value.proveedor&&g.moneda===value.moneda).map(g=>({...g,disponible:giroDisponible(data,g),yaAplicado:data.giros_factura.some(a=>a.giro_id===g.id&&a.factura_id===value.factura_id)})).filter(g=>g.disponible>0.005&&!g.yaAplicado);
  const [m,setM]=useState({});const total=Object.values(m).reduce((n,v)=>n+(+v||0),0);const saldo=+value.saldo||0;
  return <form onSubmit={e=>{e.preventDefault();const rows=Object.entries(m).filter(([,v])=>+v>0).map(([giro_id,v])=>({giro_id,factura_id:value.factura_id,importe:Number(v)}));if(!rows.length)return;action(()=>insertMany('giros_factura',rows),`${rows.length===1?'Anticipo aplicado':`${rows.length} anticipos aplicados`} a ${value.numero}`);}}>
    <div className="payment-summary"><span>Factura {value.numero} · {value.proveedor}</span><strong>Saldo: {money(saldo,value.moneda)}</strong><small>Después de aplicar quedará {money(saldo-total,value.moneda)}</small></div>
    <p>Escribe cuánto de cada anticipo corresponde a esta factura. Lo que no apliques queda disponible para las siguientes.</p>
    {disp.map(g=><div className="apply-row" key={g.id}><div><strong>{byId(data.proformas,g.proforma_id)?.numero}</strong><small>{date(g.fecha)} · girado {money(g.importe,g.moneda)} · disponible {money(g.disponible,g.moneda)}</small></div><input className="qty-input" type="number" min="0" step="0.01" max={g.disponible} placeholder="0,00" value={m[g.id]??''} onChange={e=>setM({...m,[g.id]:e.target.value})}/><button type="button" className="text-button" onClick={()=>setM({...m,[g.id]:String(Math.round(Math.min(g.disponible,Math.max(0,saldo-total+(+m[g.id]||0)))*100)/100)})}>Todo lo posible</button></div>)}
    {!disp.length&&<p className="soft-empty">No hay anticipos disponibles de {value.proveedor} en {value.moneda}.</p>}
    {total>saldo+0.005&&<p className="inline-note">Lo aplicado supera el saldo de la factura.</p>}
    <FormFooter busy={busy} label="Aplicar"/></form>;
}
export function GiroForm({value,data,busy,action}){
  const {tipo,doc,giro}=value;const anticipo=tipo==='anticipo';
  const info=anticipo?data.v_giros_proforma.find(r=>r.proforma_id===doc.id):data.v_control_pagos.find(r=>r.factura_id===doc.id);
  const [f,setF]=useState({fecha:today(),banco:'',moneda:doc.moneda,importe:'',tipo_cambio:'',referencia:'',observaciones:'',...giro});
  const set=(k,v)=>setF({...f,[k]:v});
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('giros',{tipo,proveedor:doc.proveedor,proforma_id:anticipo?doc.id:null,factura_id:anticipo?null:doc.id,fecha:f.fecha,banco:blank(f.banco),moneda:f.moneda,importe:Number(f.importe),tipo_cambio:numOrNull(f.tipo_cambio),referencia:blank(f.referencia),observaciones:blank(f.observaciones)},giro?.id),anticipo?'Anticipo registrado. Aplícalo a las facturas cuando lleguen.':'Cancelación registrada');}}>
    <div className="payment-summary"><span>{anticipo?'Proforma':'Factura'} {doc.numero} · {doc.proveedor}</span>{anticipo?<strong>Anticipo esperado: {info?.anticipo_esperado==null?'sin precios':money(info.anticipo_esperado,doc.moneda)}</strong>:<strong>Saldo: {info?.saldo==null?'por confirmar':money(info.saldo,doc.moneda)}</strong>}<small>{anticipo?`Ya girado: ${money(info?.girado,doc.moneda)}`:`Anticipos aplicados: ${money(info?.anticipos_aplicados,doc.moneda)}`}</small></div>
    <div className="form-grid three"><Field label="Fecha del giro"><input type="date" required value={f.fecha} onChange={e=>set('fecha',e.target.value)}/></Field><Field label="Banco"><input value={f.banco||''} onChange={e=>set('banco',e.target.value)}/></Field><Field label="Moneda" hint="La del documento"><select value={f.moneda} onChange={e=>set('moneda',e.target.value)}>{[...new Set([doc.moneda,...CURRENCIES])].map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label={`Importe (${f.moneda})`}><input type="number" required min="0.01" step="0.01" value={f.importe} onChange={e=>set('importe',e.target.value)}/></Field><Field label="Tipo de cambio (Bs)" hint="El del banco; se usa para el costo"><input type="number" min="0" step="0.000001" value={f.tipo_cambio??''} onChange={e=>set('tipo_cambio',e.target.value)}/></Field><Field label="En Bs"><input readOnly value={f.importe&&f.tipo_cambio?bs(+f.importe*+f.tipo_cambio):''}/></Field></div>
    <Field label="Referencia o comprobante"><input value={f.referencia||''} onChange={e=>set('referencia',e.target.value)}/></Field><Field label="Observaciones"><textarea rows={2} value={f.observaciones||''} onChange={e=>set('observaciones',e.target.value)}/></Field>
    <p className="footnote">Comisiones bancarias e ITF se cargan como gastos en la hoja de costos de la factura (comisión al 87 %, ITF al 0 %).</p><FormFooter busy={busy} label="Guardar giro"/></form>;
}
export function ApplyGiroForm({value,data,busy,action}){
  const giros=data.giros.filter(g=>g.tipo==='anticipo'&&g.proforma_id===value.proforma_id).map(g=>({...g,disponible:giroDisponible(data,g)})).filter(g=>g.disponible>0);
  const [f,setF]=useState({giro_id:giros[0]?.id||'',factura_id:'',importe:''});
  const g=giros.find(x=>x.id===f.giro_id);
  const facturas=data.v_control_pagos.filter(p=>g&&p.proveedor===g.proveedor&&p.moneda===g.moneda&&!data.giros_factura.some(a=>a.giro_id===g.id&&a.factura_id===p.factura_id));
  const fac=facturas.find(p=>p.factura_id===f.factura_id);
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('giros_factura',{giro_id:f.giro_id,factura_id:f.factura_id,importe:Number(f.importe)}),'Anticipo aplicado a la factura');}}>
    <p>Proforma <strong>{value.numero}</strong>. Aplica la parte del anticipo que corresponde a cada factura; el resto queda disponible.</p>
    <Field label="Anticipo"><select required value={f.giro_id} onChange={e=>setF({...f,giro_id:e.target.value,factura_id:''})}><option value="">Seleccionar</option>{giros.map(g=><option key={g.id} value={g.id}>{date(g.fecha)} · {money(g.importe,g.moneda)} · disponible {money(g.disponible,g.moneda)}</option>)}</select></Field>
    <Field label="Factura" hint="Mismo proveedor y moneda"><select required value={f.factura_id} onChange={e=>{const p=facturas.find(x=>x.factura_id===e.target.value);setF({...f,factura_id:e.target.value,importe:p&&g?String(Math.max(0,Math.min(g.disponible,+p.saldo||g.disponible))):''});}}><option value="">Seleccionar factura</option>{facturas.map(p=><option key={p.factura_id} value={p.factura_id}>{p.numero} · saldo {p.saldo==null?'por confirmar':money(p.saldo,p.moneda)}</option>)}</select></Field>
    {g&&!facturas.length&&<p className="inline-note">No hay facturas de {g.proveedor} en {g.moneda}. Revisa la moneda de la factura.</p>}
    <Field label={`Importe a aplicar${g?` (${g.moneda})`:''}`}><input type="number" required min="0.01" step="0.01" max={g?.disponible} value={f.importe} onChange={e=>setF({...f,importe:e.target.value})}/></Field>
    {fac&&<p className="footnote">Después de aplicar, el saldo de {fac.numero} quedará en {money(+fac.saldo-+f.importe,fac.moneda)}.</p>}
    <FormFooter busy={busy} label="Aplicar anticipo"/></form>;
}

// ───────────────────────────── Hoja de costos ─────────────────────────────
// Pasos de una hoja de costos: qué está listo y qué falta
function costSteps(c,data){
  const lineas=data.detalles_factura.filter(d=>d.factura_id===c.factura_id);
  const conLote=lineas.filter(d=>data.costeo_lotes.some(l=>l.detalle_factura_id===d.id)).length;
  return [
    {k:'precios',t:'Precios de la factura',ok:c.precios_completos,hint:c.precios_completos?`${lineas.length} líneas con precio`:'Faltan precios en las líneas de la factura'},
    {k:'pagos',t:'Valor en Bs',ok:c.cif_bs!=null,hint:c.cif_bs!=null?`TC efectivo ${dec(c.tc_efectivo,4)}`:'Registra anticipos aplicados y el pago del saldo (con TC), o un TC manual'},
    {k:'gastos',t:'Gastos',ok:+c.gastos>0,hint:+c.gastos>0?`${c.gastos} ítems cargados`:'Agrega flete, agencia, DIM, comisiones…'},
    {k:'lotes',t:'Lotes',ok:lineas.length>0&&conLote===lineas.length,hint:`${conLote} de ${lineas.length} líneas con lote`},
    {k:'cierre',t:'Cerrar hoja',ok:c.estado==='cerrado',hint:c.estado==='cerrado'?'Costo fijo, listo para ONIX':'Cuando todo esté revisado'}];
}
export function Costs({data,admin,open,action,busy}){
  const [current,setCurrent]=useState(null),[q,setQ]=useState(''),[filtro,setFiltro]=useState('proceso');
  if(current){const c=data.v_costeo.find(r=>r.factura_id===current);if(c)return <CostSheet c={c} data={data} admin={admin} open={open} action={action} busy={busy} back={()=>setCurrent(null)}/>;}
  const all=data.v_costeo.filter(r=>`${r.numero} ${r.proveedor}`.toLowerCase().includes(q.toLowerCase())).map(r=>({...r,steps:costSteps(r,data)}));
  const empezada=r=>!!r.costeo_id||+r.gastos>0||+r.pagado>0;
  const grupos={proceso:all.filter(r=>empezada(r)&&r.estado!=='cerrado'),cerradas:all.filter(r=>r.estado==='cerrado'),nuevas:all.filter(r=>!empezada(r)),todas:all};
  const rows=grupos[filtro].sort((a,b)=>String(b.fecha_emision).localeCompare(String(a.fecha_emision)));
  const closed=data.v_costeo.filter(r=>r.estado==='cerrado');
  return <>
    <Metrics items={[['En preparación',grupos.proceso.length,Calculator,'Hojas con pagos o gastos'],['Cerradas',closed.length,Lock,'Costo listo para ONIX'],['Paramétrica promedio',dec(avg(data.v_costeo.filter(r=>r.parametrica).map(r=>+r.parametrica)),4),Building2,'De las hojas con CIF y gastos'],['Gastos al costo',bs(sum(data.v_costeo,'gastos_costo_bs')),ReceiptText,'Todas las facturas']]}/>
    <div className="panel"><div className="panel-title"><div><h2>Hojas de costos</h2><p>Una por factura. Ábrela y ve completando los pasos: el sistema calcula la paramétrica y el costo por lote.</p></div></div>
      <div className="filterbar"><div className="segments">{[['proceso','En preparación'],['cerradas','Cerradas'],['nuevas','Sin empezar'],['todas','Todas']].map(([v,l])=><button key={v} className={filtro===v?'selected':''} onClick={()=>setFiltro(v)}>{l} <span className="seg-count">{grupos[v].length}</span></button>)}</div><SearchBox value={q} onChange={setQ} placeholder="Buscar factura…"/></div>
      {rows.length?<div className="card-grid">{rows.map(r=>{const next=r.steps.find(s=>!s.ok);return <button className="cost-card" key={r.factura_id} onClick={()=>setCurrent(r.factura_id)}>
        <div className="pay-top"><div><strong>{r.numero}</strong><small>{r.proveedor} · {date(r.fecha_emision)}</small></div><Badge tone={r.estado==='cerrado'?'green':empezada(r)?'amber':''}>{r.estado==='cerrado'?'Cerrada':empezada(r)?'En preparación':'Sin empezar'}</Badge></div>
        <div className="cost-card-mid">{r.parametrica?<><small>Paramétrica</small><strong>{dec(r.parametrica,4)}</strong><span>Costo en almacén {bs(r.costo_total_bs)}</span></>:<><small>Siguiente paso</small><strong className="next">{next?.t}</strong><span>{next?.hint}</span></>}</div>
        <div className="mini-steps">{r.steps.map(s=><i key={s.k} className={s.ok?'ok':''} title={s.t}/>)}<span>{r.steps.filter(s=>s.ok).length} de 5 pasos</span></div>
      </button>;})}</div>:<Empty title="Nada por aquí" text={filtro==='proceso'?'Abre una factura desde «Sin empezar» para comenzar su hoja.':'Cambia el filtro para ver otras hojas.'}/>}
    </div></>;
}
const avg=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
function CostSheet({c,data,admin,open,action,busy,back}){
  const factura=byId(data.facturas,c.factura_id),closed=c.estado==='cerrado',editable=admin&&!closed;
  const costeo=data.costeos.find(x=>x.factura_id===c.factura_id);
  const gastos=data.gastos.filter(g=>g.factura_id===c.factura_id);
  const concept=id=>byId(data.conceptos_gasto,id);
  const grupos=[...data.grupos_gasto].sort((a,b)=>a.orden-b.orden).map(g=>{const items=gastos.filter(x=>concept(x.concepto_id)?.grupo===g.codigo);return {...g,items,total:sum(items,'importe_bs'),costo:sum(items,'importe_costo_bs')};});
  const [cuenta,setCuenta]=useState(null),[pcts,setPcts]=useState({});
  const sel=grupos.find(g=>g.codigo===cuenta);
  const steps=costSteps(c,data);
  const lineas=data.detalles_factura.filter(d=>d.factura_id===c.factura_id).sort((a,b)=>a.numero_linea-b.numero_linea);
  const lotesDe=d=>data.costeo_lotes.filter(l=>l.detalle_factura_id===d.id);
  const costoLinea=d=>data.v_costeo_lotes.find(l=>l.detalle_factura_id===d.id);
  async function savePct(g){const v=pcts[g.id];if(v==null||v===''||+v===+g.por_costo)return;await action(()=>save('gastos',{por_costo:Number(v)},g.id),'% al costo corregido');setPcts(p=>({...p,[g.id]:undefined}));}
  const gastosCosto=grupos.filter(g=>!g.es_valor_factura);
  const stepAction={precios:admin&&<button className="text-button" onClick={()=>open('detail',{kind:'factura',doc:factura})}>Ver factura</button>,
    pagos:admin&&<button className="text-button" onClick={()=>open('applyToInvoice',data.v_control_pagos.find(p=>p.factura_id===c.factura_id))}>Aplicar anticipo</button>,
    gastos:editable&&<button className="text-button" onClick={()=>setCuenta(gastosCosto.find(g=>!g.items.length)?.codigo||'DESTINO')}>Agregar gasto</button>,
    lotes:editable&&!costeo&&<button className="text-button" onClick={()=>open('costeo',{factura,costeo})}>Completar cabecera</button>,
    cierre:admin&&costeo&&!closed&&c.parametrica!=null&&<button className="text-button" onClick={()=>action(()=>save('costeos',{estado:'cerrado',cerrado_en:new Date().toISOString()},costeo.id),'Hoja cerrada: el costo queda fijo')}>Cerrar ahora</button>};
  return <>
    <button className="text-button back-link" onClick={back}><ArrowLeft size={14}/>Todas las hojas</button>
    <div className="panel cost-head"><div className="panel-title"><div><span className="eyebrow">HOJA DE COSTOS</span><h2>Factura {c.numero} <Badge tone={closed?'green':'amber'}>{closed?'Cerrada':'En preparación'}</Badge></h2><p>{c.proveedor} · {date(c.fecha_emision)} · {c.condicion_entrega||'Condición por indicar'} · Compra ONIX {c.compra_onix||'—'} · DIM {c.dim||'—'}</p></div>
      <div className="title-actions">{editable&&<Button secondary icon={Pencil} onClick={()=>open('costeo',{factura,costeo})}>Cabecera</Button>}{admin&&closed&&<Button secondary icon={Unlock} disabled={busy} onClick={()=>action(()=>save('costeos',{estado:'borrador',cerrado_en:null},costeo.id),'Hoja reabierta')}>Reabrir</Button>}<Button secondary icon={Download} disabled={!c.parametrica} onClick={()=>downloadCSV(`costos-${c.numero}.csv`,data.v_costeo_lotes.filter(l=>l.factura_id===c.factura_id).map(l=>({codigo:l.codigo,producto:l.nombre,lote:l.lote||'',vencimiento:l.vencimiento||'',cantidad:l.cantidad,costo_unitario_origen:l.precio_unitario,costo_unitario_almacen_bs:l.costo_unitario_bs,costo_total_almacen_bs:l.costo_total_bs})))}>Exportar costos</Button></div></div>
      <div className="steps">{steps.map((s,i)=><div key={s.k} className={'step '+(s.ok?'ok':steps.findIndex(x=>!x.ok)===i?'now':'')}><span className="step-n">{s.ok?'✓':i+1}</span><div><strong>{s.t}</strong><small>{s.hint}</small>{!s.ok&&stepAction[s.k]}</div></div>)}</div>
      <div className="waterfall">
        <div><small>Factura</small><strong>{c.total_moneda==null?'—':money(c.total_moneda,c.moneda)}</strong><span>× TC {c.tc_efectivo?dec(c.tc_efectivo,4):'—'}</span></div>
        <b>=</b><div><small>Valor CIF</small><strong>{bs(c.cif_bs)}</strong><span>{+c.dif_cambio_bs?`incluye dif. de cambio ${bs(c.dif_cambio_bs)}`:'lo pagado en Bs'}</span></div>
        <b>+</b><div><small>Gastos al costo</small><strong>{bs(c.gastos_costo_bs)}</strong><span>de {bs(c.gastos_bs)} documentados</span></div>
        <b>=</b><div className="total"><small>Costo en almacén</small><strong>{bs(c.costo_total_bs)}</strong><span>paramétrica <em>{c.parametrica?dec(c.parametrica,4):'—'}</em></span></div>
      </div>
      {c.cif_bs>0&&+c.gastos_costo_bs>0&&<div className="composition"><Bar parts={[{k:'Valor CIF',v:+c.cif_bs,c:'a'},...gastosCosto.filter(g=>g.costo>0).map((g,i)=>({k:g.nombre,v:g.costo,c:'g'+(i%6)}))]}/><div className="legend">{gastosCosto.filter(g=>g.costo>0).map((g,i)=><span key={g.codigo}><i className={'dot g'+(i%6)}/>{g.nombre} <strong>{pct(g.costo/c.cif_bs*100)}</strong></span>)}</div></div>}
    </div>
    <div className="panel"><div className="panel-title"><div><h2>Cuentas de gasto</h2><p>Elige una cuenta y ve agregando sus ítems a medida que llegan los documentos. El % al costo se sugiere solo y se puede corregir.</p></div></div>
      <div className="account-grid">{grupos.map(g=><button key={g.codigo} className={'account'+(cuenta===g.codigo?' on':'')+(g.items.length?'':' empty')} onClick={()=>setCuenta(cuenta===g.codigo?null:g.codigo)}>
        <small>{g.nombre}</small>{g.items.length?<><strong>{bs(g.es_valor_factura?g.total:g.costo)}</strong><span>{g.items.length} {g.items.length===1?'ítem':'ítems'}{g.es_valor_factura?' · suma al valor CIF':g.total!==g.costo?` · de ${bs(g.total)}`:''}</span></>:<><strong className="muted">—</strong><span>{editable?'+ Agregar':'Sin ítems'}</span></>}
      </button>)}</div>
      {sel&&<div className="account-detail"><div className="section-title"><h3>{sel.nombre}</h3>{editable&&<Button icon={Plus} onClick={()=>open('gasto',{factura,grupo:sel.codigo})}>Agregar ítem</Button>}</div>
        {sel.items.length?sel.items.map(g=>{const t=data.tipos_documento_gasto.find(x=>x.codigo===g.tipo_documento);return <div className="item-row" key={g.id}>
          <div><strong>{concept(g.concepto_id)?.nombre}</strong><small>{[t?.nombre,g.numero_documento,g.emisor,g.fecha&&date(g.fecha)].filter(Boolean).join(' · ')}</small></div>
          <div className="num"><strong>{bs(g.importe_bs)}</strong>{g.moneda!=='BOB'&&g.importe!=null&&<small>{money(g.importe,g.moneda)} × {dec(g.tipo_cambio)}</small>}</div>
          {!sel.es_valor_factura&&<div className={'num pct-cell '+(+g.por_costo!==+g.por_costo_sugerido?'pending':'')}>{editable?<input className="qty-input pct-input" type="number" min="0" max="100" step="0.01" aria-label="% al costo" value={pcts[g.id]??g.por_costo} onChange={e=>setPcts({...pcts,[g.id]:e.target.value})} onBlur={()=>savePct(g)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),e.currentTarget.blur())}/>:pct(g.por_costo)}<small>{+g.por_costo!==+g.por_costo_sugerido?`sugerido ${pct(g.por_costo_sugerido)}`:'% al costo'}</small></div>}
          {!sel.es_valor_factura&&<div className="num"><strong>{bs(g.importe_costo_bs)}</strong><small>al costo</small></div>}
          {editable&&<div className="row-actions"><button className="text-button" onClick={()=>open('gasto',{factura,gasto:g,grupo:sel.codigo})}>Editar</button><button className="icon-button" aria-label="Eliminar ítem" onClick={()=>action(()=>remove('gastos',g.id),'Ítem eliminado')}><Trash2 size={15}/></button></div>}
        </div>;}):<p className="soft-empty">Todavía no hay ítems en esta cuenta.</p>}
      </div>}
    </div>
    <div className="panel"><div className="panel-title"><div><h2>Costo por producto</h2><p>Costo unitario en almacén = precio de origen × TC efectivo × paramétrica. Carga los lotes de la nota de ingreso para el costo por lote.</p></div></div>
      <div className="product-costs">{lineas.map(d=>{const p=byId(data.productos,d.producto_id),cl=costoLinea(d),ls=lotesDe(d);return <div className="product-cost" key={d.id}>
        <div><strong>{p?.nombre}</strong><small>{p?.codigo} · {number(d.cantidad)} {d.unidad} · {d.precio_unitario==null?'sin precio':money(d.precio_unitario,c.moneda)}</small></div>
        <div className="num"><small>Costo unitario</small><strong>{cl?.costo_unitario_bs!=null?dec(cl.costo_unitario_bs,4):'—'}</strong></div>
        <div className="num"><small>Total</small><strong>{cl?.costo_unitario_bs!=null?bs(+cl.costo_unitario_bs*+d.cantidad):'—'}</strong></div>
        <div className="lot-chips">{ls.map(l=><span key={l.id} className="chip">{l.lote} · {number(l.cantidad)}</span>)}{editable&&costeo&&<button className="text-button" onClick={()=>open('lotes',{costeo,line:d})}>{ls.length?'Lotes':'+ Lote'}</button>}</div>
      </div>;})}</div>
      {editable&&!costeo&&<p className="footnote">Para cargar lotes, guarda primero la cabecera (condición, compra de ONIX y DIM).</p>}
    </div>
  </>;
}
export function CosteoForm({value,busy,action}){
  const {factura,costeo}=value;const [f,setF]=useState({condicion_entrega:'',compra_onix:'',dim:'',fecha_dim:'',tc_dim:'',tipo_cambio_manual:'',observaciones:'',...costeo});
  const set=(k,v)=>setF({...f,[k]:v});
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('costeos',{factura_id:factura.id,condicion_entrega:blank(f.condicion_entrega),compra_onix:blank(f.compra_onix),dim:blank(f.dim),fecha_dim:blank(f.fecha_dim),tc_dim:numOrNull(f.tc_dim),tipo_cambio_manual:numOrNull(f.tipo_cambio_manual),observaciones:blank(f.observaciones)},costeo?.id),'Cabecera de la hoja guardada');}}>
    <p>Factura {factura.numero} · {factura.proveedor}. La hoja se relaciona por el código de factura, la condición y la compra de ONIX.</p>
    <div className="form-grid three"><Field label="Condición de entrega"><select value={f.condicion_entrega||''} onChange={e=>set('condicion_entrega',e.target.value)}><option value="">Sin indicar</option>{INCOTERMS.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Compra (nota de ingreso ONIX)"><input value={f.compra_onix||''} onChange={e=>set('compra_onix',e.target.value)} placeholder="370"/></Field><Field label="DIM"><input value={f.dim||''} onChange={e=>set('dim',e.target.value)}/></Field>
      <Field label="Fecha DIM"><input type="date" value={f.fecha_dim||''} onChange={e=>set('fecha_dim',e.target.value)}/></Field><Field label="TC DIM"><input type="number" step="0.000001" min="0" value={f.tc_dim??''} onChange={e=>set('tc_dim',e.target.value)}/></Field><Field label="TC manual (opcional)" hint="Solo si aún no hay giros con tipo de cambio"><input type="number" step="0.000001" min="0" value={f.tipo_cambio_manual??''} onChange={e=>set('tipo_cambio_manual',e.target.value)}/></Field></div>
    <Field label="Observaciones"><textarea rows={2} value={f.observaciones||''} onChange={e=>set('observaciones',e.target.value)}/></Field><FormFooter busy={busy}/></form>;
}
export function GastoForm({value,data,busy,action}){
  const {factura,gasto,grupo}=value;
  const [nuevo,setNuevo]=useState('');
  const [f,setF]=useState({concepto_id:'',tipo_documento:'FACTURA',emisor:'',intermediario:'',numero_documento:'',fecha:'',descripcion:'',moneda:'BOB',importe:'',tipo_cambio:'',importe_bs:'',por_costo:'',fecha_pago:'',banco:'',comprobante:'',observaciones:'',...gasto});
  const set=(k,v)=>setF({...f,[k]:v});
  const c=f.concepto_id==='__nuevo'?null:byId(data.conceptos_gasto,f.concepto_id);const doc=data.tipos_documento_gasto.find(t=>t.codigo===f.tipo_documento);
  const sugerido=c?.por_costo_fijo??doc?.por_costo??100;
  const importeBs=f.importe_bs!==''&&f.importe_bs!=null?+f.importe_bs:f.moneda==='BOB'?+f.importe||0:(+f.importe||0)*(+f.tipo_cambio||0);
  const porCosto=f.por_costo===''||f.por_costo==null?sugerido:+f.por_costo;
  const grupos=[...data.grupos_gasto].sort((a,b)=>a.orden-b.orden);
  return <form onSubmit={e=>{e.preventDefault();action(async()=>{let concepto_id=f.concepto_id;if(concepto_id==='__nuevo'){concepto_id=(await save('conceptos_gasto',{grupo,nombre:nuevo.trim()})).id;}return save('gastos',{factura_id:factura.id,concepto_id,tipo_documento:f.tipo_documento,emisor:blank(f.emisor),intermediario:blank(f.intermediario),numero_documento:blank(f.numero_documento),fecha:blank(f.fecha),descripcion:blank(f.descripcion),moneda:f.moneda,importe:numOrNull(f.importe),tipo_cambio:numOrNull(f.tipo_cambio),importe_bs:importeBs,por_costo:f.por_costo===''||f.por_costo==null?null:Number(f.por_costo),fecha_pago:blank(f.fecha_pago),banco:blank(f.banco),comprobante:blank(f.comprobante),observaciones:blank(f.observaciones)},gasto?.id);},'Ítem guardado');}}>
    <p>Factura {factura.numero}. Si dejas el % al costo vacío, se usa el sugerido.</p>
    <div className="form-grid three"><Field label={grupo?`Ítem de «${data.grupos_gasto.find(g=>g.codigo===grupo)?.nombre}»`:'Concepto'}><select required value={f.concepto_id} onChange={e=>set('concepto_id',e.target.value)}><option value="">Seleccionar</option>{grupos.filter(g=>!grupo||g.codigo===grupo).map(g=><optgroup key={g.codigo} label={g.nombre}>{data.conceptos_gasto.filter(c=>c.grupo===g.codigo&&c.activo!==false).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>)}{grupo&&<option value="__nuevo">＋ Otro concepto…</option>}</select></Field>{f.concepto_id==='__nuevo'&&<Field label="Nombre del nuevo concepto"><input required value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder="Ej. Fumigación"/></Field>}
      <Field label="Documento"><select required value={f.tipo_documento} onChange={e=>set('tipo_documento',e.target.value)}>{data.tipos_documento_gasto.map(t=><option key={t.codigo} value={t.codigo}>{t.nombre} ({pct(t.por_costo)})</option>)}</select></Field><Field label="N° de documento"><input value={f.numero_documento||''} onChange={e=>set('numero_documento',e.target.value)}/></Field>
      <Field label="Emisor"><input value={f.emisor||''} onChange={e=>set('emisor',e.target.value)}/></Field><Field label="Intermediario"><input value={f.intermediario||''} onChange={e=>set('intermediario',e.target.value)}/></Field><Field label="Fecha del documento"><input type="date" value={f.fecha||''} onChange={e=>set('fecha',e.target.value)}/></Field>
      <Field label="Moneda"><select value={f.moneda} onChange={e=>set('moneda',e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field><Field label={`Importe (${f.moneda})`}><input type="number" step="0.01" min="0" value={f.importe??''} onChange={e=>set('importe',e.target.value)}/></Field>{f.moneda!=='BOB'?<Field label="Tipo de cambio"><input type="number" step="0.000001" min="0" value={f.tipo_cambio??''} onChange={e=>set('tipo_cambio',e.target.value)}/></Field>:<span/>}
      <Field label="Importe en Bs" hint="Vacío = se calcula"><input type="number" step="0.0001" min="0" value={f.importe_bs??''} placeholder={importeBs?String(Math.round(importeBs*100)/100):''} onChange={e=>set('importe_bs',e.target.value)}/></Field><Field label="% al costo" hint={`Sugerido: ${pct(sugerido)}`}><input type="number" min="0" max="100" step="0.01" value={f.por_costo??''} placeholder={String(sugerido)} onChange={e=>set('por_costo',e.target.value)}/></Field><Field label="Al costo (Bs)"><input readOnly value={bs(importeBs*porCosto/100)}/></Field>
      <Field label="Fecha de pago"><input type="date" value={f.fecha_pago||''} onChange={e=>set('fecha_pago',e.target.value)}/></Field><Field label="Banco"><input value={f.banco||''} onChange={e=>set('banco',e.target.value)}/></Field><Field label="Comprobante"><input value={f.comprobante||''} onChange={e=>set('comprobante',e.target.value)}/></Field></div>
    <Field label="Descripción"><input value={f.descripcion||''} onChange={e=>set('descripcion',e.target.value)}/></Field><FormFooter busy={busy} label="Guardar gasto"/></form>;
}
export function LotesForm({value,data,busy,action}){
  const {costeo,line}=value;const product=byId(data.productos,line.producto_id);
  const existing=data.costeo_lotes.filter(l=>l.detalle_factura_id===line.id);
  const [f,setF]=useState({lote:'',vencimiento:'',cantidad:String(Math.max(0,+line.cantidad-sum(existing,'cantidad'))||'')});
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('costeo_lotes',{costeo_id:costeo.id,detalle_factura_id:line.id,lote:f.lote.trim(),vencimiento:blank(f.vencimiento),cantidad:Number(f.cantidad)}),'Lote agregado');}}>
    <p><strong>{product?.nombre}</strong> · facturado {number(line.cantidad)} {line.unidad} · en lotes {number(sum(existing,'cantidad'))}</p>
    {existing.map(l=><div className="reconcile-row" key={l.id}><strong>{l.lote}</strong><span>{l.vencimiento?date(l.vencimiento):'Sin vencimiento'} · {number(l.cantidad)}</span><button type="button" className="icon-button" aria-label={`Quitar lote ${l.lote}`} disabled={busy} onClick={()=>action(()=>remove('costeo_lotes',l.id),'Lote quitado')}><Trash2 size={15}/></button></div>)}
    <div className="form-grid three"><Field label="Lote"><input required value={f.lote} onChange={e=>setF({...f,lote:e.target.value})}/></Field><Field label="Vencimiento"><input type="date" value={f.vencimiento} onChange={e=>setF({...f,vencimiento:e.target.value})}/></Field><Field label="Cantidad"><input type="number" required min="0.0001" step="0.0001" value={f.cantidad} onChange={e=>setF({...f,cantidad:e.target.value})}/></Field></div>
    <FormFooter busy={busy} label="Agregar lote"/></form>;
}

// Formulario para ajustar cantidad y precio de una línea de proforma (sugerida o enviada)
export function LineEditForm({value,busy,action}){
  const [f,setF]=useState({cantidad_pedida:value.cantidad_pedida,precio_unitario:value.precio_unitario??'',descripcion_proveedor:value.descripcion_proveedor||''});
  return <form onSubmit={e=>{e.preventDefault();action(()=>save('detalles_proforma',{cantidad_pedida:Number(f.cantidad_pedida),precio_unitario:numOrNull(f.precio_unitario),descripcion_proveedor:blank(f.descripcion_proveedor)},value.id),'Línea actualizada');}}>
    {value.cantidad_sugerida!=null&&<p>Sugerido por el sistema: <strong>{number(value.cantidad_sugerida)} {value.unidad}</strong></p>}
    <div className="form-grid three"><Field label={`Cantidad (${value.unidad})`}><input type="number" required min="0.0001" step="0.0001" value={f.cantidad_pedida} onChange={e=>setF({...f,cantidad_pedida:e.target.value})}/></Field><Field label="Precio unitario"><input type="number" min="0" step="0.0001" value={f.precio_unitario} onChange={e=>setF({...f,precio_unitario:e.target.value})}/></Field><Field label="Descripción del proveedor"><input value={f.descripcion_proveedor} onChange={e=>setF({...f,descripcion_proveedor:e.target.value})}/></Field></div>
    <FormFooter busy={busy}/></form>;
}
export { ESTADOS_PROFORMA, INCOTERMS };

// ───────────────────────────── Factura desde proformas ─────────────────────────────
// Elige una o varias proformas del mismo proveedor, marca las líneas que vienen en la factura,
// ajusta cantidad, packing y precio. Cada línea queda asignada a su proforma al guardar.
export function InvoiceFromProformasForm({data,busy,action}){
  const [cerradas,setCerradas]=useState(false),[proveedor,setProveedor]=useState(''),[pfs,setPfs]=useState([]),[sel,setSel]=useState({});
  const [head,setHead]=useState({numero:'',fecha_emision:today(),importe_documento:'',vencimiento_saldo:'',observaciones:''});
  const [error,setError]=useState('');
  const abiertas=data.proformas.filter(p=>p.estado!=='sugerida'&&(cerradas||p.estado!=='cerrada'));
  const proveedores=[...new Set(abiertas.map(p=>p.proveedor))].sort();
  const disponibles=abiertas.filter(p=>p.proveedor===proveedor).sort((a,b)=>String(b.fecha_documento).localeCompare(String(a.fecha_documento)));
  const lines=pfs.flatMap(id=>{const pf=byId(data.proformas,id);return data.detalles_proforma.filter(l=>l.proforma_id===id).sort((a,b)=>a.numero_linea-b.numero_linea).map(l=>{const f=data.v_forecast_proforma.find(x=>x.detalle_proforma_id===l.id)||{};return {...l,pf,producto:byId(data.productos,l.producto_id),vigente:+l.cantidad_pedida-+(l.cantidad_cancelada||0),pendiente:f.pendiente_facturar!=null?+f.pendiente_facturar:+l.cantidad_pedida-+(l.cantidad_cancelada||0)};});});
  const moneda=pfs.length?byId(data.proformas,pfs[0]).moneda:'USD';
  const monedas=[...new Set(pfs.map(id=>byId(data.proformas,id)?.moneda))];
  function togglePf(id){setPfs(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);setSel(s=>Object.fromEntries(Object.entries(s).filter(([k])=>lines.find(l=>l.id===k)?.proforma_id!==id)));}
  function toggleLine(l){setSel(s=>{if(s[l.id]){const {[l.id]:_,...rest}=s;return rest;}return {...s,[l.id]:{cantidad:String(l.pendiente>0?l.pendiente:l.vigente),packing:l.packing||'',precio:l.precio_unitario??''}};});}
  const pendientesTodas=()=>setSel(Object.fromEntries(lines.filter(l=>l.pendiente>0).map(l=>[l.id,sel[l.id]||{cantidad:String(l.pendiente),packing:l.packing||'',precio:l.precio_unitario??''}])));
  const elegidas=lines.filter(l=>sel[l.id]);
  const issues=l=>{const v=sel[l.id];if(!v)return [];const out=[];const q=+v.cantidad;
    if(q>l.pendiente)out.push(['amber',`${number(q-l.pendiente)} más de lo pendiente`]);else if(q<l.pendiente)out.push(['',`Parcial: quedan ${number(l.pendiente-q)}`]);
    if((v.packing||'')!==(l.packing||''))out.push(['amber','Packing distinto']);
    if(l.precio_unitario!=null&&v.precio!==''&&+v.precio!==+l.precio_unitario)out.push(['amber','Precio distinto']);
    return out;};
  const total=elegidas.reduce((n,l)=>n+(+sel[l.id].cantidad||0)*(+sel[l.id].precio||0),0);
  const alertas=elegidas.filter(l=>issues(l).some(([t])=>t==='amber')).length;
  function submit(e){e.preventDefault();setError('');
    if(!elegidas.length){setError('Marca al menos una línea de las proformas.');return;}
    if(monedas.length>1){setError('Las proformas elegidas tienen monedas distintas.');return;}
    if(elegidas.some(l=>!(+sel[l.id].cantidad>0))){setError('Todas las líneas marcadas necesitan una cantidad mayor a cero.');return;}
    const lineas=elegidas.map(l=>({producto_id:l.producto_id,cantidad:sel[l.id].cantidad,unidad:l.unidad,packing:sel[l.id].packing,precio_unitario:sel[l.id].precio,referencia_proforma_documento:l.pf.numero_proveedor||l.pf.numero,asignaciones:[{detalle_proforma_id:l.id,cantidad:sel[l.id].cantidad}]}));
    action(()=>rpc('crear_documento',{tipo:'factura',cabecera:{id:crypto.randomUUID(),proveedor,numero:head.numero,fecha_emision:head.fecha_emision,moneda,importe_documento:head.importe_documento===''?String(Math.round(total*100)/100):head.importe_documento,vencimiento_saldo:head.vencimiento_saldo,observaciones:head.observaciones},lineas}),`Factura guardada con ${lineas.length} líneas asignadas a sus proformas`);}
  return <form onSubmit={submit}>
    <p>Elige el proveedor y las proformas que trae la factura. Marca las líneas que vienen y corrige cantidad, packing o precio según el documento del proveedor: las diferencias quedan señaladas.</p>
    {error&&<div className="message error" role="alert">{error}</div>}
    <div className="form-grid three"><Field label="Proveedor"><select required value={proveedor} onChange={e=>{setProveedor(e.target.value);setPfs([]);setSel({});}}><option value="">Seleccionar</option>{proveedores.map(p=><option key={p}>{p}</option>)}</select></Field>
      <Field label="Número de factura"><input required value={head.numero} onChange={e=>setHead({...head,numero:e.target.value})}/></Field><Field label="Fecha de emisión"><input required type="date" value={head.fecha_emision} onChange={e=>setHead({...head,fecha_emision:e.target.value})}/></Field></div>
    <label className="check"><input type="checkbox" checked={cerradas} onChange={e=>setCerradas(e.target.checked)}/> Mostrar también proformas cerradas</label>
    {proveedor&&<><h3>Proformas de {proveedor}</h3>{disponibles.length?<div className="pf-picker">{disponibles.map(p=>{const pend=data.v_forecast_proforma.filter(f=>f.proforma_id===p.id).reduce((n,f)=>n+ +f.pendiente_facturar,0);return <label key={p.id} className={'pf-chip'+(pfs.includes(p.id)?' on':'')}><input type="checkbox" checked={pfs.includes(p.id)} onChange={()=>togglePf(p.id)}/><strong>{p.numero}</strong><small>{date(p.fecha_documento)} · {ESTADO_LABEL[p.estado]} · {number(pend)} por facturar</small></label>;})}</div>:<p className="soft-empty">No hay proformas {cerradas?'':'abiertas '}de este proveedor.</p>}</>}
    {lines.length>0&&<><div className="section-title"><h3>Líneas ({elegidas.length} de {lines.length} marcadas)</h3><Button type="button" secondary onClick={pendientesTodas}>Marcar todo lo pendiente</Button></div>
      <div className="table-scroll"><table className="invoice-lines"><thead><tr><th/><th>Producto</th><th>Proforma</th><th className="num">Pedido</th><th className="num">Pendiente</th><th className="num">Cantidad factura</th><th>Packing</th><th className="num">Precio</th><th>Revisar</th></tr></thead><tbody>{lines.map(l=>{const v=sel[l.id];const is=issues(l);return <tr key={l.id} className={v?'row-selected':''}>
        <td><input type="checkbox" aria-label={`Incluir ${l.producto?.codigo}`} checked={!!v} onChange={()=>toggleLine(l)}/></td>
        <td><strong>{l.producto?.nombre}</strong><small>{l.producto?.codigo} · {l.unidad}</small></td><td>{l.pf.numero}<small>línea {l.numero_linea}</small></td>
        <td className="num">{number(l.vigente)}</td><td className={'num '+(l.pendiente<=0?'muted':'')}>{number(l.pendiente)}</td>
        <td className="num">{v?<input className="qty-input" type="number" min="0.0001" step="0.0001" value={v.cantidad} onChange={e=>setSel({...sel,[l.id]:{...v,cantidad:e.target.value}})}/>:'—'}</td>
        <td>{v?<input className="qty-input packing-input" value={v.packing} placeholder={l.packing||'Packing'} onChange={e=>setSel({...sel,[l.id]:{...v,packing:e.target.value}})}/>:(l.packing||'—')}</td>
        <td className="num">{v?<input className="qty-input" type="number" min="0" step="0.0001" value={v.precio} onChange={e=>setSel({...sel,[l.id]:{...v,precio:e.target.value}})}/>:(l.precio_unitario==null?'—':money(l.precio_unitario,l.pf.moneda))}</td>
        <td>{is.map(([t,txt])=><Badge key={txt} tone={t}>{txt}</Badge>)}</td></tr>;})}</tbody></table></div>
      {monedas.length>1&&<p className="inline-note">Las proformas elegidas tienen monedas distintas ({monedas.join(', ')}). Una factura va en una sola moneda.</p>}
      {alertas>0&&<p className="inline-note">{alertas} {alertas===1?'línea tiene':'líneas tienen'} diferencias con la proforma. Revísalas antes de guardar; se guardan como vienen en la factura.</p>}
      <div className="document-total"><span>Total de las líneas marcadas</span><strong>{money(total,moneda)}</strong></div>
      <div className="form-grid three"><Field label="Importe de la factura" hint="Vacío = total de las líneas"><input type="number" min="0" step="0.0001" value={head.importe_documento} placeholder={String(Math.round(total*100)/100)} onChange={e=>setHead({...head,importe_documento:e.target.value})}/></Field><Field label="Vencimiento del saldo" hint="Vacío si es contra documentos"><input type="date" value={head.vencimiento_saldo} onChange={e=>setHead({...head,vencimiento_saldo:e.target.value})}/></Field><span/></div>
      {head.importe_documento!==''&&Math.abs(+head.importe_documento-total)>0.005&&<p className="inline-note">El importe difiere del total de las líneas en {money(+head.importe_documento-total,moneda)} (bonificaciones, flete u otra diferencia). Se guarda para revisarla.</p>}
      <Field label="Observaciones"><textarea rows={2} value={head.observaciones} onChange={e=>setHead({...head,observaciones:e.target.value})}/></Field></>}
    <FormFooter busy={busy} label="Guardar factura"/></form>;
}
