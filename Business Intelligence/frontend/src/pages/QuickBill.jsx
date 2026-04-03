import React, { useState, useMemo } from 'react';
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


const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Credit'];

export default function QuickBill() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [billDone, setBillDone] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  const [dbProducts, setDbProducts] = React.useState(ALL_PRODUCTS);

  React.useEffect(() => {
    productsAPI.getAll()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDbProducts(data.map(p => ({
            ...p, price: parseFloat(p.price)||0, cost_price: parseFloat(p.cost_price)||0,
            stock: parseInt(p.stock)||0
          })));
        }
      }).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    return dbProducts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
    ).slice(0, 6);
  }, [search]);

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === product.id);
      if (exists) return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...product, qty: 1 }];
    });
    setSearch('');
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeItem = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = (subtotal * discount / 100);
  const total = subtotal - discountAmt;
  const gst = (total * 0.05).toFixed(2);

  const handleBill = () => {
    if (cart.length === 0) return;
    const bill = {
      billNo: `BILL-${Date.now().toString().slice(-6)}`,
      customer: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal,
      discount: discountAmt,
      gst: +gst,
      total,
      payment,
      time: new Date().toLocaleTimeString('en-IN'),
      date: new Date().toLocaleDateString('en-IN'),
    };
    setLastBill(bill);
    setBillDone(true);
  };

  const newBill = () => {
    setCart([]);
    setSearch('');
    setDiscount(0);
    setCustomerName('');
    setPayment('Cash');
    setBillDone(false);
    setLastBill(null);
  };

  if (billDone && lastBill) {
    return (
      <div className="fade-up" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ borderColor: '#4caf50', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2d7a3a', marginBottom: 4 }}>Bill Generated!</div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>{lastBill.billNo} · {lastBill.date} · {lastBill.time}</div>

          <div style={{ background: '#f7faf7', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>🧾 {lastBill.customer}</div>
            {lastBill.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #e8f5e9' }}>
                <span>{item.name} × {item.qty}</span>
                <span className="mono" style={{ fontWeight: 600 }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                <span>Subtotal</span><span>₹{lastBill.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {lastBill.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#dc2626' }}>
                <span>Discount</span><span>-₹{lastBill.discount.toFixed(2)}</span>
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                <span>GST (5%)</span><span>₹{lastBill.gst}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#2d7a3a', marginTop: 8, paddingTop: 8, borderTop: '2px solid #a5d6a7' }}>
                <span>Total</span><span>₹{lastBill.total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>
                💳 Paid via {lastBill.payment}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>🖨 Print</button>
            <button className="btn btn-green" style={{ flex: 1 }} onClick={newBill}>+ New Bill</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, height: 'calc(100vh - 140px)' }}>

        {/* Left: Product Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🔍 Add Products</div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Customer Name (Optional)</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
            </div>
            <div className="search-wrap" style={{ position: 'relative' }}>
              <span className="search-icon">🛒</span>
              <input
                placeholder="Search & add product..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {suggestions.map(p => {
                  const meta = CATEGORY_META[p.category];
                  return (
                    <button key={p.id} onClick={() => addToCart(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f7faf7', border: '1.5px solid #d4e4d4', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#e8f5e9'; e.currentTarget.style.borderColor = '#4caf50'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f7faf7'; e.currentTarget.style.borderColor = '#d4e4d4'; }}>
                      <span style={{ fontSize: 20 }}>{meta?.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{p.category} · Stock: {p.stock}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#2d7a3a', fontSize: 15 }}>₹{p.price}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="card" style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🛒 Cart ({cart.length} items)</div>
            {cart.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛒</div>
                <div className="empty-text">Cart is empty</div>
                <div className="empty-sub">Search and add products above</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef4ee' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>₹{item.price} each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #d4e4d4', background: '#f7faf7', cursor: 'pointer', fontWeight: 700 }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #a5d6a7', background: '#e8f5e9', cursor: 'pointer', fontWeight: 700, color: '#2d7a3a' }}>+</button>
                    </div>
                    <span className="mono" style={{ fontWeight: 800, minWidth: 60, textAlign: 'right' }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    <button onClick={() => removeItem(item.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bill Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>💰 Bill Summary</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#666' }}>Subtotal</span>
                <span className="mono" style={{ fontWeight: 700 }}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666', fontSize: 13, flex: 1 }}>Discount</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 5, 10, 15, 20].map(d => (
                    <button key={d} onClick={() => setDiscount(d)} style={{ padding: '3px 8px', borderRadius: 6, border: `1.5px solid ${discount === d ? '#2d7a3a' : '#d4e4d4'}`, background: discount === d ? '#e8f5e9' : '#fff', color: discount === d ? '#2d7a3a' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{d}%</button>
                  ))}
                </div>
              </div>

              {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#dc2626' }}>
                <span>Discount ({discount}%)</span>
                <span className="mono" style={{ fontWeight: 700 }}>-₹{discountAmt.toFixed(2)}</span>
              </div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                <span>GST (5%)</span>
                <span className="mono">₹{gst}</span>
              </div>

              <div style={{ height: 1, background: '#d4e4d4', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, color: '#2d7a3a' }}>
                <span>Total</span>
                <span className="mono">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setPayment(m)} style={{ padding: '8px', borderRadius: 8, border: `2px solid ${payment === m ? '#2d7a3a' : '#d4e4d4'}`, background: payment === m ? '#e8f5e9' : '#fff', color: payment === m ? '#2d7a3a' : '#666', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                    {m === 'Cash' ? '💵' : m === 'UPI' ? '📱' : m === 'Card' ? '💳' : '📋'} {m}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-green" style={{ width: '100%', padding: 14, fontSize: 16, justifyContent: 'center', borderRadius: 12 }} onClick={handleBill} disabled={cart.length === 0}>
              🧾 Generate Bill · ₹{total.toLocaleString('en-IN')}
            </button>
          </div>

          <div style={{ padding: '12px 16px', background: '#e8f5e9', border: '1.5px solid #a5d6a7', borderRadius: 12, fontSize: 12, color: '#2d7a3a', fontWeight: 600 }}>
            💡 Tip: Type product name to search. Press + / − to adjust quantity.
          </div>
        </div>
      </div>
    </div>
  );
}