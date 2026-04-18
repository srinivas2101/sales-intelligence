import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { dashboardAPI, productsAPI, salesAPI } from '../api/service';

const P = ['#2d7a3a','#4caf50','#f59e0b','#3b82f6','#f43f5e','#8b5cf6','#06b6d4','#fb923c'];
const INR = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const K   = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(1)}K`:INR(n);

const TT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'#1a4a1f',borderRadius:10,padding:'10px 14px',boxShadow:'0 8px 24px rgba(0,0,0,.35)'}}>
      <div style={{color:'#a5d6a7',fontWeight:700,marginBottom:6,fontSize:12}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:'#fff',fontSize:12,marginBottom:2}}>
          <span style={{color:p.color}}>{p.name}: </span><strong>{INR(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

const Empty = ({h,icon,msg}) => (
  <div style={{height:h,display:'flex',alignItems:'center',justifyContent:'center',
    color:'#9ca3af',fontSize:12,flexDirection:'column',gap:6}}>
    <span style={{fontSize:28}}>{icon}</span>{msg}
  </div>
);

export default function Dashboard() {
  const [dash,     setDash]     = useState(null);
  const [trend,    setTrend]    = useState([]);
  const [catRev,   setCatRev]   = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [products, setProducts] = useState(ALL_PRODUCTS);
  const [payData,  setPayData]  = useState([]);
  const [live,     setLive]     = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [ts,       setTs]       = useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    Promise.all([
      dashboardAPI.get(),
      productsAPI.getAll(),
      salesAPI.get('?type=by_payment&period=30'),
    ]).then(([d, prods, pay])=>{

      if(d){
        if(d.salesTrend?.length)
          setTrend(d.salesTrend.map(x=>({
            date:    new Date(x.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),
            Revenue: Math.round(parseFloat(x.revenue)||0),
            Profit:  Math.round(parseFloat(x.profit)||0),
            Bills:   parseInt(x.bills)||0,
          })));
        if(d.topProducts?.length)
          setTopProds(d.topProducts.map(p=>({
            name:    p.name.split(' ').slice(0,3).join(' '),
            revenue: Math.round(parseFloat(p.revenue)||0),
            units:   parseInt(p.units)||0,
          })));
        if(d.alerts?.length)   setAlerts(d.alerts);
        if(d.catRevenue?.length)
          setCatRev(d.catRevenue
            .map((c,i)=>({cat:c.category,icon:CATEGORY_META[c.category]?.icon||'📦',revenue:Math.round(parseFloat(c.revenue)||0),color:P[i%8]}))
            .sort((a,b)=>b.revenue-a.revenue));
        setDash(d); setLive(true);
      }

      if(Array.isArray(prods)&&prods.length)
        setProducts(prods.map(p=>({
          ...p,
          stock:         parseInt(p.stock)||0,
          reorder_point: parseInt(p.reorder_point)||20,
          expiry_days:   parseInt(p.expiry_days)||365,
        })));

      // Strict filter — only known payment methods, never product names
      const KNOWN_PAYMENTS = ['upi','cash','gpay','card','phonepe','paytm','netbanking','cheque','credit card','debit card','neft','rtgs'];
      if(Array.isArray(pay)&&pay.length){
        const valid = pay.filter(p =>
          p.payment_method != null &&
          p.payment_method !== undefined &&
          KNOWN_PAYMENTS.includes(String(p.payment_method).toLowerCase().trim())
        );
        if(valid.length)
          setPayData(valid.map(p=>({
            name:  p.payment_method,
            value: Math.round(parseFloat(p.revenue)||0),
            count: parseInt(p.count)||0,
          })));
      }
      setTs(new Date());
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ load(); },[load]);

  const todayRev    = dash?.revenue?.today        || 0;
  const todayG      = dash?.revenue?.growth       || 0;
  const weekRev     = dash?.revenue?.week         || 0;
  const monthRev    = dash?.revenue?.month        || 0;
  const monthProfit = dash?.revenue?.month_profit || 0;
  const billsToday  = dash?.bills_today           || 0;
  const avgBill     = billsToday>0 ? Math.round(todayRev/billsToday) : 0;
  const lowStock    = products.filter(p=>p.stock<p.reorder_point&&p.stock>0).length;
  const outOfStock  = products.filter(p=>p.stock===0).length;
  const marginPct   = monthRev>0 ? ((monthProfit/monthRev)*100).toFixed(1) : 0;
  const catPie      = catRev.slice(0,6).map(c=>({name:c.cat,value:c.revenue}));

  const kpis = [
    {icon:'💰',label:"Today's Revenue", val:K(todayRev),        sub:`${todayG>=0?'▲':'▼'} ${Math.abs(todayG)}% vs yesterday`, up:todayG>=0, color:'#2d7a3a',bg:'#e8f5e9'},
    {icon:'🧾',label:"Today's Bills",   val:billsToday,          sub:`avg ${INR(avgBill)} / bill`,   color:'#1d4ed8',bg:'#dbeafe'},
    {icon:'📅',label:'This Week',       val:K(weekRev),          sub:'7-day total',                  color:'#7c3aed',bg:'#f5f3ff'},
    {icon:'📊',label:'Monthly Revenue', val:K(monthRev),         sub:'30-day total',                 color:'#0ea5e9',bg:'#f0f9ff'},
    {icon:'💹',label:'Monthly Profit',  val:K(monthProfit),      sub:`${marginPct}% margin`,         color:'#059669',bg:'#ecfdf5'},
    {icon:'⚠️',label:'Stock Alerts',   val:lowStock+outOfStock,  sub:`${outOfStock} out of stock`,  color:'#dc2626',bg:'#fee2e2'},
  ];

  return (
    <div className="fade-up">

      {/* Status bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
          {live?'🔴 Live DB Connected':loading?'⏳ Loading...':'📊 Demo mode'}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {ts&&<span style={{fontSize:10,color:'#9ca3af'}}>Updated {ts.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
          <button onClick={load} style={{background:'#e8f5e9',border:'none',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,color:'#2d7a3a',cursor:'pointer'}}>⟳ Refresh</button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.slice(0,2).map((a,i)=>(
        <div key={i} className={`alert ${a.type==='expiry'||a.type==='warning'?'alert-warn':'alert-crit'}`} style={{marginBottom:5,fontSize:12}}>
          {a.type==='expiry'?'⏰':'⚠️'} <strong>{a.message}</strong>
        </div>
      ))}

      {/* KPI row */}
      <div className="kpi-grid" style={{marginBottom:14}}>
        {kpis.map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className={`kpi-change ${k.up===false?'kpi-down':'kpi-up'}`} style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ROW 1: Revenue trend + Category bar */}
      <div className="rg-split" style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:12}}>

        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:800,color:'#0f2d14',marginBottom:10,fontSize:13}}>
            📈 Revenue — Last 30 Days
            <span style={{background:'#dcfce7',color:'#166534',fontSize:9,padding:'2px 7px',borderRadius:10,marginLeft:6}}>● Live</span>
          </div>
          {trend.length>0?(
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trend} margin={{top:4,right:8,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d7a3a" stopOpacity={0.3}/><stop offset="95%" stopColor="#2d7a3a" stopOpacity={0}/></linearGradient>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4caf50" stopOpacity={0.2}/><stop offset="95%" stopColor="#4caf50" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="date" tick={{fontSize:9}} interval={4}/>
                <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:9}}/>
                <Tooltip content={<TT/>}/>
                <Area type="monotone" dataKey="Revenue" stroke="#2d7a3a" fill="url(#rg)" strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="Profit"  stroke="#4caf50" fill="url(#pg)" strokeWidth={1.5} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<Empty h={185} icon="📈" msg="Upload bills to see revenue trend"/>}
        </div>

        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:800,color:'#0f2d14',marginBottom:10,fontSize:13}}>🏷️ Revenue by Category</div>
          {catRev.length>0?(
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={catRev.slice(0,7)} layout="vertical" margin={{top:0,right:28,left:0,bottom:0}}>
                <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:8}}/>
                <YAxis type="category" dataKey="cat" tick={{fontSize:9}} width={85}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="revenue" name="Revenue" radius={[0,4,4,0]}>
                  {catRev.slice(0,7).map((_,i)=><Cell key={i} fill={P[i%8]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<Empty h={185} icon="🏷️" msg="No category data yet"/>}
        </div>
      </div>

      {/* ROW 2: Top Products + Payment & Pie stacked */}
      <div className="rg-split" style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:12}}>

        <div className="card" style={{padding:14,paddingBottom:8}}>
          <div style={{fontWeight:800,color:'#0f2d14',marginBottom:10,fontSize:13}}>🏆 Top Products (30 days)</div>
          {topProds.length>0?(
            <ResponsiveContainer width="100%" height={195}>
              <BarChart data={topProds.slice(0,6)} margin={{top:0,right:8,left:0,bottom:55}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:9,fill:'#374151'}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:9}} width={38}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]} maxBarSize={52}>
                  {topProds.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%8]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<Empty h={195} icon="🏆" msg="No sales data yet"/>}
        </div>

        {/* Right column — Payment + Category Pie stacked, no empty space */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          <div className="card" style={{padding:14}}>
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:10,fontSize:13}}>💳 Payment Methods</div>
            {payData.length>0?(
              payData.map((p,i)=>{
                const tot = payData.reduce((s,x)=>s+x.value,0);
                const pct = tot>0 ? ((p.value/tot)*100).toFixed(0) : 0;
                return(
                  <div key={p.name} style={{marginBottom:9}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,marginBottom:3}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:P[i%8],display:'inline-block',flexShrink:0}}/>
                        <span style={{fontWeight:700,color:'#0f1f10'}}>{p.name}</span>
                      </div>
                      <div>
                        <span style={{fontWeight:700,color:P[i%8]}}>{K(p.value)}</span>
                        <span style={{color:'#9ca3af',marginLeft:4}}>({pct}%)</span>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{flex:1,height:7,background:'#f3f4f6',borderRadius:4}}>
                        <div style={{height:7,width:`${pct}%`,background:P[i%8],borderRadius:4}}/>
                      </div>
                      {p.count>0&&<span style={{fontSize:9,color:'#9ca3af',width:28,textAlign:'right'}}>{p.count}b</span>}
                    </div>
                  </div>
                );
              })
            ):<Empty h={80} icon="💳" msg="Upload bills to see payment data"/>}
          </div>

          <div className="card" style={{padding:14}}>
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:8,fontSize:13}}>🥧 Category Share</div>
            {catPie.length>0?(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <PieChart width={95} height={90}>
                  <Pie data={catPie} cx={44} cy={42} innerRadius={22} outerRadius={42} dataKey="value" paddingAngle={2}>
                    {catPie.map((_,i)=><Cell key={i} fill={P[i%8]}/>)}
                  </Pie>
                </PieChart>
                <div style={{flex:1}}>
                  {catPie.slice(0,4).map((c,i)=>(
                    <div key={c.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:10,marginBottom:4}}>
                      <span style={{display:'flex',alignItems:'center',gap:4,color:'#374151'}}>
                        <span style={{width:7,height:7,borderRadius:'50%',background:P[i],display:'inline-block',flexShrink:0}}/>
                        {c.name.length>13?c.name.slice(0,13)+'…':c.name}
                      </span>
                      <span style={{fontWeight:700,color:P[i]}}>{K(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ):<Empty h={90} icon="🥧" msg="No data"/>}
          </div>

        </div>
      </div>

      {/* ROW 3: Daily Transactions + Stock Health */}
      <div className="rg-split" style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12}}>

        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:800,color:'#0f2d14',marginBottom:10,fontSize:13}}>🧾 Daily Transactions (30 days)</div>
          {trend.length>0?(
            <ResponsiveContainer width="100%" height={145}>
              <BarChart data={trend} margin={{top:4,right:8,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="date" tick={{fontSize:9}} interval={4}/>
                <YAxis tick={{fontSize:9}}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="Bills" fill="#3b82f6" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ):<Empty h={145} icon="🧾" msg="No transaction data"/>}
        </div>

        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:800,color:'#0f2d14',marginBottom:10,fontSize:13}}>📦 Stock Health</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            {[
              {label:'Total Products', val:products.length,                                     icon:'📦',color:'#2d7a3a',bg:'#e8f5e9'},
              {label:'Healthy Stock',  val:products.filter(p=>p.stock>=p.reorder_point).length,  icon:'✅',color:'#059669',bg:'#ecfdf5'},
              {label:'Low Stock',      val:lowStock,                                             icon:'⚠️',color:'#d97706',bg:'#fef3c7'},
              {label:'Out of Stock',   val:outOfStock,                                           icon:'🚨',color:'#dc2626',bg:'#fee2e2'},
            ].map(s=>(
              <div key={s.label} style={{background:s.bg,borderRadius:10,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:18,marginBottom:2}}>{s.icon}</div>
                <div style={{fontWeight:800,fontSize:18,color:s.color}}>{s.val}</div>
                <div style={{fontSize:10,color:'#6b7280',marginTop:1}}>{s.label}</div>
              </div>
            ))}
          </div>
          {[
            {label:'Healthy', val:products.filter(p=>p.stock>=p.reorder_point).length, color:'#2d7a3a'},
            {label:'Low',     val:lowStock,   color:'#f59e0b'},
            {label:'Out',     val:outOfStock, color:'#dc2626'},
          ].map(s=>{
            const pct = products.length>0 ? ((s.val/products.length)*100).toFixed(0) : 0;
            return(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                <span style={{fontSize:11,width:42,color:'#374151'}}>{s.label}</span>
                <div style={{flex:1,height:7,background:'#f3f4f6',borderRadius:4}}>
                  <div style={{height:7,width:`${pct}%`,background:s.color,borderRadius:4}}/>
                </div>
                <span style={{fontSize:11,color:'#374151',width:32,textAlign:'right'}}>{pct}%</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}