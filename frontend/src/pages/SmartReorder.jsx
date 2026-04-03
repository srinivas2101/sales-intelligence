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
  'Rice & Grains': { name: 'Aachi Traders', phone: '9876543210', leadDays: 2 },
  'Dal & Pulses': { name: 'Sri Murugan Wholesale', phone: '9845678901', leadDays: 3 },
  'Atta & Flour': { name: 'Pillsbury Distributor', phone: '9712345678', leadDays: 2 },
  'Oils & Ghee': { name: 'Fortune Oils Depot', phone: '9600112233', leadDays: 1 },
  'Dairy': { name: 'Aavin Regional', phone: '9500223344', leadDays: 1 },
  'Spices & Masala': { name: 'MDH Distributor', phone: '9400334455', leadDays: 3 },
  'Vegetables': { name: 'Local Market', phone: '9300445566', leadDays: 1 },
  'Fruits': { name: 'Fresh Hub', phone: '9200556677', leadDays: 1 },
  'Snacks & Biscuits': { name: 'Britannia Dealer', phone: '9100667788', leadDays: 4 },
  'Beverages': { name: 'Coca-Cola Dist.', phone: '9988776655', leadDays: 3 },
  'Personal Care': { name: 'HUL Distributor', phone: '9977665544', leadDays: 5 },
  'Home Care': { name: 'P&G Distributor', phone: '9966554433', leadDays: 5 },
  'Bakery': { name: 'Local Bakery', phone: '9955443322', leadDays: 1 },
  'Frozen & Packed': { name: 'ITC Distributor', phone: '9944332211', leadDays: 3 },
  'Baby & Health': { name: 'Medical Dist.', phone: '9933221100', leadDays: 4 },
  'Stationery': { name: 'Classmate Dealer', phone: '9922110099', leadDays: 5 },
};

export default function SmartReorder() {

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

  const [ordered, setOrdered] = useState({});
  const [viewMode, setViewMode] = useState('priority');

  const reorderList = useMemo(() => {
    return dbProducts
      .filter(p => p.stock < p.reorder_point)
      .map(p => {
        const supplier = SUPPLIERS[p.category] || { name: 'General Supplier', phone: '', leadDays: 3 };
        const daysOfStock = p.stock > 0 ? Math.floor(p.stock / Math.max(1, p.reorder_point / 7)) : 0;
        const urgency = p.stock <= 0 ? 'critical' : p.stock < p.reorder_point * 0.3 ? 'high' : 'medium';
        const suggestedQty = Math.max(p.reorder_point * 3 - p.stock, p.reorder_point);
        const estimatedCost = suggestedQty * p.cost_price;
        const deliveryDate = new Date(Date.now() + supplier.leadDays * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return { ...p, supplier, daysOfStock, urgency, suggestedQty, estimatedCost, deliveryDate };
      })
      .sort((a, b) => {
        if (viewMode === 'priority') {
          const order = { critical: 0, high: 1, medium: 2 };
          return order[a.urgency] - order[b.urgency];
        }
        if (viewMode === 'cost') return b.estimatedCost - a.estimatedCost;
        return a.supplier.leadDays - b.supplier.leadDays;
      });
  }, [viewMode]);

  const totalCost = reorderList.reduce((s, p) => s + p.estimatedCost, 0);
  const criticalCount = reorderList.filter(p => p.urgency === 'critical').length;

  const groupedBySupplier = useMemo(() => {
    const map = {};
    reorderList.forEach(p => {
      const key = p.supplier.name;
      if (!map[key]) map[key] = { supplier: p.supplier, items: [], totalCost: 0 };
      map[key].items.push(p);
      map[key].totalCost += p.estimatedCost;
    });
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [reorderList]);

  const URGENCY_STYLE = {
    critical: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: '🚨 Critical' },
    high:     { bg: '#ffedd5', color: '#ea580c', border: '#fdba74', label: '🔴 High' },
    medium:   { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: '🟡 Medium' },
  };

  const orderProduct = (id) => setOrdered(prev => ({ ...prev, [id]: true }));
  const orderAll = () => {
    const allIds = {};
    reorderList.forEach(p => { allIds[p.id] = true; });
    setOrdered(allIds);
  };

  return (
    <div className="fade-up">
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-color': '#dc2626', '--kpi-bg': '#fee2e2' }}>
          <div className="kpi-icon">🚨</div>
          <div className="kpi-label">Critical Items</div>
          <div className="kpi-value">{criticalCount}</div>
          <div className="kpi-change kpi-down">order immediately</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-bg': '#fef3c7' }}>
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Total Reorder</div>
          <div className="kpi-value">{reorderList.length}</div>
          <div className="kpi-change kpi-neutral">items needed</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#1d4ed8', '--kpi-bg': '#dbeafe' }}>
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Total Investment</div>
          <div className="kpi-value">₹{(totalCost / 1000).toFixed(1)}K</div>
          <div className="kpi-change kpi-neutral">estimated cost</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#2d7a3a', '--kpi-bg': '#e8f5e9' }}>
          <div className="kpi-icon">✅</div>
          <div className="kpi-label">Ordered</div>
          <div className="kpi-value">{Object.keys(ordered).length}</div>
          <div className="kpi-change kpi-up">items processed</div>
        </div>
      </div>

      {/* AI Insight Box */}
      <div className="insight-box" style={{ marginBottom: 16 }}>
        🤖 <b>Smart Reorder Suggestion:</b> Order {criticalCount} critical items TODAY to avoid stockout loss.
        Group orders by supplier to save on delivery charges — <b>{groupedBySupplier.length} suppliers</b> needed.
        Best time to order: <b>Before 11 AM</b> for same-day processing.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['priority', '🎯 Priority'], ['cost', '💰 By Cost'], ['delivery', '🚚 By Delivery']].map(([v, l]) => (
            <button key={v} className={`chip ${viewMode === v ? 'chip-active' : 'chip-inactive'}`} onClick={() => setViewMode(v)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-green" style={{ marginLeft: 'auto' }} onClick={orderAll}>⚡ Order All ({reorderList.length})</button>
      </div>

      <div className="g2">
        {/* Reorder List */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📋 Reorder List</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reorderList.map(p => {
              const meta = CATEGORY_META[p.category];
              const ust = URGENCY_STYLE[p.urgency];
              const isOrdered = ordered[p.id];
              return (
                <div key={p.id} style={{ padding: '12px 16px', background: isOrdered ? '#f0fdf4' : '#fff', border: `1.5px solid ${isOrdered ? '#a5d6a7' : ust.border}`, borderRadius: 12, opacity: isOrdered ? 0.7 : 1, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{meta?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: ust.bg, color: ust.color }}>{ust.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                        <span>Stock: <b style={{ color: ust.color }}>{p.stock}</b></span>
                        <span>Order: <b style={{ color: '#1d4ed8' }}>{p.suggestedQty} units</b></span>
                        <span>Cost: <b style={{ color: '#2d7a3a' }}>₹{p.estimatedCost.toLocaleString('en-IN')}</b></span>
                        <span>🚚 Arrives: <b>{p.deliveryDate}</b></span>
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                        📦 {p.supplier.name} · 📞 {p.supplier.phone}
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${isOrdered ? 'btn-outline' : 'btn-green'}`}
                      onClick={() => orderProduct(p.id)}
                    >
                      {isOrdered ? '✅ Ordered' : '📤 Order'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grouped by Supplier */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🏪 Group by Supplier</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupedBySupplier.map(group => (
              <div key={group.supplier.name} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>🏪 {group.supplier.name}</div>
                    <div style={{ fontSize: 11, color: '#1d4ed8' }}>📞 {group.supplier.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#2d7a3a' }}>₹{group.totalCost.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{group.items.length} items</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: '#f7faf7', borderRadius: 6 }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.suggestedQty} units</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <a href={`tel:${group.supplier.phone}`} className="btn btn-green btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}>📞 Call</a>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => group.items.forEach(i => orderProduct(i.id))}>✅ Mark All Ordered</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}