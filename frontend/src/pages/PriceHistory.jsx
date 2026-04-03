import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_META, ALL_PRODUCTS } from '../data/products';
import { productsAPI, priceHistoryAPI, API_BASE } from '../api/service';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1a4a1f', borderRadius:10, padding:'10px 14px', boxShadow:'0 8px 24px rgba(0,0,0,.35)' }}>
      <div style={{ color:'#a5d6a7', fontWeight:700, marginBottom:6, fontSize:11 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:'#fff', fontSize:11, marginBottom:2 }}>
          <span style={{ color:p.color }}>{p.name}: </span>
          <strong>{INR(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function PriceHistory({ user }) {
  const [products,      setProducts]      = useState(ALL_PRODUCTS);
  const [live,          setLive]          = useState(false);
  const [search,        setSearch]        = useState('');
  const [cat,           setCat]           = useState('All');
  const [selected,      setSelected]      = useState(null);
  const [history,       setHistory]       = useState([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [recentChanges, setRecentChanges] = useState([]);
  const [rcLoading,     setRcLoading]     = useState(true);
  const [onlinePrices,  setOnlinePrices]  = useState(null);   // { results, cached }
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError,   setOnlineError]   = useState('');

  const _onlineCache = React.useRef({});

  const fetchOnlinePrice = async (p) => {
    setOnlinePrices(null);
    setOnlineError('');
    setOnlineLoading(true);
    try {
      // Check in-memory cache (1 hour)
      const cached = _onlineCache.current[p.name];
      if (cached && (Date.now() - cached.ts) < 3600000) {
        setOnlinePrices({ results: cached.results, cached: true });
        setOnlineLoading(false);
        return;
      }

      // Call PHP proxy (avoids CORS)
      const res  = await fetch(`${API_BASE}/serp_proxy.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: p.name }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      _onlineCache.current[p.name] = { ts: Date.now(), results: data.results };
      setOnlinePrices({ results: data.results, cached: false });
    } catch (e) {
      setOnlineError(e.message || 'Failed to fetch');
    } finally {
      setOnlineLoading(false);
    }
  };

  useEffect(() => {
    productsAPI.getAll().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(p => ({
          ...p,
          price:      parseFloat(p.price)      || 0,
          cost_price: parseFloat(p.cost_price) || 0,
          stock:      parseInt(p.stock)         || 0,
        })));
        setLive(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    priceHistoryAPI.getAll()
      .then(data => { if (Array.isArray(data)) setRecentChanges(data); })
      .catch(() => {})
      .finally(() => setRcLoading(false));
  }, []);

  const selectProduct = p => {
    setSelected(p);
    setHistory([]);
    setHistLoading(true);
    setOnlinePrices(null);
    setOnlineError('');
    priceHistoryAPI.getByProduct(p.id).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const sorted = [...data].reverse();
        const chartData = sorted.map(h => ({
          date:    fmtDate(h.changed_at),
          Price:   parseFloat(h.new_price),
          Cost:    parseFloat(h.new_cost),
          changed: h.changed_by,
        }));
        const last = chartData[chartData.length - 1];
        if (last && last.Price !== p.price) {
          chartData.push({ date:'Now', Price:p.price, Cost:p.cost_price, changed:'' });
        }
        setHistory(chartData);
      } else {
        setHistory([]);
      }
    }).catch(() => setHistory([])).finally(() => setHistLoading(false));
  };

  const filtered = useMemo(() =>
    products.filter(p =>
      (cat === 'All' || p.category === cat) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
  [products, cat, search]);

  const categories    = ['All', ...Object.keys(CATEGORY_META)];
  const avgPrice      = products.length > 0 ? Math.round(products.reduce((s,p) => s+p.price, 0) / products.length) : 0;
  const avgMargin     = products.length > 0 ? (products.reduce((s,p) => s+((p.price-p.cost_price)/Math.max(p.price,1)*100), 0) / products.length).toFixed(1) : 0;
  const highestMargin = [...products].sort((a,b) => ((b.price-b.cost_price)/b.price) - ((a.price-a.cost_price)/a.price))[0];
  const totalChanges  = recentChanges.reduce((s,r) => s + (parseInt(r.change_count)||0), 0);

  return (
    <div className="fade-up">

      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, fontSize:12, color:live?'#2d7a3a':'#f59e0b' }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:live?'#43a047':'#f59e0b', display:'inline-block' }}/>
        {live ? `🔴 Live DB — ${products.length} products` : '📊 Demo mode'}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { icon:'💰', label:'Avg Selling Price',    val:INR(avgPrice),   sub:'Across all products',                                   color:'#2d7a3a', bg:'#e8f5e9' },
          { icon:'📊', label:'Avg Margin',            val:`${avgMargin}%`, sub:'Across catalog',                                        color:'#0ea5e9', bg:'#f0f9ff' },
          { icon:'🏆', label:'Highest Margin',
            val: highestMargin?.name?.split(' ').slice(0,2).join(' ') || '—',
            sub: highestMargin ? `${INR(highestMargin.price)} · ${((highestMargin.price-highestMargin.cost_price)/highestMargin.price*100).toFixed(0)}%` : '',
            color:'#f59e0b', bg:'#fffbeb' },
          { icon:'📝', label:'Price Changes Logged',
            val: rcLoading ? '…' : totalChanges,
            sub: rcLoading ? 'Loading…' : `${recentChanges.length} products edited`,
            color: totalChanges > 0 ? '#7c3aed' : '#9ca3af',
            bg:   totalChanges > 0 ? '#f5f3ff' : '#f9fafb' },
        ].map(k => (
          <div key={k.label} className="kpi-card" style={{ '--kpi-color':k.color, '--kpi-bg':k.bg }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize:k.label==='Highest Margin'?13:undefined }}>{k.val}</div>
            {k.sub && <div className="kpi-change kpi-neutral" style={{ fontSize:10 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap:16 }}>
        <div>

          {recentChanges.length > 0 && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:'#92400e', marginBottom:8 }}>🕑 Recently Changed Prices</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {recentChanges.slice(0,8).map(r => {
                  const diff = parseFloat(r.new_price) - parseFloat(r.old_price);
                  const up   = diff >= 0;
                  return (
                    <div key={r.product_id}
                      onClick={() => { const p = products.find(x => x.id === r.product_id); if(p) selectProduct(p); }}
                      style={{ background:'#fff', border:`1px solid ${up?'#bbf7d0':'#fecaca'}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:11 }}>
                      <div style={{ fontWeight:700, color:'#0f2d14', marginBottom:2 }}>{r.product_name}</div>
                      <div style={{ color: up?'#059669':'#dc2626' }}>
                        {INR(r.old_price)} → {INR(r.new_price)}
                        <span style={{ marginLeft:4 }}>{up?'▲':'▼'} {Math.abs(diff).toFixed(0)}</span>
                      </div>
                      <div style={{ color:'#9ca3af', fontSize:10, marginTop:2 }}>{fmtDate(r.changed_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!rcLoading && recentChanges.length === 0 && (
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:12, padding:'12px 16px', marginBottom:12, fontSize:12, color:'#0369a1' }}>
              ℹ️ No price changes logged yet. Edit a product's price in <strong>Products & Stock</strong> — it will be tracked here automatically.
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search product..."
              style={{ flex:1, padding:'9px 14px', borderRadius:10, border:'1.5px solid #d1fae5', fontSize:13, outline:'none' }}/>
            <select value={cat} onChange={e => setCat(e.target.value)}
              style={{ padding:'9px 14px', borderRadius:10, border:'1.5px solid #d1fae5', fontSize:12, background:'#fff', cursor:'pointer' }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Product</th><th>Category</th><th>Sell Price</th><th>Cost</th><th>Margin</th><th>Changes</th><th>History</th></tr>
              </thead>
              <tbody>
                {filtered.slice(0,50).map(p => {
                  const meta   = CATEGORY_META[p.category];
                  const margin = p.price>0 ? ((p.price-p.cost_price)/p.price*100).toFixed(1) : 0;
                  const rc     = recentChanges.find(r => r.product_id === p.id);
                  return (
                    <tr key={p.id} onClick={() => selectProduct(p)}
                      style={{ cursor:'pointer', background: selected?.id===p.id ? '#f0fdf4' : 'transparent' }}>
                      <td>
                        <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{p.unit}</div>
                      </td>
                      <td><span style={{ padding:'3px 8px', borderRadius:20, background:meta?.bg, color:meta?.color, fontSize:11, fontWeight:700 }}>{meta?.icon} {p.category}</span></td>
                      <td><span className="mono" style={{ fontWeight:700, color:'#0f2d14' }}>{INR(p.price)}</span></td>
                      <td><span className="mono" style={{ color:'#6b7280' }}>{INR(p.cost_price)}</span></td>
                      <td><span style={{ fontWeight:700, color:margin>25?'#059669':margin>15?'#d97706':'#dc2626' }}>{margin}%</span></td>
                      <td>
                        {rc
                          ? <span style={{ background:'#f5f3ff', color:'#7c3aed', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{rc.change_count} edits</span>
                          : <span style={{ color:'#d1d5db', fontSize:11 }}>—</span>}
                      </td>
                      <td><button className="btn btn-outline btn-sm">📈 View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (() => {
          return (
            <div className="card fade-up" style={{ alignSelf:'flex-start', position:'sticky', top:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <div>
                  <div style={{ fontWeight:800, color:'#0f2d14', fontSize:15 }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{CATEGORY_META[selected.category]?.icon} {selected.category}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#888' }}>✕</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { l:'Current Price', v:INR(selected.price),     c:'#0f2d14' },
                  { l:'Cost Price',    v:INR(selected.cost_price), c:'#6b7280' },
                  { l:'Margin',        v:`${((selected.price-selected.cost_price)/Math.max(selected.price,1)*100).toFixed(1)}%`, c:'#2d7a3a' },
                  { l:'Stock',         v:selected.stock,           c:'#374151' },
                ].map(s => (
                  <div key={s.l} style={{ background:'#f7faf7', borderRadius:8, padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#888' }}>{s.l}</div>
                    <div style={{ fontWeight:800, color:s.c, fontSize:15 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* ── ONLINE PRICE CHECKER ── */}
              <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0f2d14' }}>🌐 Online Market Prices</div>
                  <button
                    onClick={() => fetchOnlinePrice(selected)}
                    disabled={onlineLoading}
                    style={{ padding:'5px 12px', borderRadius:8, border:'none', background: onlineLoading?'#e5e7eb':'#0ea5e9', color:'#fff', fontSize:11, fontWeight:700, cursor: onlineLoading?'not-allowed':'pointer' }}>
                    {onlineLoading ? '⏳ Fetching…' : onlinePrices ? '🔄 Refresh' : '🔍 Check Now'}
                  </button>
                </div>

                {!onlinePrices && !onlineLoading && !onlineError && (
                  <div style={{ fontSize:11, color:'#0369a1', textAlign:'center', padding:'8px 0' }}>
                    Click "Check Now" to fetch real online prices for <strong>{selected.name}</strong>
                  </div>
                )}
                {onlineLoading && (
                  <div style={{ textAlign:'center', padding:'12px 0', fontSize:12, color:'#0369a1' }}>⏳ Searching Google Shopping…</div>
                )}
                {onlineError && (
                  <div style={{ fontSize:11, color:'#dc2626', padding:'6px 8px', background:'#fee2e2', borderRadius:6 }}>❌ {onlineError}</div>
                )}
                {onlinePrices && onlinePrices.results.length === 0 && (
                  <div style={{ fontSize:11, color:'#92400e', textAlign:'center', padding:'8px 0' }}>😕 No online prices found for this product</div>
                )}
                {onlinePrices && onlinePrices.results.length > 0 && (
                  <>
                    {onlinePrices.cached && <div style={{ fontSize:10, color:'#6b7280', marginBottom:6 }}>⚡ Cached result</div>}
                    <div style={{ fontSize:10, color:'#92400e', background:'#fef3c7', borderRadius:6, padding:'5px 8px', marginBottom:6 }}>
                      ⚠️ Sizes/variants may differ — check product name before comparing
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {onlinePrices.results.map((r, i) => {
                        const diff = r.price - selected.price;
                        const cheaper = diff > 0;
                        const sizeMatch = r.title.match(/(\d+\s*(?:kg|g|ml|l|ltr|gm|pieces?|pcs?|pack|tabs?|capsules?|caps?|nos?|count|x\s*\d+|\d+\s*x)[\s\w]*)/gi);
                        const sizeTag = sizeMatch ? sizeMatch.slice(0,2).join(', ') : null;
                        return (
                          <div key={i} style={{ background:'#fff', borderRadius:8, padding:'8px 10px', border:`1px solid ${cheaper?'#bbf7d0':'#fecaca'}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                              <div style={{ flex:1, paddingRight:8 }}>
                                <div style={{ fontWeight:700, fontSize:11, color:'#374151' }}>{r.source}</div>
                                {sizeTag && <div style={{ display:'inline-block', marginTop:3, background:'#eff6ff', color:'#1d4ed8', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>📦 {sizeTag}</div>}
                                <div style={{ fontSize:10, color:'#9ca3af', marginTop:3, lineHeight:1.4 }}>{r.title}</div>
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontWeight:800, fontSize:13, color:'#0f2d14' }}>{INR(r.price)}</div>
                                <div style={{ fontSize:10, fontWeight:700, color: cheaper?'#059669':'#dc2626' }}>
                                  {cheaper ? `▼ ₹${Math.abs(diff).toFixed(0)} costlier` : `▲ ₹${Math.abs(diff).toFixed(0)} cheaper`}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, padding:'7px 10px', background:'#fff', borderRadius:8, border:'1px solid #e5e7eb' }}>
                      <span style={{ fontSize:11, color:'#6b7280' }}>Online Avg</span>
                      <span style={{ fontWeight:800, fontSize:12, color:'#374151' }}>
                        {INR(Math.round(onlinePrices.results.reduce((s,r)=>s+r.price,0)/onlinePrices.results.length))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* ── PRICE HISTORY CHART ── */}
              {histLoading ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#9ca3af', fontSize:13 }}>⏳ Loading history…</div>
              ) : history.length > 0 ? (
                <>
                  <div style={{ fontWeight:700, color:'#0f2d14', marginBottom:10, fontSize:13 }}>📈 Price History ({history.length} points)</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={history} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2d7a3a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2d7a3a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="date" tick={{ fontSize:9 }} interval="preserveStartEnd"/>
                      <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize:9 }} width={42}/>
                      <Tooltip content={<TT/>}/>
                      <Area type="monotone" dataKey="Price" name="Sell Price" stroke="#2d7a3a" fill="url(#priceGrad)" strokeWidth={2} dot={{ r:4, fill:'#2d7a3a' }}/>
                      <Area type="monotone" dataKey="Cost"  name="Cost Price" stroke="#f59e0b" fill="url(#costGrad)"  strokeWidth={1.5} dot={{ r:3, fill:'#f59e0b' }} strokeDasharray="4 4"/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', gap:14, justifyContent:'center', marginTop:8, fontSize:11, color:'#6b7280' }}>
                    <span><span style={{ display:'inline-block', width:20, height:3, background:'#2d7a3a', marginRight:5, verticalAlign:'middle' }}/>Sell Price</span>
                    <span><span style={{ display:'inline-block', width:20, height:3, background:'#f59e0b', marginRight:5, verticalAlign:'middle' }}/>Cost Price</span>
                  </div>
                  <div style={{ fontWeight:700, color:'#0f2d14', margin:'14px 0 8px', fontSize:12 }}>🗒️ Change Log</div>
                  <div style={{ maxHeight:140, overflowY:'auto' }}>
                    {history.filter(h => h.changed !== '').reverse().map((h, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'6px 0', borderBottom:'1px solid #f3f4f6' }}>
                        <span style={{ color:'#374151' }}>{h.date}</span>
                        <span style={{ fontWeight:700, color:'#0f2d14' }}>{INR(h.Price)}</span>
                        <span style={{ color:'#9ca3af' }}>{h.changed}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9ca3af' }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>📋</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>No price changes yet</div>
                  <div style={{ fontSize:11, marginTop:4 }}>Edit this product's price in<br/><strong>Products & Stock</strong> to start tracking.</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
