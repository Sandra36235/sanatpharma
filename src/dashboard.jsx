import React from 'react';
import { Package, Ship, Check, AlertCircle, Files, Anchor, Clock3 } from 'lucide-react';
import { number, date, today } from './lib';
import './dashboard.css';

const sum = (rows, key) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);
const pct = (part, total) => (total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0);

const ESTADOS = [
  ['SALIDA POR CONFIRMAR', 'Salida por confirmar', 'pending'],
  ['EN TRANSITO', 'En tránsito', 'transit'],
  ['EN ARICA', 'En Arica', 'transit'],
  ['EN COCHABAMBA, RECEPCION PENDIENTE', 'En Cochabamba, por recibir', 'near'],
  ['RECEPCION PARCIAL', 'Recepción parcial', 'near'],
  ['RECIBIDO', 'Recibido', 'done'],
];

function Bar({ value, total, tone = 'green' }) {
  return (
    <span className="mini-bar" aria-hidden="true">
      <i className={'fill ' + tone} style={{ width: pct(value, total) + '%' }} />
    </span>
  );
}

export function Dashboard({ data, go }) {
  const prof = data.v_forecast_proforma;
  const fact = data.v_forecast_factura;
  const prod = data.v_forecast_producto;

  const pedido = sum(prof, 'pedido_vigente');
  const recibido = sum(prof, 'recibido');
  const enCamino = sum(prof, 'facturado_pendiente_recepcion');
  const porFacturar = sum(prof, 'pendiente_facturar');
  const exceso = sum(prof, 'exceso_facturado');
  const sinAsignar = sum(fact, 'sin_asignar');
  const falta = recibido + enCamino + porFacturar;
  const sinRecepciones = data.recepciones.length === 0;

  const cards = [
    ['Pedido vigente', pedido, Files, 'Todo lo que has pedido, sin lo cancelado', 'metric-1'],
    ['Ya entregado', recibido, Check, 'Recepciones registradas en Cochabamba', ''],
    ['Facturado, en camino', enCamino, Ship, 'Ya facturado por el proveedor y aún sin recibir', ''],
    ['Falta facturar', porFacturar, Package, 'Pedido que el proveedor todavía no factura', 'metric-3'],
  ];

  const segments = [
    ['Entregado', recibido, 'done'],
    ['Facturado, en camino', enCamino, 'transit'],
    ['Falta facturar', porFacturar, 'pending'],
  ];

  // Facturas por estado logístico (una vez por factura; si hay varios estados gana el menos avanzado)
  const orden = ESTADOS.map(e => e[0]);
  const estadoFactura = new Map();
  fact.forEach(l => {
    const actual = estadoFactura.get(l.factura_id);
    if (actual === undefined || orden.indexOf(l.estado_logistico) < orden.indexOf(actual)) estadoFactura.set(l.factura_id, l.estado_logistico);
  });
  const porEstado = ESTADOS.map(([key, label, tone]) => {
    const ids = [...estadoFactura].filter(([, e]) => e === key).map(([id]) => id);
    const lineas = fact.filter(l => ids.includes(l.factura_id));
    return { key, label, tone, facturas: ids.length, cantidad: sum(lineas, 'pendiente_recepcion') };
  });

  const hoy = today();
  const porLlegar = fact.filter(l => Number(l.pendiente_recepcion) > 0 && !l.cochabamba_real);
  const facturasVencidas = new Set(porLlegar.filter(l => l.cochabamba_estimada && l.cochabamba_estimada < hoy).map(l => l.factura_id));
  const llegadas = Object.values(
    porLlegar.filter(l => l.cochabamba_estimada && l.cochabamba_estimada >= hoy).reduce((acc, l) => {
      const a = (acc[l.factura_id] ||= { factura: l.factura, fecha: l.cochabamba_estimada, cantidad: 0 });
      a.cantidad += Number(l.pendiente_recepcion);
      return acc;
    }, {})
  ).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);

  const porProforma = data.proformas
    .map(p => {
      const lines = prof.filter(l => l.proforma_id === p.id);
      return {
        id: p.id, numero: p.numero, proveedor: p.proveedor, fecha: p.fecha_documento,
        pedido: sum(lines, 'pedido_vigente'), facturado: sum(lines, 'facturado'), recibido: sum(lines, 'recibido'),
        porFacturar: sum(lines, 'pendiente_facturar'), enCamino: sum(lines, 'facturado_pendiente_recepcion'),
      };
    })
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  const topProductos = Object.values(
    prod.reduce((acc, r) => {
      const a = (acc[r.producto_id] ||= { codigo: r.codigo, nombre: r.nombre, pendiente: 0, porFacturar: 0 });
      a.pendiente += Number(r.pendiente_llegada_pedido || 0);
      a.porFacturar += Number(r.pendiente_facturar || 0);
      return acc;
    }, {})
  ).filter(r => r.pendiente > 0).sort((a, b) => b.pendiente - a.pendiente).slice(0, 8);
  const maxProducto = topProductos[0]?.pendiente || 0;

  const avisos = [
    sinAsignar > 0 && ['Facturado sin proforma asignada', sinAsignar],
    exceso > 0 && ['Facturado por encima de lo pedido', exceso],
  ].filter(Boolean);

  return (
    <>
      {sinRecepciones && (
        <div className="dash-note" role="note">
          <AlertCircle size={17} />
          <span>
            Todavía no hay recepciones registradas, por eso «Ya entregado» está en cero. Cuando registres lo recibido en{' '}
            <button className="text-button" onClick={() => go('seguimiento')}>Seguimiento</button>, esta pantalla se actualiza sola.
          </span>
        </div>
      )}

      <div className="metrics">
        {cards.map(([label, value, Icon, hint, cls], i) => (
          <div className={'metric ' + cls} key={label}>
            <div className="metric-top"><span>{label}</span><Icon size={19} /></div>
            <strong>{number(value)}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>¿En qué punto está tu pedido?</h2>
            <p>{pct(falta - recibido, falta)}% de tu pedido aún no ha llegado a Cochabamba: una parte ya viene en camino y otra todavía no se factura.</p>
          </div>
        </div>
        <div className="stack" role="img" aria-label={segments.map(([l, v]) => `${l}: ${pct(v, falta)}%`).join(', ')}>
          {segments.map(([label, v, tone]) => v > 0 && <i key={label} className={'seg ' + tone} style={{ width: pct(v, falta) + '%' }} />)}
        </div>
        <div className="stack-legend">
          {segments.map(([label, v, tone]) => (
            <span key={label}><i className={'dot ' + tone} /> {label} <strong>{number(v)}</strong> <em>{pct(v, falta)}%</em></span>
          ))}
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-title">
            <div><h2>Tus facturas, por etapa</h2><p>Dónde está cada embarque hoy.</p></div>
            <Ship size={20} />
          </div>
          <div className="stages">
            {porEstado.map(s => (
              <div className={'stage ' + s.tone + (s.facturas ? '' : ' empty')} key={s.key}>
                <strong>{s.facturas}</strong>
                <span>{s.label}</span>
                <small>{s.facturas ? `${number(s.cantidad)} por recibir` : 'Sin facturas'}</small>
              </div>
            ))}
          </div>
          {facturasVencidas.size > 0 && (
            <p className="dash-foot"><Clock3 size={14} /> {facturasVencidas.size} facturas tienen su fecha estimada de llegada ya vencida. Actualiza sus fechas en Seguimiento.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">
            <div><h2>Próximas llegadas</h2><p>Según la fecha estimada a Cochabamba.</p></div>
            <Anchor size={20} />
          </div>
          {llegadas.length ? llegadas.map(a => (
            <div className="arrival" key={a.factura}>
              <div className="arrival-icon"><Ship size={19} /></div>
              <div><strong>{a.factura}</strong><small>{number(a.cantidad)} por recibir</small></div>
              <div className="arrival-date"><strong>{date(a.fecha)}</strong><small>Estimada</small></div>
            </div>
          )) : <p className="soft-empty">No hay llegadas futuras con fecha estimada.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div><h2>Avance por proforma <span className="count">{porProforma.length}</span></h2><p>Cuánto de cada pedido ya se facturó y cuánto llegó.</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Proforma</th><th>Proveedor</th><th className="num">Pedido</th><th>Facturado</th><th className="num">Entregado</th><th className="num">En camino</th><th className="num">Falta facturar</th></tr>
            </thead>
            <tbody>
              {porProforma.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.numero}</strong><small>{date(p.fecha)}</small></td>
                  <td>{p.proveedor}</td>
                  <td className="num">{number(p.pedido)}</td>
                  <td className="progress-cell"><Bar value={p.facturado} total={p.pedido} /><span>{pct(p.facturado, p.pedido)}%</span></td>
                  <td className="num">{number(p.recibido)}</td>
                  <td className="num">{number(p.enCamino)}</td>
                  <td className="num">{number(p.porFacturar)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>Total</td><td className="num">{number(pedido)}</td><td /><td className="num">{number(recibido)}</td><td className="num">{number(enCamino)}</td><td className="num">{number(porFacturar)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-title">
            <div><h2>Productos con más pendiente</h2><p>Lo que falta que llegue, por producto.</p></div>
            <Package size={20} />
          </div>
          {topProductos.length ? topProductos.map(r => (
            <div className="rank" key={r.codigo}>
              <div><strong>{r.nombre}</strong><small>{r.codigo} · falta facturar {number(r.porFacturar)}</small></div>
              <Bar value={r.pendiente} total={maxProducto} tone="amber" />
              <span className="num">{number(r.pendiente)}</span>
            </div>
          )) : <p className="soft-empty">No hay productos pendientes.</p>}
        </div>

        <div className="panel">
          <div className="panel-title">
            <div><h2>Para revisar</h2><p>Diferencias entre lo pedido y lo facturado.</p></div>
            <AlertCircle size={20} />
          </div>
          {avisos.length ? avisos.map(([label, v]) => (
            <div className="rank" key={label}><div><strong>{label}</strong></div><span className="num">{number(v)}</span></div>
          )) : <p className="soft-empty">Todo cuadra por ahora.</p>}
          <p className="dash-foot">Las cantidades suman las unidades de cada documento tal como vienen en las proformas y facturas.</p>
        </div>
      </div>
    </>
  );
}
