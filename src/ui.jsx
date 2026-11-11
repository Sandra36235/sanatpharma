import React from 'react';
import { Files, Search, Check } from 'lucide-react';
import { exampleMode } from './lib';

export function Badge({children,tone=''}) { return <span className={'badge '+tone}>{children}</span>; }
export function Field({label,children,hint}) { return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>; }
export function Empty({title='Todavía no hay registros',text='Los documentos que registres aparecerán aquí.',action}) { return <div className="empty"><div className="empty-icon"><Files size={27}/></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
export function Button({children,icon:Icon,secondary=false,...props}) { return <button className={secondary?'button secondary':'button'} {...props}>{Icon&&<Icon size={16}/>}<span>{children}</span></button>; }
export function SearchBox({value,onChange,placeholder='Buscar producto o código…'}){return <div className="search"><Search size={17}/><input aria-label="Buscar" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>;}
export function FormFooter({busy,label='Guardar registro'}){return <div className="form-footer"><span>Los cambios quedan en el historial.</span><Button disabled={busy||exampleMode} icon={Check}>{busy?'Guardando…':label}</Button></div>;}
export function Metrics({items}){return <div className="metrics">{items.map(([label,value,Icon,hint],i)=><div className={'metric metric-'+i} key={label}><div className="metric-top"><span>{label}</span>{Icon&&<Icon size={19}/>}</div><strong>{value}</strong><small>{hint}</small></div>)}</div>;}
export const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r[key]||0),0);
export const byId=(rows,id)=>rows.find(r=>r.id===id);
