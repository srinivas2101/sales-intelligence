import React, { useState, useEffect, useMemo } from 'react';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { productsAPI } from '../api/service';

const parseProduct = p => ({
  ...p,
  price:         parseFloat(p.price)         || 0,
  cost_price:    parseFloat(p.cost_price)     || 0,
  stock:         parseInt(p.stock)            || 0,
  expiry_days:   parseInt(p.expiry_days)      || 365,
  reorder_point: parseInt(p.reorder_point)    || 20,
});


const SUPPLIERS = {
  'Rice & Grains': 'Aachi Traders, Chennai',
  'Dal & Pulses': 'Sri Murugan Wholesale, Madurai',
  'Atta & Flour': 'Pillsbury Distributor, Coimbatore',
  'Oils & Ghee': 'Fortune Oils Depot, Chennai',
  'Dairy': 'Aavin Regional Office, Salem',
  'Spices & Masala': 'MDH Distributor, Trichy',
  'Vegetables': 'Local Farmers Market, Nearby',
  'Fruits': 'Fresh Fruits Hub, Hosur',
  'Snacks & Biscuits': 'Britannia Dealer, Chennai',
  'Beverages': 'Coca-Cola Distributor, Chennai',
  'Personal Care': 'HUL Distributor, Chennai',
  'Home Care': 'P&G Distributor, Bengaluru',
  'Bakery': 'Local Bakery Supplier',
  'Frozen & Packed': 'ITC Distributor, Chennai',
  'Baby & Health': 'Medical Distributor, Chennai',
  'Stationery': 'Classmate Dealer, Chennai',
};

const STATUS_COLORS = {
  'Pending': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  'Ordered': { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  'Delivered': { bg: '#e8f5e9', color: '#2d7a3a', border: '#a5d6a7' },
  'Cancelled': { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
};

export default function PurchaseOrders() {

  const [dbProducts, setDbProducts] = useState(ALL_PRODUCTS);
  const [liveDB, setLiveDB] = useState(false);

  useEffect(() => {
    productsAPI.getAll()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDbProducts(data.map(p => ({
            ...p,
            price: parseFloat(p.price)||0,
            cost_price: parseFloat(p.cost_price)||0,
            stock: parseInt(p.stock)||0,
            expiry_days: parseInt(p.expiry_days)||365,
            reorder_point: parseInt(p.reorder_point)||20,
            risk_score: parseInt(p.risk_score)||0,
          })));
          setLiveDB(true);
        }
      }).catch(() => {});
  }, []);

  const needReorder = useMemo(() =>
    dbProducts.filter(p => p.stock < p.reorder_point).map(p => ({
      ...p,
      qty_to_order: (p.reorder_point * 3) - p.stock,
      supplier: SUPPLIERS[p.category] || 'General Supplier',
      estimated_cost: ((p.reorder_point * 3 - p.stock) * p.cost_price).toFixed(0),
    })), []);

  const [orders, setOrders] = useState(() =>
    needReorder.slice(0, 6).map((p, i) => ({
      id: `PO-${1001 + i}`,
      product: p.name,
      category: p.category,
      qty: p.qty_to_order,
      unit_cost: p.cost_price,
      total: p.estimated_cost,
      supplier: p.supplier,
      status: ['Pending', 'Ordered', 'Pending', 'Delivered', 'Ordered', 'Pending'][i],
      date: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString('en-IN'),
    }))
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: '', supplier: '', qty: '', unit_cost: '', notes: '' });
  const [filterStatus, setFilterStatus] = useState('All');

  const totalPending = orders.filter(o => o.status === 'Pending').reduce((s, o) => s + +o.total, 0);
  const totalOrdered = orders.filter(o => o.status === 'Ordered').reduce((s, o) => s + +o.total, 0);

  const filtered = filterStatus === 'All' ? orders : orders.filter(o => o.status === filterStatus);

  const updateStatus = (id, status) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

  const addOrder = () => {
    if (!form.product || !form.qty) return;
    const newOrder = {
      id: `PO-${1001 + orders.length}`,
      product: form.product,
      category: 'General',
      qty: +form.qty,
      unit_cost: +form.unit_cost || 0,
      total: ((+form.qty) * (+form.unit_cost || 0)).toFixed(0),
      supplier: form.supplier || 'TBD',
      status: 'Pending',
      date: new Date().toLocaleDateString('en-IN'),
    };
    setOrders(prev => [newOrder, ...prev]);
    setShowForm(false);
    setForm({ product: '', supplier: '', qty: '', unit_cost: '', notes: '' });
  };

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-color': '#dc2626', '--kpi-bg': '#fee2e2' }}>
          <div className="kpi-icon">🚨</div>
          <div className="kpi-label">Need Reorder</div>
          <div className="kpi-value">{needReorder.length}</div>
          <div className="kpi-change kpi-down">items low stock</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-bg': '#fef3c7' }}>
          <div className="kpi-icon">⏳</div>
          <div className="kpi-label">Pending Orders</div>
          <div className="kpi-value">{orders.filter(o => o.status === 'Pending').length}</div>
          <div className="kpi-change kpi-neutral">₹{(totalPending/1000).toFixed(1)}K value</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#1d4ed8', '--kpi-bg': '#dbeafe' }}>
          <div className="kpi-icon">📤</div>
          <div className="kpi-label">Ordered</div>
          <div className="kpi-value">{orders.filter(o => o.status === 'Ordered').length}</div>
          <div className="kpi-change kpi-neutral">₹{(totalOrdered/1000).toFixed(1)}K value</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#2d7a3a', '--kpi-bg': '#e8f5e9' }}>
          <div className="kpi-icon">✅</div>
          <div className="kpi-label">Delivered</div>
          <div className="kpi-value">{orders.filter(o => o.status === 'Delivered').length}</div>
          <div className="kpi-change kpi-up">this week</div>
        </div>
      </div>

      {/* Reorder Suggestions */}
      <div className="card fade-up" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">⚡ Reorder Suggestions</div>
          <span className="badge badge-red">{needReorder.length} items</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {needReorder.slice(0, 8).map(p => {
            const meta = CATEGORY_META[p.category];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: p.stock <= 0 ? '#fee2e2' : '#fffbeb', border: `1.5px solid ${p.stock <= 0 ? '#fca5a5' : '#fcd34d'}`, borderRadius: 10, fontSize: 13 }}>
                <span>{meta?.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Stock: <b style={{ color: p.stock <= 0 ? '#dc2626' : '#f59e0b' }}>{p.stock}</b> / Order: <b>{p.qty_to_order}</b> units</div>
                </div>
              </div>
            );
          })}
          {needReorder.length > 8 && <div style={{ padding: '8px 14px', background: '#f0f4f0', borderRadius: 10, fontSize: 12, color: '#666', display: 'flex', alignItems: 'center' }}>+{needReorder.length - 8} more...</div>}
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {['All', 'Pending', 'Ordered', 'Delivered', 'Cancelled'].map(s => (
          <button key={s} className={`chip ${filterStatus === s ? 'chip-active' : 'chip-inactive'}`} onClick={() => setFilterStatus(s)}>{s}</button>
        ))}
        <button className="btn btn-green" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Order'}
        </button>
      </div>

      {showForm && (
        <div className="card fade-up" style={{ marginBottom: 16, borderColor: '#4caf50' }}>
          <div className="card-head"><div className="card-title">➕ New Purchase Order</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Product Name</label>
              <input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="e.g. Tata Salt 1kg" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Supplier</label>
              <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
            <div className="form-group">
              <label className="form-label">Qty to Order</label>
              <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost (₹)</label>
              <input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2', alignSelf: 'flex-end' }}>
              <button className="btn btn-green" onClick={addOrder} style={{ width: '100%' }}>✅ Create Order</button>
            </div>
          </div>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Product</th>
              <th>Supplier</th>
              <th>Qty</th>
              <th>Total Cost</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sc = STATUS_COLORS[o.status];
              return (
                <tr key={o.id}>
                  <td><span className="mono" style={{ fontWeight: 700, color: '#1d4ed8' }}>{o.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.product}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{o.category}</div>
                  </td>
                  <td style={{ fontSize: 12, color: '#555' }}>{o.supplier}</td>
                  <td><span className="mono" style={{ fontWeight: 700 }}>{o.qty}</span></td>
                  <td><span className="mono" style={{ fontWeight: 700, color: '#2d7a3a' }}>₹{(+o.total).toLocaleString('en-IN')}</span></td>
                  <td style={{ fontSize: 12 }}>{o.date}</td>
                  <td>
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}` }}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {o.status === 'Pending' && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(o.id, 'Ordered')}>📤 Order</button>}
                      {o.status === 'Ordered' && <button className="btn btn-green btn-sm" onClick={() => updateStatus(o.id, 'Delivered')}>✅ Received</button>}
                      {(o.status === 'Pending' || o.status === 'Ordered') && <button className="btn btn-red btn-sm" onClick={() => updateStatus(o.id, 'Cancelled')}>✕</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}