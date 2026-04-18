import React, { useState, useEffect } from 'react';
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


const OFFER_TYPES = ['Percentage Discount', 'Buy X Get Y', 'Flat Amount Off', 'Bundle Offer'];

const sampleOffers = [
  { id: 1, name: 'Weekend Special', type: 'Percentage Discount', discount: 15, product: 'Tata Salt 1kg', category: 'Rice & Grains', startDate: '2026-02-27', endDate: '2026-03-01', active: true, redemptions: 23 },
  { id: 2, name: 'Buy 2 Get 1 Free', type: 'Buy X Get Y', discount: 0, product: 'Aashirvaad Atta 5kg', category: 'Atta & Flour', startDate: '2026-02-25', endDate: '2026-02-28', active: true, redemptions: 11 },
  { id: 3, name: 'Dairy Discount', type: 'Flat Amount Off', discount: 20, product: 'Amul Butter 100g', category: 'Dairy', startDate: '2026-02-20', endDate: '2026-02-26', active: false, redemptions: 47 },
  { id: 4, name: 'Expiry Clearance', type: 'Percentage Discount', discount: 30, product: 'White Bread Loaf', category: 'Bakery', startDate: '2026-02-27', endDate: '2026-02-28', active: true, redemptions: 8 },
];

export default function OfferManager() {

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

  const [offers, setOffers] = useState(sampleOffers);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({ name: '', type: 'Percentage Discount', discount: '', product: '', startDate: '', endDate: '', notes: '' });

  const addOffer = () => {
    if (!form.name || !form.product) return;
    setOffers(prev => [...prev, { ...form, id: Date.now(), active: true, redemptions: 0, discount: +form.discount }]);
    setShowForm(false);
    setForm({ name: '', type: 'Percentage Discount', discount: '', product: '', startDate: '', endDate: '', notes: '' });
  };

  const toggleOffer = (id) => setOffers(prev => prev.map(o => o.id === id ? { ...o, active: !o.active } : o));
  const deleteOffer = (id) => setOffers(prev => prev.filter(o => o.id !== id));

  const filtered = filter === 'All' ? offers : filter === 'Active' ? offers.filter(o => o.active) : offers.filter(o => !o.active);

  const activeCount = offers.filter(o => o.active).length;
  const totalRedemptions = offers.reduce((s, o) => s + o.redemptions, 0);

  return (
    <div className="fade-up">
      <div className="kpi-grid rg-4" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-color': '#2d7a3a', '--kpi-bg': '#e8f5e9' }}>
          <div className="kpi-icon">🏷️</div>
          <div className="kpi-label">Active Offers</div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-change kpi-up">running now</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#7c3aed', '--kpi-bg': '#ede9fe' }}>
          <div className="kpi-icon">🎯</div>
          <div className="kpi-label">Total Redemptions</div>
          <div className="kpi-value">{totalRedemptions}</div>
          <div className="kpi-change kpi-up">this month</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-bg': '#fef3c7' }}>
          <div className="kpi-icon">⏰</div>
          <div className="kpi-label">Expiring Today</div>
          <div className="kpi-value">{offers.filter(o => o.endDate === new Date().toISOString().slice(0, 10)).length}</div>
          <div className="kpi-change kpi-down">ends today</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#1d4ed8', '--kpi-bg': '#dbeafe' }}>
          <div className="kpi-icon">📋</div>
          <div className="kpi-label">Total Offers</div>
          <div className="kpi-value">{offers.length}</div>
          <div className="kpi-change kpi-neutral">all time</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        {['All', 'Active', 'Inactive'].map(f => (
          <button key={f} className={`chip ${filter === f ? 'chip-active' : 'chip-inactive'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <button className="btn btn-green" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Offer'}
        </button>
      </div>

      {showForm && (
        <div className="card fade-up" style={{ marginBottom: 16, borderColor: '#25d366' }}>
          <div className="card-head"><div className="card-title">🏷️ Create New Offer</div></div>
          <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Offer Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Special" />
            </div>
            <div className="form-group">
              <label className="form-label">Offer Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {OFFER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discount %</label>
              <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Product *</label>
              <select value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}>
                <option value="">Select product...</option>
                {dbProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-green" onClick={addOffer} style={{ width: '100%' }}>✅ Create</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {filtered.map(o => {
          const typeColors = {
            'Percentage Discount': { bg: '#e8f5e9', color: '#2d7a3a' },
            'Buy X Get Y': { bg: '#dbeafe', color: '#1d4ed8' },
            'Flat Amount Off': { bg: '#fef3c7', color: '#92400e' },
            'Bundle Offer': { bg: '#ede9fe', color: '#7c3aed' },
          };
          const tc = typeColors[o.type] || typeColors['Percentage Discount'];
          return (
            <div key={o.id} className="card" style={{ borderLeft: `4px solid ${o.active ? '#43a047' : '#ccc'}`, opacity: o.active ? 1 : 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{o.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.color }}>{o.type}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: o.active ? '#e8f5e9' : '#f0f0f0', color: o.active ? '#2d7a3a' : '#888' }}>
                      {o.active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
                {o.discount > 0 && <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{o.discount}%<div style={{ fontSize: 10, color: '#999', fontWeight: 400, textAlign: 'center' }}>OFF</div></div>}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>📦 {o.product}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 12 }}>
                <span>📅 {o.startDate} → {o.endDate}</span>
                <span>🎯 {o.redemptions} used</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn btn-sm ${o.active ? 'btn-amber' : 'btn-green'}`} onClick={() => toggleOffer(o.id)} style={{ flex: 1 }}>
                  {o.active ? '⏸ Pause' : '▶ Activate'}
                </button>
                <button className="btn btn-red btn-sm" onClick={() => deleteOffer(o.id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}