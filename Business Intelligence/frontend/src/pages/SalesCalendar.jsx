import React, { useState, useMemo, useEffect } from 'react';
import { salesAPI } from '../api/service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FESTIVALS = {
  '2026-01-14':'🌾 Pongal','2026-01-26':'🇮🇳 Republic Day','2026-03-25':'🎨 Holi',
  '2026-04-14':'🎊 Tamil New Year','2026-04-02':'✝️ Good Friday',
  '2026-05-01':'⚙️ Labour Day','2026-08-15':'🇮🇳 Independence Day',
  '2026-08-19':'🐘 Ganesh Chaturthi','2026-10-02':'🙏 Gandhi Jayanti',
  '2026-10-20':'🪔 Diwali','2026-12-25':'🎄 Christmas',
};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CAT_COLORS = {
  'Dairy':'#3b82f6','Rice & Grains':'#f59e0b','Dal & Pulses':'#84cc16',
  'Snacks & Biscuits':'#f97316','Beverages':'#06b6d4','Oils & Ghee':'#fb923c',
  'Spices & Masala':'#f43f5e','Atta & Flour':'#d97706','Vegetables':'#22c55e',
  'Personal Care':'#ec4899','Bakery':'#a16207','Home Care':'#8b5cf6',
};

// ── Modal ───────────────────────────────────────────────────────────────────
function ProductsModal({ date, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products'); // 'products' | 'bills'
  const [expandedBill, setExpandedBill] = useState(null);
  const INR = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_BASE || 'http://localhost/sales-intelligence/backend/api'}/sales.php?type=date_products&date=${date}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  const displayDate = new Date(date).toLocaleDateString('en-IN', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  const totalRevenue = data?.products?.reduce((s,p) => s + parseFloat(p.revenue||0), 0) || 0;
  const totalProfit  = data?.products?.reduce((s,p) => s + parseFloat(p.profit||0), 0) || 0;
  const totalQty     = data?.products?.reduce((s,p) => s + parseInt(p.qty||0), 0) || 0;
  const totalBills   = data?.bills?.length || 0;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center',
      padding:24, backdropFilter:'blur(4px)'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:860,
        maxHeight:'88vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,0.25)',
        border:'1px solid #d4e4d4', overflow:'hidden'
      }}>
        {/* Header */}
        <div style={{
          background:'linear-gradient(135deg,#0f2d14,#1a4d1f)',
          padding:'18px 24px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0
        }}>
          <div>
            <div style={{color:'#fff', fontWeight:800, fontSize:16}}>📅 {displayDate}</div>
            <div style={{color:'rgba(255,255,255,0.5)', fontSize:11, marginTop:2}}>
              Sales breakdown — products sold & bill-wise detail
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)',
            borderRadius:10, color:'#fff', width:34, height:34, cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center'
          }}>✕</button>
        </div>

        {loading ? (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            flexDirection:'column', gap:12, color:'#6b7280'}}>
            <div style={{fontSize:32}}>⏳</div>
            <div style={{fontSize:13}}>Loading sales data...</div>
          </div>
        ) : !data?.products?.length ? (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            flexDirection:'column', gap:12, color:'#6b7280'}}>
            <div style={{fontSize:48}}>📭</div>
            <div style={{fontWeight:700, fontSize:15, color:'#374151'}}>No sales data for this date</div>
            <div style={{fontSize:12}}>Upload the daily bills Excel to see breakdown</div>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(4,1fr)',
              gap:1, background:'#d4e4d4', borderBottom:'1px solid #d4e4d4', flexShrink:0
            }}>
              {[
                { icon:'💰', label:'Revenue',    val: INR(totalRevenue), color:'#2d7a3a' },
                { icon:'💹', label:'Profit',     val: INR(totalProfit),  color:'#0ea5e9' },
                { icon:'📦', label:'Units Sold', val: totalQty,          color:'#7c3aed' },
                { icon:'🧾', label:'Bills',      val: totalBills,        color:'#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{
                  background:'#f7faf7', padding:'14px 18px', textAlign:'center'
                }}>
                  <div style={{fontSize:18, marginBottom:3}}>{k.icon}</div>
                  <div style={{fontWeight:800, fontSize:18, color:k.color}}>{k.val}</div>
                  <div style={{fontSize:10, color:'#8faa90', textTransform:'uppercase',
                    letterSpacing:'.5px', marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{
              display:'flex', gap:0, borderBottom:'2px solid #e8f5e9', flexShrink:0,
              padding:'0 24px', background:'#fff'
            }}>
              {[
                { key:'products', label:`📦 Products (${data.products.length})` },
                { key:'bills',    label:`🧾 Bills (${totalBills})` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding:'12px 20px', border:'none', background:'none', cursor:'pointer',
                  fontWeight:700, fontSize:12, color: tab===t.key ? '#2d7a3a' : '#8faa90',
                  borderBottom: tab===t.key ? '2px solid #2d7a3a' : '2px solid transparent',
                  marginBottom:'-2px', transition:'all .15s'
                }}>{t.label}</button>
              ))}
            </div>

            {/* Body */}
            <div style={{flex:1, overflowY:'auto', padding:'0 0 8px'}}>

              {/* PRODUCTS TAB */}
              {tab === 'products' && (
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                  <thead>
                    <tr style={{background:'#f7faf7', position:'sticky', top:0, zIndex:1}}>
                      {['#','Product','Category','Qty Sold','Unit Price','Revenue','Profit','% of Day'].map(h => (
                        <th key={h} style={{
                          padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:800,
                          color:'#5a7a5c', textTransform:'uppercase', letterSpacing:'.5px',
                          borderBottom:'1px solid #d4e4d4'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p, i) => {
                      const catColor = CAT_COLORS[p.category] || '#6b7280';
                      const pct = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} style={{borderBottom:'1px solid #f0f4f0'}}
                          onMouseEnter={e => e.currentTarget.style.background='#f7faf7'}
                          onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                          <td style={{padding:'10px 14px', color:'#8faa90', fontWeight:700}}>{i+1}</td>
                          <td style={{padding:'10px 14px', fontWeight:600, color:'#0f1f10', maxWidth:200}}>
                            {p.name}
                          </td>
                          <td style={{padding:'10px 14px'}}>
                            <span style={{
                              display:'inline-block', padding:'2px 8px', borderRadius:20,
                              fontSize:10, fontWeight:700,
                              background: catColor + '18', color: catColor
                            }}>{p.category}</span>
                          </td>
                          <td style={{padding:'10px 14px', fontWeight:700, color:'#374151'}}>
                            {p.qty} units
                          </td>
                          <td style={{padding:'10px 14px', color:'#5a7a5c'}}>{INR(p.price)}</td>
                          <td style={{padding:'10px 14px', fontWeight:700, color:'#2d7a3a'}}>
                            {INR(p.revenue)}
                          </td>
                          <td style={{padding:'10px 14px', color:'#0ea5e9', fontWeight:600}}>
                            {INR(p.profit)}
                          </td>
                          <td style={{padding:'10px 14px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:6}}>
                              <div style={{width:60, background:'#e8f5e9', borderRadius:10, height:6, overflow:'hidden'}}>
                                <div style={{width:`${Math.min(pct,100)}%`, height:6, background:'#2d7a3a', borderRadius:10}}/>
                              </div>
                              <span style={{fontSize:11, color:'#5a7a5c', fontWeight:600}}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* BILLS TAB */}
              {tab === 'bills' && (
                <div style={{padding:'8px 0'}}>
                  {data.bills.map((bill, i) => {
                    const isOpen = expandedBill === bill.bill_no;
                    return (
                      <div key={bill.bill_no} style={{
                        margin:'6px 16px', borderRadius:12,
                        border:'1px solid ' + (isOpen ? '#86efac' : '#e8f5e9'),
                        overflow:'hidden', background:'#fff',
                        boxShadow: isOpen ? '0 4px 12px rgba(45,122,58,.1)' : 'none',
                        transition:'all .15s'
                      }}>
                        {/* Bill header row — clickable */}
                        <div onClick={() => setExpandedBill(isOpen ? null : bill.bill_no)}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'12px 16px', cursor:'pointer',
                            background: isOpen ? '#f0fdf4' : '#fff',
                          }}>
                          <div style={{display:'flex', alignItems:'center', gap:12}}>
                            <span style={{
                              fontWeight:800, fontSize:11, color:'#2d7a3a',
                              background:'#dcfce7', padding:'3px 10px', borderRadius:20
                            }}>{bill.bill_no}</span>
                            <span style={{fontWeight:600, fontSize:13, color:'#0f1f10'}}>
                              {bill.customer || 'Walk-in'}
                            </span>
                            <span style={{
                              fontSize:10, fontWeight:700, color:'#7c3aed',
                              background:'#f5f3ff', padding:'2px 8px', borderRadius:20
                            }}>{bill.payment}</span>
                            <span style={{fontSize:11, color:'#8faa90'}}>
                              {bill.items.length} item{bill.items.length>1?'s':''}
                            </span>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <span style={{fontWeight:800, fontSize:15, color:'#0f2d14'}}>
                              {INR(bill.bill_total)}
                            </span>
                            <span style={{color:'#8faa90', fontSize:14}}>
                              {isOpen ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Expanded items */}
                        {isOpen && (
                          <div style={{borderTop:'1px solid #e8f5e9'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                              <thead>
                                <tr style={{background:'#f7faf7'}}>
                                  {['Product','Category','Qty','Unit Price','Disc','Amount'].map(h => (
                                    <th key={h} style={{
                                      padding:'8px 14px', textAlign:'left', fontSize:10,
                                      fontWeight:800, color:'#5a7a5c', textTransform:'uppercase',
                                      letterSpacing:'.5px'
                                    }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {bill.items.map((item, j) => {
                                  const catColor = CAT_COLORS[item.category] || '#6b7280';
                                  return (
                                    <tr key={j} style={{borderTop:'1px solid #f0f4f0'}}>
                                      <td style={{padding:'8px 14px', fontWeight:600, color:'#374151'}}>
                                        {item.product_name}
                                      </td>
                                      <td style={{padding:'8px 14px'}}>
                                        <span style={{
                                          fontSize:10, fontWeight:700,
                                          color:catColor, background:catColor+'18',
                                          padding:'2px 7px', borderRadius:20
                                        }}>{item.category}</span>
                                      </td>
                                      <td style={{padding:'8px 14px', fontWeight:700}}>{item.quantity}</td>
                                      <td style={{padding:'8px 14px', color:'#5a7a5c'}}>
                                        {INR(item.unit_price)}
                                      </td>
                                      <td style={{padding:'8px 14px', color: item.discount>0?'#dc2626':'#9ca3af'}}>
                                        {item.discount > 0 ? `-${item.discount}%` : '—'}
                                      </td>
                                      <td style={{padding:'8px 14px', fontWeight:700, color:'#2d7a3a'}}>
                                        {INR(item.total_amount)}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr style={{background:'#f0fdf4', borderTop:'2px solid #86efac'}}>
                                  <td colSpan={5} style={{
                                    padding:'8px 14px', fontWeight:800,
                                    color:'#0f2d14', textAlign:'right'
                                  }}>Bill Total</td>
                                  <td style={{padding:'8px 14px', fontWeight:900,
                                    color:'#0f2d14', fontSize:14}}>{INR(bill.bill_total)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalesCalendar() {
  const today = new Date();
  const [yr,  setYr]  = useState(today.getFullYear());
  const [mo,  setMo]  = useState(today.getMonth());
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState(null); // date string for modal
  const [liveData, setLiveData] = useState({});
  const [live,    setLive]    = useState(false);
  const [loading, setLoading] = useState(true);
  const INR = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits:0 });

  useEffect(() => {
    salesAPI.getCalendar().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const m = {}; data.forEach(d => { m[d.date] = d; });
        setLiveData(m); setLive(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const mKey = `${yr}-${pad(mo+1)}`;
  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const firstDay    = new Date(yr, mo, 1).getDay();
  const todayKey    = today.toISOString().slice(0,10);

  const mData    = Object.entries(liveData).filter(([k]) => k.startsWith(mKey));
  const mRevenue = mData.reduce((s,[,v]) => s + parseFloat(v.revenue||0), 0);
  const mProfit  = mData.reduce((s,[,v]) => s + parseFloat(v.profit||0),  0);
  const mBills   = mData.reduce((s,[,v]) => s + parseInt(v.bills||0),     0);
  const mDays    = mData.length;
  const maxRev   = Math.max(...mData.map(([,v]) => parseFloat(v.revenue||0)), 1);

  const getColor = rev => {
    if (!rev) return null;
    const p = rev / maxRev;
    if (p > 0.85) return { bg:'#1a4a1f', txt:'#fff' };
    if (p > 0.65) return { bg:'#2d7a3a', txt:'#fff' };
    if (p > 0.45) return { bg:'#43a047', txt:'#fff' };
    if (p > 0.25) return { bg:'#a5d6a7', txt:'#1a4a1f' };
    return { bg:'#e8f5e9', txt:'#1a4a1f' };
  };

  const weeklyBars = [];
  for (let d = 1; d <= daysInMonth; d += 7) {
    const wRev = Array.from({length:7},(_,i) => d+i).filter(x => x <= daysInMonth).reduce((s,x) => {
      return s + parseFloat(liveData[`${mKey}-${pad(x)}`]?.revenue||0);
    }, 0);
    weeklyBars.push({ week:`W${Math.ceil(d/7)}`, revenue:Math.round(wRev) });
  }

  const prevMonth = () => { if(mo===0){setMo(11);setYr(y=>y-1);}else setMo(m=>m-1); setSel(null); };
  const nextMonth = () => { if(mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+1); setSel(null); };

  return (
    <div className="fade-up">
      {/* Modal */}
      {modal && <ProductsModal date={modal} onClose={() => setModal(null)} />}

      {/* Live status */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
          {live ? `🔴 Live DB — ${Object.keys(liveData).length} days with sales` : loading ? '⏳ Loading...' : '📅 No sales data yet — upload daily bills to see calendar'}
        </div>
      </div>

      {!live && !loading && (
        <div className="card" style={{textAlign:'center',padding:40,background:'#fffbeb',border:'2px dashed #fcd34d',marginBottom:16}}>
          <div style={{fontSize:48,marginBottom:10}}>📅</div>
          <div style={{fontWeight:800,fontSize:18,color:'#92400e',marginBottom:8}}>No Sales Data Yet</div>
          <div style={{color:'#78350f',marginBottom:12}}>Upload today's bills → Calendar auto-fills with live data</div>
          <div style={{background:'#fef3c7',borderRadius:8,padding:'10px 20px',display:'inline-block',fontSize:13,color:'#92400e'}}>📤 <strong>Daily Bills Upload</strong> → Upload Excel</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{marginBottom:16}}>
        {[
          {icon:'💰',label:`${MONTHS[mo]} Revenue`,val:INR(mRevenue),color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💹',label:`${MONTHS[mo]} Profit`,val:INR(mProfit),sub:`${mRevenue>0?((mProfit/mRevenue)*100).toFixed(1):0}% margin`,color:'#0ea5e9',bg:'#f0f9ff'},
          {icon:'🧾',label:'Total Bills',val:mBills,color:'#7c3aed',bg:'#f5f3ff'},
          {icon:'📊',label:'Days Recorded',val:mDays,sub:mRevenue>0?`avg ${INR(mRevenue/Math.max(mDays,1))}/day`:'—',color:'#f59e0b',bg:'#fffbeb'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            {k.sub&&<div className="kpi-change kpi-up" style={{fontSize:10}}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16}}>
        {/* CALENDAR */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <button onClick={prevMonth} style={{background:'#e8f5e9',border:'none',borderRadius:10,padding:'8px 18px',fontWeight:800,cursor:'pointer',color:'#2d7a3a',fontSize:18}}>‹</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:800,fontSize:20,color:'#0f2d14'}}>{MONTHS[mo]} {yr}</div>
              <div style={{color:'#6b7280',fontSize:12}}>Sales Calendar · Click any day for details</div>
            </div>
            <button onClick={nextMonth} style={{background:'#e8f5e9',border:'none',borderRadius:10,padding:'8px 18px',fontWeight:800,cursor:'pointer',color:'#2d7a3a',fontSize:18}}>›</button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
            {DAYS.map(d=>(
              <div key={d} style={{textAlign:'center',fontWeight:700,fontSize:11,color:d==='Sun'||d==='Sat'?'#dc2626':'#6b7280',padding:'4px 0',borderBottom:'2px solid #f0f0f0'}}>{d}</div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
            {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const key = `${mKey}-${pad(d)}`;
              const entry   = liveData[key];
              const rev     = entry ? parseFloat(entry.revenue||0) : null;
              const bills   = entry ? parseInt(entry.bills||0) : null;
              const fest    = FESTIVALS[key];
              const isToday = key === todayKey;
              const isFuture= new Date(key) > today;
              const isSel   = sel === key;
              const col     = getColor(rev);

              return (
                <div key={d} onClick={() => { if(entry) setSel(isSel?null:key); }}
                  style={{
                    minHeight:68, borderRadius:10, padding:'6px 8px',
                    cursor:entry?'pointer':'default',
                    background:isSel?'#0f2d14':col?col.bg:isFuture?'#f9fafb':'#f8fafc',
                    border:isToday?'2.5px solid #2d7a3a':isSel?'2px solid #43a047':'1.5px solid transparent',
                    opacity:isFuture?0.45:1, transition:'all 0.15s',
                    boxShadow:entry&&!isFuture?'0 2px 8px rgba(45,122,58,.1)':'none',
                  }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <span style={{fontWeight:isToday?900:600,fontSize:13,color:isSel?'#fff':col?col.txt:'#374151'}}>{d}</span>
                    {fest&&<span style={{fontSize:12}}>{fest.split(' ')[0]}</span>}
                  </div>
                  {rev&&(
                    <div style={{marginTop:3}}>
                      <div style={{fontSize:11,fontWeight:800,color:isSel?'#a5d6a7':col?col.txt:'#2d7a3a'}}>
                        {rev>=1000?`₹${(rev/1000).toFixed(1)}K`:INR(rev)}
                      </div>
                      <div style={{fontSize:10,color:isSel?'#86efac':col&&col.bg!=='#e8f5e9'?'#c8e6c9':'#6b7280'}}>{bills} bills</div>
                    </div>
                  )}
                  {isToday&&!entry&&!isFuture&&<div style={{fontSize:9,color:'#2d7a3a',fontWeight:800,marginTop:4,letterSpacing:0.5}}>TODAY</div>}
                </div>
              );
            })}
          </div>

          {/* Day detail panel — now with 5 boxes */}
          {sel && liveData[sel] && (()=>{
            const d    = liveData[sel];
            const fest = FESTIVALS[sel];
            const selDate = new Date(sel);
            return (
              <div style={{marginTop:18,padding:18,background:'linear-gradient(135deg,#f0fdf4,#e8f5e9)',borderRadius:14,border:'1.5px solid #86efac'}}>
                <div style={{fontWeight:800,color:'#0f2d14',marginBottom:14,fontSize:15}}>
                  📅 {selDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                  {fest&&<span style={{marginLeft:8,fontSize:13}}>{fest}</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
                  {/* 4 existing boxes */}
                  {[
                    {l:'Revenue',   v:INR(d.revenue), i:'💰'},
                    {l:'Profit',    v:INR(d.profit),  i:'💹'},
                    {l:'Bills',     v:d.bills,         i:'🧾'},
                    {l:'Units Sold',v:d.units,         i:'📦'},
                  ].map(k=>(
                    <div key={k.l} style={{background:'#fff',borderRadius:10,padding:'12px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                      <div style={{fontSize:20,marginBottom:4}}>{k.i}</div>
                      <div style={{fontWeight:800,color:'#0f2d14',fontSize:15}}>{k.v}</div>
                      <div style={{color:'#6b7280',fontSize:11}}>{k.l}</div>
                    </div>
                  ))}
                  {/* 5th box — Products Sold button */}
                  <div
                    onClick={() => setModal(sel)}
                    style={{
                      background:'linear-gradient(135deg,#0f2d14,#1a4d1f)',
                      borderRadius:10, padding:'12px', textAlign:'center',
                      boxShadow:'0 4px 16px rgba(15,45,20,.3)',
                      cursor:'pointer', transition:'all .15s',
                      border:'1.5px solid rgba(102,187,106,.3)',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(15,45,20,.4)';}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 16px rgba(15,45,20,.3)';}}
                  >
                    <div style={{fontSize:20,marginBottom:4}}>🔍</div>
                    <div style={{fontWeight:800,color:'#fff',fontSize:13}}>Products</div>
                    <div style={{color:'#86efac',fontSize:10,marginTop:2}}>Tap to view →</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Legend */}
          <div style={{marginTop:14,display:'flex',gap:12,flexWrap:'wrap',fontSize:10,color:'#6b7280',justifyContent:'center'}}>
            {[['#1a4a1f','Excellent (>85%)'],['#2d7a3a','Very Good'],['#43a047','Good'],['#a5d6a7','Moderate'],['#e8f5e9','Low']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:12,height:12,borderRadius:3,background:c,border:'1px solid rgba(0,0,0,.1)'}}/>{l}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card" style={{padding:16}}>
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:12,fontSize:13}}>📊 Weekly Revenue — {MONTHS[mo]}</div>
            {weeklyBars.some(w=>w.revenue>0)?(
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyBars} margin={{top:0,right:0,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="week" tick={{fontSize:10}}/>
                  <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:9}}/>
                  <Tooltip formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'Revenue']}/>
                  <Bar dataKey="revenue" radius={[4,4,0,0]}>
                    {weeklyBars.map((_,i)=><Cell key={i} fill={['#2d7a3a','#4caf50','#81c784','#a5d6a7'][i%4]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ):<div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:12}}>No data this month</div>}
          </div>

          <div className="card" style={{padding:16}}>
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:10,fontSize:13}}>🎉 Upcoming Festivals</div>
            {Object.entries(FESTIVALS)
              .filter(([k])=>new Date(k)>=today&&new Date(k)<=new Date(today.getTime()+60*24*60*60*1000))
              .sort(([a],[b])=>new Date(a)-new Date(b))
              .slice(0,4)
              .map(([k,v])=>{
                const days=Math.ceil((new Date(k)-today)/(24*60*60*1000));
                return(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f0fdf4',fontSize:12}}>
                    <span>{v}</span>
                    <span style={{fontWeight:700,color:days<=7?'#dc2626':'#2d7a3a',fontSize:11}}>{days}d away</span>
                  </div>
                );
              })}
          </div>

          {mData.length>0&&(
            <div className="card" style={{padding:16}}>
              <div style={{fontWeight:700,color:'#0f2d14',marginBottom:10,fontSize:13}}>🏆 Best Days</div>
              {mData.sort(([,a],[,b])=>parseFloat(b.revenue||0)-parseFloat(a.revenue||0)).slice(0,3).map(([k,v],i)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'8px 10px',background:['#e8f5e9','#f0f9ff','#f5f3ff'][i],borderRadius:8}}>
                  <span style={{fontWeight:700,fontSize:12}}>
                    {['🥇','🥈','🥉'][i]} {new Date(k).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  </span>
                  <span style={{fontWeight:800,color:['#2d7a3a','#0ea5e9','#7c3aed'][i],fontSize:12}}>{INR(v.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}