import { createClient } from '@supabase/supabase-js';
export const configured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const supabase = configured ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) : null;
export const exampleMode = import.meta.env.DEV && new URLSearchParams(location.search).get('ejemplo') === '1';
export const number = value => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 4 }).format(Number(value || 0));
export const money = (value, currency='USD') => new Intl.NumberFormat('es-BO', { style:'currency',currency }).format(Number(value || 0));
export const date = value => value ? new Intl.DateTimeFormat('es-BO',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)) : 'Por confirmar';
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function errorMessage(error) {
  if(error?.code==='23505') return 'Este código o número de documento ya existe. Revisa el registro antes de repetirlo.';
  if(error?.code==='23503') return 'El registro está relacionado con otro documento. Actualiza la pantalla y revisa la relación.';
  if(error?.code==='42501') return 'Tu usuario no tiene permiso para realizar esta operación.';
  if(error?.code==='23514') return 'Revisa las cantidades y los campos obligatorios.';
  if(/invalid login credentials/i.test(error?.message)) return 'El correo o la contraseña no son correctos.';
  return error?.message || 'No pudimos completar la operación. Intenta nuevamente.';
}
export async function allRows(table) {
  const rows=[];
  for(let page=0;;page++) {
    const key={v_forecast_proforma:'detalle_proforma_id',v_forecast_factura:'detalle_factura_id',v_forecast_producto:'producto_id',v_control_pagos:'factura_id'}[table]||'id';
    let request=supabase.from(table).select('*').order(key);
    if(table==='v_forecast_producto')request=request.order('unidad');
    const {data,error}=await request.range(page*1000,page*1000+999);
    if(error) throw error;
    rows.push(...data);
    if(data.length<1000) return rows;
  }
}
export const TABLES=['productos','productos_complemento','proformas','detalles_proforma','facturas','detalles_factura','asignaciones','embarques','pagos','recepciones','detalles_recepcion','aplicaciones_recepcion','adjuntos','perfiles','v_forecast_producto','v_forecast_proforma','v_forecast_factura','v_asignaciones','v_control_pagos'];
export async function loadData() {
  return Object.fromEntries(await Promise.all(TABLES.map(async table=>[table,await allRows(table)])));
}
export async function save(table, values, id) {
  const request = id ? supabase.from(table).update(values).eq('id',id).select('id').single() : supabase.from(table).insert(values).select('id').single();
  const {data,error}=await request; if(error) throw error; return data;
}
export async function rpc(name, args) {
  const {data,error}=await supabase.rpc(name,args); if(error) throw error; return data;
}
export function downloadCSV(name, rows) {
  if(!rows.length) return;
  const keys=Object.keys(rows[0]);
  const cell=v=>'"'+String(v??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')+'"';
  const text='\ufeff'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
