import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rct-tooltip">
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#a5d6a7', fontSize: 11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#fff', fontSize: 12 }}>
          {p.name}: <strong>₹{Number(p.value)?.toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  );
};

// ── Dynamic confidence: continuous scoring, sensitive to small differences ──
const calcDynConf = (cat, price, stock, expiry, avgWeekly) => {
  const HIGH_FREQ = ['Dairy','Bakery','Snacks & Biscuits','Beverages'];
  const avgW = Math.max(1, avgWeekly || 1);

  // 1. Stock score 0-35 pts (continuous weeks coverage)
  const weeksCover = stock / avgW;
  const stockScore = Math.min(35, Math.round(weeksCover * 4.5));

  // 2. Expiry score 0-30 pts
  const expiryScore = expiry >= 365 ? 30 : expiry >= 180 ? 26 : expiry >= 90 ? 22
                    : expiry >= 30  ? 16 : expiry >= 14  ? 10 : expiry >= 7  ? 5
                    : expiry >= 3   ? 2  : 0;

  // 3. Price score 0-20 pts
  const priceScore = price < 30  ? 20 : price < 60  ? 18 : price < 100 ? 16
                   : price < 150 ? 14 : price < 200 ? 12 : price < 300 ? 9
                   : price < 400 ? 6  : 3;

  // 4. Category score 0-15 pts
  const catScore = HIGH_FREQ.includes(cat) ? 15
                 : ['Rice & Grains','Dal & Pulses','Atta & Flour'].includes(cat) ? 12 : 9;

  const total = stockScore + expiryScore + priceScore + catScore;
  return Math.min(94, Math.max(55, Math.round(55 + (total / 100) * 39)));
};

// ── Dynamic factors for display ──
const calcDynFactors = (cat, price, stock, expiry, avgWeekly) => {
  const avgW = Math.max(1, avgWeekly || 1);
  const HIGH_FREQ = ['Dairy','Bakery','Snacks & Biscuits','Beverages'];
  const stockDays   = Math.round(stock / avgW * 7);
  const weeksCover  = stock / avgW;
  const stockImpact = weeksCover >= 8 ? 28 : weeksCover >= 4 ? 20
                    : weeksCover >= 2 ? 12 : weeksCover >= 1 ? 5 : -15;
  const priceImpact = price < 30 ? 20 : price < 100 ? 14 : price < 200 ? 8
                    : price < 300 ? 2  : price < 400 ? -5  : -15;
  const dExp = expiry || 180;
  const expiryImpact= dExp >= 365 ? 15 : dExp >= 90 ? 10 : dExp >= 30 ? 3
                    : dExp >= 7   ? -8 : dExp >= 3  ? -18 : -25;
  const catImpact   = HIGH_FREQ.includes(cat) ? 18
                    : ['Rice & Grains','Dal & Pulses'].includes(cat) ? 12 : 8;
  return [
    { name:'Stock Level', impact: stockImpact,  value: stockDays + ' days coverage' },
    { name:'Category',    impact: catImpact,    value: cat },
    { name:'Price',       impact: priceImpact,  value: '₹' + price },
    { name:'Expiry',      impact: expiryImpact, value: dExp + ' days left' },
  ];
};


const genSmartFallback = (product) => {
  const DAY_MULT = { 0:1.35, 1:0.85, 2:0.80, 3:0.82, 4:0.90, 5:1.20, 6:1.45 };
  const CAT_BASE = {
    'Dairy':14,'Bakery':13,'Snacks & Biscuits':12,'Beverages':11,
    'Rice & Grains':10,'Dal & Pulses':9,'Atta & Flour':8,
    'Oils & Ghee':7,'Frozen & Packed':8,'Personal Care':5,'default':8
  };
  const month    = new Date().getMonth();
  const season   = month>=2&&month<=5?'summer':month>=6&&month<=8?'monsoon':'winter';
  const SEASON_MULT = { summer:1.05, monsoon:0.95, winter:1.10 };
  const base        = CAT_BASE[product.category] || CAT_BASE['default'];
  const priceFactor = Math.max(0.5, 1 - (product.price - 50) / 1200);
  const seasonMult  = SEASON_MULT[season] || 1.0;

  const weeks = Array.from({ length: 13 }, (_, w) => {
    const d       = new Date(Date.now() + w * 7 * 86400000);
    const label   = `W${w+1} ${d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`;
    const festival= [3,6,10].includes(w);
    let weekUnits = 0;
    for (let day = 0; day < 7; day++) {
      const dow      = (d.getDay() + day) % 7;
      const dayMult  = DAY_MULT[dow] || 1.0;
      const festMult = festival && dow === 6 ? 1.6 : 1.0;
      const noise    = 0.93 + (Math.sin((w*7+day)*13.7)*0.5+0.5)*0.14;
      weekUnits += base * priceFactor * seasonMult * dayMult * festMult * noise;
    }
    const units   = Math.round(weekUnits);
    const revenue = Math.round(units * product.price);
    const profit  = Math.round(units * (product.price - (product.cost_price || product.price * 0.72)));
    return { week:w+1, label, units, revenue, profit, confidence: Math.round(86-w*2), festival };
  });

  const totalUnits  = weeks.reduce((s,w) => s+w.units, 0);
  const totalRev    = weeks.reduce((s,w) => s+w.revenue, 0);
  const totalProfit = weeks.reduce((s,w) => s+w.profit, 0);
  const avgWeekly   = Math.round(totalUnits / 13);

  const months = {};
  weeks.forEach(w => {
    const d   = new Date(Date.now() + (w.week-1)*7*86400000);
    const key = d.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
    if (!months[key]) months[key] = { month:key, units:0, revenue:0, profit:0 };
    months[key].units   += w.units;
    months[key].revenue += w.revenue;
    months[key].profit  += w.profit;
  });

  const urgency = product.stock < avgWeekly ? 'HIGH'
                : product.stock < avgWeekly*2 ? 'MEDIUM' : 'LOW';

  const dynConf = calcDynConf(product.category, product.price, product.stock, product.expiry_days || 180, avgWeekly);

  return {
    total_units:        totalUnits,
    total_revenue:      totalRev,
    total_profit:       totalProfit,
    avg_weekly_units:   avgWeekly,
    overall_confidence: dynConf,
    weekly_forecast:    weeks,
    monthly_summary:    Object.values(months),
    reorder_suggestion: {
      quantity: Math.max(0, avgWeekly*4 - product.stock),
      urgency,
      reason: `Demand model: ~${avgWeekly} units/week. Stock ${product.stock} units (${Math.round(product.stock/Math.max(avgWeekly,1))} weeks left).`,
    },
    factors: calcDynFactors(product.category, product.price, product.stock, product.expiry_days || 180, avgWeekly),
  };
};

const genFallback = (product) => {
  const noise = (s) => {
    const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.15;
  };
  const dailyBase = product.price < 50 ? 14 : product.price < 100 ? 10 : product.price < 200 ? 7 : 4;
  const seed = product.id * 17 + product.price;

  const weeks = Array.from({ length: 13 }, (_, w) => {
    const d = new Date(Date.now() + w * 7 * 86400000);
    const label = `W${w + 1} ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
    const mult = 1 + noise(seed + w);
    const units = Math.round(dailyBase * 7 * mult);
    const revenue = Math.round(units * product.price);
    const profit = Math.round(units * (product.price - (product.cost_price || product.price * 0.72)));
    return { week: w + 1, label, units, revenue, profit, confidence: Math.round(78 - w * 1.2) };
  });

  const totalUnits = weeks.reduce((s, w) => s + w.units, 0);
  const totalRev   = weeks.reduce((s, w) => s + w.revenue, 0);
  const totalProfit= weeks.reduce((s, w) => s + w.profit, 0);
  const avgWF      = dailyBase * 7;

  const months = {};
  weeks.forEach(w => {
    const d = new Date(Date.now() + (w.week - 1) * 7 * 86400000);
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!months[key]) months[key] = { month: key, units: 0, revenue: 0, profit: 0 };
    months[key].units   += w.units;
    months[key].revenue += w.revenue;
    months[key].profit  += w.profit;
  });

  const dynConf = calcDynConf(product.category, product.price, product.stock, product.expiry_days || 180, avgWF);

  return {
    total_units:        totalUnits,
    total_revenue:      totalRev,
    total_profit:       totalProfit,
    avg_weekly_units:   Math.round(totalUnits / 13),
    overall_confidence: dynConf,
    weekly_forecast:    weeks,
    monthly_summary:    Object.values(months),
    reorder_suggestion: {
      quantity: Math.max(0, Math.round(dailyBase * 30 - product.stock)),
      urgency:  product.stock < dailyBase * 7 ? 'HIGH' : product.stock < dailyBase * 14 ? 'MEDIUM' : 'LOW',
      reason:   `Avg weekly demand ~${Math.round(avgWF)} units. Current stock: ${product.stock}.`,
    },
    factors: calcDynFactors(product.category, product.price, product.stock, product.expiry_days || 180, avgWF),
  };
};

export default function Prediction({ user }) {
  const [selected, setSelected] = useState(ALL_PRODUCTS[0]);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [live,     setLive]     = useState(false);
  const [search,   setSearch]   = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [viewMode, setViewMode] = useState('weekly');
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ALL_PRODUCTS.slice(0, 8);
    return ALL_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const runPrediction = async (product) => {
    setSelected(product);
    setSearch('');
    setShowDrop(false);
    setLoading(true);
    setLive(false);
    setResult(null);

    // Try ML service directly (Flask on port 5000)
    try {
      const mlRes = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:     product.id,
          category:       product.category,
          price:          product.price,
          stock:          product.stock,
          cost_price:     product.cost_price,
          days_to_expiry: product.expiry_days || 180,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (mlRes.ok) {
        const data = await mlRes.json();
        if (data?.weekly_forecast && data.weekly_forecast.length > 0) {
          // Recalculate confidence & factors from product attributes
          const mlAvgW  = data.avg_weekly_units || 1;
          const mlDynConf = calcDynConf(product.category, product.price, product.stock, product.expiry_days || 180, mlAvgW);
          const enriched = {
            ...data,
            overall_confidence: mlDynConf,
            factors: calcDynFactors(product.category, product.price, product.stock, product.expiry_days || 180, mlAvgW),
          };
          setResult(enriched);
          setLive(true);
          setLoading(false);
          return;
        }
      }
    } catch (_) {
      // ML service not running — use smart fallback below
    }

    // Smart fallback: real demand logic based on product attributes
    setResult(genSmartFallback(product));
    setLoading(false);
  };

  const D = result || genSmartFallback(selected);
  const meta = CATEGORY_META[selected.category] || {};
  const urgencyColor = { HIGH: '#dc2626', MEDIUM: '#f59e0b', LOW: '#2d7a3a' };

  const chartData = viewMode === 'weekly'
    ? (D.weekly_forecast || []).map(w => ({ name: w.label, revenue: w.revenue, units: w.units }))
    : (D.monthly_summary || []).map(m => ({ name: m.month, revenue: m.revenue, units: m.units }));

  return (
    <div className="fade-up">
      {!live && result && (
        <div className="alert alert-warn" style={{ marginBottom: 14 }}>
          📊 Smart forecast mode — Start ML service (python app.py) for live AI predictions
        </div>
      )}
      {live && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>
          ✅ Live ML prediction — 3-month forecast loaded
        </div>
      )}

      <div className="g2">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Search + Select Card */}
          <div className="card">
            <div className="card-head"><div className="card-title">🔍 Select Product</div></div>

            <div ref={dropRef} style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
                <input
                  placeholder="Search by name or category..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  style={{ paddingLeft: 36 }}
                />
              </div>

              {showDrop && (
                <div style={{
                  position:'absolute', top:'110%', left:0, right:0,
                  background:'#fff', border:'1.5px solid #d4e4d4',
                  borderRadius:12, boxShadow:'0 8px 28px rgba(15,31,16,0.14)',
                  zIndex:200, overflow:'hidden', maxHeight:300, overflowY:'auto'
                }}>
                  {filtered.length === 0
                    ? <div style={{ padding:'14px 16px', color:'#888', fontSize:13 }}>No products found</div>
                    : filtered.map(p => {
                        const pm = CATEGORY_META[p.category] || {};
                        const isActive = selected.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onMouseDown={() => runPrediction(p)}
                            style={{
                              display:'flex', alignItems:'center', gap:10,
                              padding:'10px 14px', width:'100%',
                              background: isActive ? '#e8f5e9' : '#fff',
                              border:'none', borderBottom:'1px solid #f0f4f0',
                              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                            }}
                          >
                            <div style={{
                              width:34, height:34, borderRadius:9,
                              background: pm.bg || '#f0f4f0',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:18, flexShrink:0
                            }}>
                              {pm.icon}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:700, fontSize:13, color:'#0f1f10', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                              <div style={{ fontSize:11, color:'#888' }}>{p.category} · ₹{p.price} · Stock: {p.stock}</div>
                            </div>
                            {isActive && <span style={{ color:'#2d7a3a', fontWeight:800 }}>✓</span>}
                          </button>
                        );
                      })
                  }
                </div>
              )}
            </div>

            {/* Selected Product Info */}
            <div style={{ padding:14, background:'#f7faf7', borderRadius:12, border:'1.5px solid #d4e4d4', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{
                  width:42, height:42, borderRadius:11,
                  background: meta.bg || '#e8f5e9',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22, flexShrink:0
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:14 }}>{selected.name}</div>
                  <div style={{ fontSize:11, color:'#6b7a6c' }}>{selected.category}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[['Price',`₹${selected.price}`],['Stock',`${selected.stock} units`],['Cost',`₹${selected.cost_price}`],['Reorder',selected.reorder_point]].map(([l,v]) => (
                  <div key={l} style={{ padding:'7px 10px', background:'#fff', borderRadius:8, border:'1px solid #e8f0e8' }}>
                    <div style={{ fontSize:10, color:'#888', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                    <div style={{ fontWeight:800, fontSize:13, marginTop:1 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-green" onClick={() => runPrediction(selected)} disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'11px' }}>
              {loading ? <><span className="spinner" /> Generating forecast...</> : '🔮 Get AI Prediction'}
            </button>
            {live && <div style={{ textAlign:'center', fontSize:11, color:'#2d7a3a', marginTop:6, fontWeight:700 }}>● Live ML Prediction</div>}
          </div>

          {/* Confidence */}
          <div className="card">
            <div className="card-head"><div className="card-title">📊 Confidence & Factors</div></div>
            <div style={{ textAlign:'center', margin:'8px 0 14px' }}>
              <div style={{ fontSize:44, fontWeight:900, lineHeight:1, color: D.overall_confidence >= 80 ? '#2d7a3a' : D.overall_confidence >= 60 ? '#f59e0b' : '#dc2626' }}>
                {D.overall_confidence}%
              </div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>Prediction Confidence</div>
            </div>
            <div className="progress-bar" style={{ marginBottom:16 }}>
              <div className="progress-fill" style={{ width:`${D.overall_confidence}%`, background:'linear-gradient(90deg,#2d7a3a,#43a047)' }} />
            </div>
            {(D.factors || []).map((f, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'#f7faf7', borderRadius:9, marginBottom:6 }}>
                <span style={{ fontWeight:600, fontSize:13 }}>{f.name}</span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#888' }}>{f.value}</span>
                  <span style={{ fontWeight:800, fontSize:12, color: f.impact > 0 ? '#2d7a3a' : f.impact < 0 ? '#dc2626' : '#888' }}>
                    {f.impact > 0 ? '+' : ''}{f.impact}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Reorder */}
          {D.reorder_suggestion && (
            <div className="card" style={{ borderLeft:`4px solid ${urgencyColor[D.reorder_suggestion.urgency] || '#888'}` }}>
              <div className="card-head"><div className="card-title">📦 Reorder Suggestion</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ padding:'4px 12px', borderRadius:20, fontWeight:800, fontSize:12, background: urgencyColor[D.reorder_suggestion.urgency]+'18', color: urgencyColor[D.reorder_suggestion.urgency] }}>
                  {D.reorder_suggestion.urgency} URGENCY
                </div>
                <div style={{ fontWeight:900, fontSize:20 }}>{D.reorder_suggestion.quantity} units</div>
              </div>
              <div style={{ fontSize:12.5, color:'#5a7a5c', lineHeight:1.5 }}>{D.reorder_suggestion.reason}</div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
            {[
              { icon:'💰', label:'3-Month Revenue', value:`₹${((D.total_revenue||0)/1000).toFixed(0)}K`, sub:'predicted', c:'#2d7a3a', bg:'#e8f5e9' },
              { icon:'📦', label:'Total Units',     value: D.total_units||0,                              sub:'91 days',   c:'#1d4ed8', bg:'#dbeafe' },
              { icon:'📊', label:'Avg / Week',      value: D.avg_weekly_units||0,                        sub:'units',     c:'#7c3aed', bg:'#ede9fe' },
            ].map(k => (
              <div key={k.label} className="kpi-card" style={{ '--kpi-color':k.c, '--kpi-bg':k.bg }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-change kpi-neutral">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">📈 {viewMode === 'weekly' ? '13-Week' : 'Monthly'} Revenue Forecast</div>
              <div style={{ display:'flex', gap:6 }}>
                {['weekly','monthly'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding:'5px 12px', borderRadius:8, border:'none',
                    fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer',
                    background: viewMode===m ? '#2d7a3a' : '#f0f4f0',
                    color: viewMode===m ? '#fff' : '#5a7a5c',
                    transition:'all 0.15s'
                  }}>
                    {m === 'weekly' ? '13 Weeks' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2d7a3a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2d7a3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4e4d4" />
                <XAxis dataKey="name" stroke="#9eb8a3" tick={{ fontSize:9 }} interval={viewMode==='weekly' ? 2 : 0} />
                <YAxis stroke="#9eb8a3" tick={{ fontSize:10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="revenue" stroke="#2d7a3a" strokeWidth={2.5} fill="url(#fGrad)" name="Revenue" strokeDasharray={viewMode==='weekly' ? '6 3' : '0'} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Units Bar Chart */}
          <div className="card">
            <div className="card-head"><div className="card-title">📦 Units by {viewMode === 'weekly' ? 'Week' : 'Month'}</div></div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4e4d4" vertical={false} />
                <XAxis dataKey="name" stroke="#9eb8a3" tick={{ fontSize:9 }} interval={viewMode==='weekly' ? 2 : 0} />
                <YAxis stroke="#9eb8a3" tick={{ fontSize:10 }} />
                <Tooltip content={<CT />} />
                <Bar dataKey="units" name="Units" radius={[4,4,0,0]}>
                  {chartData.map((_,i) => <Cell key={i} fill={i%2===0?'#43a047':'#66bb6a'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Table */}
          {D.monthly_summary?.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="card-title">📅 Monthly Breakdown</div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Month</th><th>Units</th><th>Revenue</th><th>Profit</th></tr>
                  </thead>
                  <tbody>
                    {D.monthly_summary.map((m, i) => (
                      <tr key={i}>
                        <td><strong>{m.month}</strong></td>
                        <td>{m.units}</td>
                        <td style={{ color:'#2d7a3a', fontWeight:700 }}>₹{m.revenue?.toLocaleString('en-IN')}</td>
                        <td style={{ color:'#1d4ed8', fontWeight:700 }}>₹{m.profit?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}