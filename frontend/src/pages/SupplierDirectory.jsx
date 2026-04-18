import React, { useState } from 'react';

const INITIAL_SUPPLIERS = [
  { id: 1, name: 'Aachi Traders', contact: 'Ramesh', phone: '9876543210', email: 'aachi@gmail.com', category: 'Rice & Grains', city: 'Chennai', lastOrder: '2026-02-20', paymentDue: 4500, rating: 5, totalOrders: 34, notes: 'Reliable, delivers on time' },
  { id: 2, name: 'Sri Murugan Wholesale', contact: 'Karthik', phone: '9845678901', email: 'srimurugan@gmail.com', category: 'Dal & Pulses', city: 'Madurai', lastOrder: '2026-02-18', paymentDue: 0, rating: 4, totalOrders: 21, notes: 'Good quality, negotiate prices' },
  { id: 3, name: 'Fortune Oils Depot', contact: 'Vijay', phone: '9712345678', email: 'fortune@gmail.com', category: 'Oils & Ghee', city: 'Chennai', lastOrder: '2026-02-22', paymentDue: 12000, rating: 5, totalOrders: 45, notes: 'Best oil supplier, bulk discounts' },
  { id: 4, name: 'Aavin Regional', contact: 'Sundaram', phone: '9600112233', email: 'aavin@tn.gov.in', category: 'Dairy', city: 'Salem', lastOrder: '2026-02-26', paymentDue: 3200, rating: 4, totalOrders: 120, notes: 'Daily delivery, govt. supplier' },
  { id: 5, name: 'Britannia Dealer', contact: 'Anand', phone: '9500223344', email: 'britannia@gmail.com', category: 'Snacks & Biscuits', city: 'Chennai', lastOrder: '2026-02-15', paymentDue: 0, rating: 3, totalOrders: 18, notes: 'Sometimes delays delivery' },
  { id: 6, name: 'HUL Distributor', contact: 'Priya', phone: '9400334455', email: 'hul@dist.com', category: 'Personal Care', city: 'Chennai', lastOrder: '2026-02-10', paymentDue: 8700, rating: 5, totalOrders: 29, notes: 'Wide range of products' },
  { id: 7, name: 'Local Bakery', contact: 'Mani', phone: '9300445566', email: '', category: 'Bakery', city: 'Local', lastOrder: '2026-02-27', paymentDue: 1200, rating: 4, totalOrders: 78, notes: 'Fresh daily, cash payment only' },
  { id: 8, name: 'MDH Distributor', contact: 'Selvam', phone: '9200556677', email: 'mdh@dist.com', category: 'Spices & Masala', city: 'Trichy', lastOrder: '2026-02-19', paymentDue: 0, rating: 5, totalOrders: 32, notes: 'Premium quality spices' },
];

const StarRating = ({ rating }) => (
  <span>{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ color: i < rating ? '#f59e0b' : '#ddd', fontSize: 14 }}>★</span>)}</span>
);

export default function SupplierDirectory() {
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', category: '', city: '', notes: '', rating: 4 });

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalDue = suppliers.reduce((s, sup) => s + sup.paymentDue, 0);

  const saveSupplier = () => {
    if (!form.name) return;
    if (editId) {
      setSuppliers(prev => prev.map(s => s.id === editId ? { ...s, ...form, rating: +form.rating } : s));
    } else {
      setSuppliers(prev => [...prev, { ...form, id: Date.now(), rating: +form.rating, paymentDue: 0, totalOrders: 0, lastOrder: '-' }]);
    }
    setShowForm(false); setEditId(null);
    setForm({ name: '', contact: '', phone: '', email: '', category: '', city: '', notes: '', rating: 4 });
  };

  const handleEdit = (s) => {
    setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, category: s.category, city: s.city, notes: s.notes, rating: s.rating });
    setEditId(s.id); setShowForm(true); setSelected(null);
  };

  const deleteSupplier = (id) => { setSuppliers(prev => prev.filter(s => s.id !== id)); if (selected?.id === id) setSelected(null); };

  return (
    <div className="fade-up">
      <div className="kpi-grid rg-4" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-color': '#2d7a3a', '--kpi-bg': '#e8f5e9' }}>
          <div className="kpi-icon">🏪</div>
          <div className="kpi-label">Total Suppliers</div>
          <div className="kpi-value">{suppliers.length}</div>
          <div className="kpi-change kpi-neutral">active partners</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#dc2626', '--kpi-bg': '#fee2e2' }}>
          <div className="kpi-icon">💳</div>
          <div className="kpi-label">Payment Due</div>
          <div className="kpi-value">₹{(totalDue / 1000).toFixed(1)}K</div>
          <div className="kpi-change kpi-down">pending payment</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-bg': '#fef3c7' }}>
          <div className="kpi-icon">⭐</div>
          <div className="kpi-label">Avg Rating</div>
          <div className="kpi-value">{(suppliers.reduce((s, sup) => s + sup.rating, 0) / suppliers.length).toFixed(1)}</div>
          <div className="kpi-change kpi-neutral">out of 5</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#1d4ed8', '--kpi-bg': '#dbeafe' }}>
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{suppliers.reduce((s, sup) => s + sup.totalOrders, 0)}</div>
          <div className="kpi-change kpi-up">all time</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input placeholder="Search supplier, category, city..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-green" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', contact: '', phone: '', email: '', category: '', city: '', notes: '', rating: 4 }); }}>
          {showForm && !editId ? '✕ Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="card fade-up" style={{ marginBottom: 16, borderColor: '#4caf50' }}>
          <div className="card-head"><div className="card-title">{editId ? '✏️ Edit Supplier' : '➕ New Supplier'}</div></div>
          <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Company Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Rice & Grains" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Chennai" />
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <select value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}>
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)} ({r}/5)</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-green" onClick={saveSupplier} style={{ width: '100%' }}>{editId ? '💾 Update' : '✅ Add'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Last Order</th>
                <th>Due Amount</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)} style={{ cursor: 'pointer', background: selected?.id === s.id ? '#e8f5e9' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>📍 {s.city}</div>
                  </td>
                  <td><span className="badge badge-green" style={{ fontSize: 11 }}>{s.category}</span></td>
                  <td>
                    <div style={{ fontSize: 13 }}>{s.contact}</div>
                    <div style={{ fontSize: 11, color: '#1d4ed8' }}>📞 {s.phone}</div>
                  </td>
                  <td style={{ fontSize: 12, color: '#666' }}>{s.lastOrder}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.paymentDue > 0 ? '#dc2626' : '#2d7a3a', fontSize: 13 }}>
                      {s.paymentDue > 0 ? `₹${s.paymentDue.toLocaleString('en-IN')}` : '✓ Clear'}
                    </span>
                  </td>
                  <td><StarRating rating={s.rating} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(s)}>✏️</button>
                      <a href={`tel:${s.phone}`} className="btn btn-green btn-sm" style={{ textDecoration: 'none' }}>📞</a>
                      <button className="btn btn-red btn-sm" onClick={() => deleteSupplier(s.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card fade-up" style={{ alignSelf: 'flex-start', borderColor: '#4caf50' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="card-title">🏪 {selected.name}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ padding: '10px', background: '#f7faf7', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 3 }}>CONTACT</div>
                <div style={{ fontWeight: 700 }}>{selected.contact}</div>
                <div style={{ color: '#1d4ed8' }}>📞 {selected.phone}</div>
                {selected.email && <div style={{ color: '#666' }}>✉️ {selected.email}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ padding: '8px', background: '#f7faf7', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>TOTAL ORDERS</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.totalOrders}</div>
                </div>
                <div style={{ padding: '8px', background: selected.paymentDue > 0 ? '#fee2e2' : '#e8f5e9', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>DUE</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: selected.paymentDue > 0 ? '#dc2626' : '#2d7a3a' }}>
                    {selected.paymentDue > 0 ? `₹${selected.paymentDue.toLocaleString()}` : 'Clear'}
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px', background: '#f7faf7', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>RATING</div>
                <StarRating rating={selected.rating} />
              </div>
              {selected.notes && (
                <div style={{ padding: '10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#555' }}>
                  💡 {selected.notes}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <a href={`tel:${selected.phone}`} className="btn btn-green" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', textAlign: 'center' }}>📞 Call</a>
                {selected.email && <a href={`mailto:${selected.email}`} className="btn btn-outline" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', textAlign: 'center' }}>✉️ Email</a>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
