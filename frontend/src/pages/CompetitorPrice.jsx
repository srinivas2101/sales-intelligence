import { isOwner } from '../utils/roleUtils';
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { productsAPI } from '../api/service';

const COMPETITORS=['DMart','BigBazaar','Reliance Fresh','Local Kirana'];
const genCompPrices=p=>{
  const base=parseFloat(p.price)||0;
  const obj={};
  COMPETITORS.forEach(c=>{obj[c]=Math.round(base*(0.88+((Math.sin(base*7.3+c.charCodeAt(0)*1.7)*0.5+0.5)*0.22))*10)/10;});
  return obj;
};

export default function CompetitorPrice({ user }) {
  const isOwnerRole = user?.id === 'owner';
  const [products,setProducts]=useState(ALL_PRODUCTS);
  const [live,setLive]=useState(false);
  const [cat,setCat]=useState('All');
  const [search,setSearch]=useState('');
  const [sortBy,setSortBy]=useState('advantage');
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{
    productsAPI.getAll().then(data=>{
      if(Array.isArray(data)&&data.length>0){setProducts(data.map(p=>({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0})));setLive(true);}
    }).catch(()=>{});
  },[]);

  const withComp=useMemo(()=>
    products.map(p=>{
      const comp=genCompPrices(p);
      const compAvg=Object.values(comp).reduce((s,v)=>s+v,0)/COMPETITORS.length;
      const advantage=((compAvg-p.price)/compAvg*100).toFixed(1);
      const minComp=Math.min(...Object.values(comp));
      return{...p,comp,compAvg:Math.round(compAvg*10)/10,advantage:parseFloat(advantage),minComp,cheaper:p.price<compAvg};
    })
  ,[products]);

  const filtered=useMemo(()=>{
    let d=withComp.filter(p=>(cat==='All'||p.category===cat)&&p.name.toLowerCase().includes(search.toLowerCase()));
    if(sortBy==='advantage')return d.sort((a,b)=>b.advantage-a.advantage);
    if(sortBy==='expensive')return d.sort((a,b)=>a.advantage-b.advantage);
    return d.sort((a,b)=>b.price-a.price);
  },[withComp,cat,search,sortBy]);

  const cheaper=withComp.filter(p=>p.cheaper).length;
  const expensive=withComp.length-cheaper;
  const avgAdvantage=(withComp.reduce((s,p)=>s+p.advantage,0)/Math.max(withComp.length,1)).toFixed(1);
  const topAdv=[...withComp].sort((a,b)=>b.advantage-a.advantage).slice(0,6).map(p=>({name:p.name.split(' ').slice(0,3).join(' '),advantage:p.advantage}));

  const categories=['All',...Object.keys(CATEGORY_META)];

  return(
    <div className="fade-up">
      {!isOwnerRole && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',marginBottom:12,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,fontSize:13,color:'#1d4ed8',fontWeight:600}}>
          👁️ View only — Contact Store Owner to update competitor prices
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live products — Competitor prices estimated vs DMart, BigBazaar, Reliance Fresh, Local Kirana`:'📊 Showing estimated competitor comparison'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'🏆',label:'Cheaper Than Competitors',val:cheaper,sub:`${withComp.length>0?((cheaper/withComp.length)*100).toFixed(0):0}% of catalog`,color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'⚠️',label:'More Expensive',val:expensive,sub:'May lose customers',color:'#dc2626',bg:'#fee2e2'},
          {icon:'📊',label:'Avg Price Advantage',val:`${avgAdvantage}%`,sub:'vs competitor avg',color:parseFloat(avgAdvantage)>=0?'#059669':'#dc2626',bg:parseFloat(avgAdvantage)>=0?'#ecfdf5':'#fee2e2'},
          {icon:'🎯',label:'Competitors Tracked',val:COMPETITORS.length,sub:COMPETITORS.join(', ').substring(0,25)+'...',color:'#7c3aed',bg:'#f5f3ff'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-change kpi-neutral" style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Advantage Chart */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:700,color:'#0f2d14',marginBottom:12,fontSize:14}}>🏆 Biggest Price Advantages (vs Competitors)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={topAdv} margin={{top:0,right:10,left:0,bottom:30}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:9}} angle={-20} textAnchor="end" interval={0}/>
            <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:9}}/>
            <Tooltip formatter={v=>[`${v}%`,'Price Advantage']}/>
            <Bar dataKey="advantage" name="Advantage" radius={[4,4,0,0]}>
              {topAdv.map((p,i)=><Cell key={i} fill={p.advantage>=0?'#2d7a3a':'#dc2626'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:13,width:200,outline:'none'}}/>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:12,background:'#fff',cursor:'pointer'}}>
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:12,background:'#fff',cursor:'pointer'}}>
          <option value="advantage">Sort: Best Advantage</option>
          <option value="expensive">Sort: Most Expensive</option>
          <option value="price">Sort: Price</option>
        </select>
        <span style={{display:'flex',alignItems:'center',fontSize:12,color:'#6b7280'}}>{filtered.length} products</span>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Product</th><th>Category</th><th>Your Price</th><th>DMart</th><th>BigBazaar</th><th>Reliance</th><th>Local Kirana</th><th>Advantage</th>
          </tr></thead>
          <tbody>
            {filtered.slice(0,40).map(p=>{
              const meta=CATEGORY_META[p.category];
              const adv=p.advantage;
              return(
                <tr key={p.id}>
                  <td><div style={{fontWeight:700,fontSize:13}}>{p.name}</div></td>
                  <td><span style={{padding:'3px 8px',borderRadius:20,background:meta?.bg,color:meta?.color,fontSize:11,fontWeight:700}}>{meta?.icon} {p.category}</span></td>
                  <td><span className="mono" style={{fontWeight:800,color:'#0f2d14'}}>{INR(p.price)}</span></td>
                  {COMPETITORS.map(c=>{
                    const cp=p.comp[c];
                    const diff=cp-p.price;
                    return<td key={c}><span className="mono" style={{color:diff>0?'#dc2626':diff<0?'#2d7a3a':'#374151'}}>{INR(cp)}{diff!==0&&<span style={{fontSize:9,marginLeft:3}}>{diff>0?'▲':'▼'}</span>}</span></td>;
                  })}
                  <td>
                    <span style={{fontWeight:800,padding:'3px 10px',borderRadius:20,fontSize:12,background:adv>5?'#e8f5e9':adv>0?'#f0fdf4':adv>-5?'#fef3c7':'#fee2e2',color:adv>5?'#166534':adv>0?'#166534':adv>-5?'#92400e':'#dc2626'}}>
                      {adv>=0?'+':''}{adv}%
                    </span>
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