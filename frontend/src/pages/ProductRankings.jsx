import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { salesAPI } from '../api/service';
import { CATEGORY_META } from '../data/products';

const P=['#2d7a3a','#4caf50','#f59e0b','#3b82f6','#f43f5e','#8b5cf6','#06b6d4','#fb923c'];
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div style={{background:'#1a4a1f',borderRadius:10,padding:'10px 14px'}}><div style={{color:'#a5d6a7',fontWeight:700,marginBottom:4,fontSize:12}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:'#fff',fontSize:12}}><span style={{color:p.color}}>{p.name}: </span><strong>₹{Number(p.value)?.toLocaleString('en-IN')}</strong></div>)}</div>;};

export default function ProductRankings({ user }) {
  const [rankings,setRankings]=useState([]);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('best');
  const [cat,setCat]=useState('All');
  const [period,setPeriod]=useState(30);
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  const loadData=days=>{
    setLoading(true);
    salesAPI.getRankings(days).then(data=>{
      if(Array.isArray(data)&&data.length>0){
        setRankings(data.map(p=>({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,revenue:parseFloat(p.revenue)||0,units_sold:parseInt(p.units_sold)||0,profit:parseFloat(p.profit)||0,days_sold:parseInt(p.days_sold)||0,last_sold_date:p.last_sold_date||null})));
        setLive(true);
      }
    }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{loadData(period);},[period]);

  const categories=useMemo(()=>['All',...new Set(rankings.map(r=>r.category).filter(Boolean))],[rankings]);
  const filtered=useMemo(()=>{
    let d=cat==='All'?rankings:rankings.filter(p=>p.category===cat);
    if(tab==='best') return[...d].sort((a,b)=>b.revenue-a.revenue).slice(0,20);
    if(tab==='worst')return[...d].filter(p=>p.revenue>0).sort((a,b)=>a.revenue-b.revenue).slice(0,20);
    if(tab==='fast') return[...d].sort((a,b)=>b.units_sold-a.units_sold).slice(0,20);
    if(tab==='dead') return d.filter(p=>p.units_sold===0).sort((a,b)=>b.stock*b.cost_price-a.stock*a.cost_price).slice(0,20);
    return d;
  },[tab,cat,rankings]);

  const totalRevenue=useMemo(()=>rankings.reduce((s,p)=>s+p.revenue,0),[rankings]);
  const totalProfit=useMemo(()=>rankings.reduce((s,p)=>s+p.profit,0),[rankings]);
  const deadItems=useMemo(()=>rankings.filter(p=>p.units_sold===0),[rankings]);
  const deadValue=useMemo(()=>deadItems.reduce((s,p)=>s+p.stock*p.cost_price,0),[deadItems]);
  const topProd=useMemo(()=>[...rankings].sort((a,b)=>b.revenue-a.revenue)[0],[rankings]);
  const topChart=useMemo(()=>[...rankings].sort((a,b)=>b.revenue-a.revenue).slice(0,6).map(p=>({name:p.name.split(' ').slice(0,3).join(' '),revenue:Math.round(p.revenue)})),[rankings]);

  const TABS=[
    {id:'best',icon:'🏆',label:'Best Sellers',color:'#2d7a3a',bg:'#e8f5e9'},
    {id:'worst',icon:'📉',label:'Worst Sellers',color:'#dc2626',bg:'#fee2e2'},
    {id:'fast',icon:'⚡',label:'Fast Moving',color:'#f59e0b',bg:'#fef3c7'},
    {id:'dead',icon:'💀',label:'Dead Stock',color:'#6b7280',bg:'#f3f4f6'},
  ];

  if(!live&&!loading)return(
    <div className="card" style={{textAlign:'center',padding:48}}>
      <div style={{fontSize:48,marginBottom:12}}>🏆</div>
      <div style={{fontWeight:800,fontSize:20,color:'#0f2d14',marginBottom:8}}>No Sales Rankings Yet</div>
      <div style={{color:'#6b7280',marginBottom:16}}>Upload daily bills to see best, worst, fast-moving and dead stock automatically.</div>
      <div style={{background:'#fffbeb',padding:'12px 24px',borderRadius:8,display:'inline-block',fontSize:13,color:'#92400e'}}>📤 <strong>Daily Bills Upload</strong> → Rankings update daily</div>
    </div>
  );

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
          {live?`🔴 Live — Rankings from actual sales (today-first)`:loading?'⏳ Loading...':'No data'}
        </div>
        <div style={{display:'flex',gap:8}}>
          {[7,30,90].map(d=>(
            <button key={d} onClick={()=>setPeriod(d)} style={{padding:'6px 14px',borderRadius:8,border:'none',fontWeight:700,cursor:'pointer',fontSize:12,background:period===d?'#0f2d14':'#e8f5e9',color:period===d?'#fff':'#2d7a3a'}}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="rg-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'💰',label:`${period}-Day Revenue`,val:INR(totalRevenue),sub:`${rankings.filter(p=>p.revenue>0).length} products sold`,color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💹',label:`${period}-Day Profit`,val:INR(totalProfit),sub:`${totalRevenue>0?((totalProfit/totalRevenue)*100).toFixed(1):0}% margin`,color:'#0ea5e9',bg:'#f0f9ff'},
          {icon:'🏆',label:'Top Product',val:topProd?.name?.split(' ').slice(0,3).join(' ')||'—',sub:topProd?INR(topProd.revenue):'',color:'#f59e0b',bg:'#fffbeb'},
          {icon:'💀',label:'Dead Stock',val:`${deadItems.length} items`,sub:`${INR(deadValue)} blocked`,color:'#dc2626',bg:'#fee2e2'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:k.label==='Top Product'?13:undefined}}>{k.val}</div>
            {k.sub&&<div className="kpi-change kpi-up" style={{fontSize:10}}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Top 6 bar chart */}
      {topChart.length>0&&(
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:12,fontSize:14}}>📊 Top 6 Products by Revenue</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topChart} margin={{top:0,right:10,left:0,bottom:30}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{fontSize:9}} angle={-20} textAnchor="end" interval={0}/>
              <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:9}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>{topChart.map((_,i)=><Cell key={i} fill={P[i%8]}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab buttons */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'9px 20px',borderRadius:10,border:'none',fontWeight:700,cursor:'pointer',fontSize:13,
              background:tab===t.id?t.color:t.bg,color:tab===t.id?'#fff':t.color,
              boxShadow:tab===t.id?`0 4px 12px ${t.color}44`:'none',transition:'all .15s'}}>
            {t.icon} {t.label}
            <span style={{marginLeft:8,opacity:.7,fontSize:11}}>
              ({t.id==='best'?[...rankings].sort((a,b)=>b.revenue-a.revenue).slice(0,20).length:
                t.id==='worst'?rankings.filter(p=>p.revenue>0).slice(0,20).length:
                t.id==='fast'?[...rankings].sort((a,b)=>b.units_sold-a.units_sold).slice(0,20).length:
                deadItems.length})
            </span>
          </button>
        ))}

        <select value={cat} onChange={e=>setCat(e.target.value)} style={{marginLeft:'auto',padding:'8px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:12,background:'#fff',cursor:'pointer'}}>
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>#</th><th>Product</th><th>Category</th><th>Revenue</th><th>Profit</th><th>Margin</th><th>Units Sold</th><th>Stock Left</th><th>Last Sold</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{textAlign:'center',padding:40}}>⏳ Loading rankings...</td></tr>
            :filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No products in this category</td></tr>
            :filtered.map((p,i)=>{
              const meta=CATEGORY_META[p.category];
              const margin=p.revenue>0?((p.profit/p.revenue)*100).toFixed(1):0;
              const rankBg=tab==='best'&&i<3?['#fef9c3','#f3f4f6','#fff7ed'][i]:'transparent';
              return(
                <tr key={p.id} style={{background:rankBg}}>
                  <td style={{fontWeight:700,color:i<3&&tab==='best'?['#f59e0b','#6b7280','#ea580c'][i]:'#9ca3af',fontSize:16}}>
                    {tab==='best'&&i<3?['🥇','🥈','🥉'][i]:i+1}
                  </td>
                  <td>
                    <div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>{p.unit}</div>
                  </td>
                  <td><span style={{padding:'3px 8px',borderRadius:20,background:meta?.bg,color:meta?.color,fontSize:11,fontWeight:700}}>{meta?.icon} {p.category}</span></td>
                  <td><span className="mono" style={{fontWeight:700,color:'#2d7a3a'}}>{INR(p.revenue)}</span></td>
                  <td><span className="mono" style={{fontWeight:700,color:'#0ea5e9'}}>{INR(p.profit)}</span></td>
                  <td><span style={{fontWeight:700,color:margin>25?'#059669':margin>15?'#d97706':'#dc2626'}}>{margin}%</span></td>
                  <td><span style={{fontWeight:800,color:'#374151'}}>{p.units_sold}</span></td>
                  <td><span style={{fontWeight:700,color:p.stock===0?'#dc2626':p.stock<20?'#d97706':'#374151'}}>{p.stock}</span></td>
                  <td style={{fontSize:11,color:'#6b7280'}}>{p.last_sold_date?new Date(p.last_sold_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'Never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}