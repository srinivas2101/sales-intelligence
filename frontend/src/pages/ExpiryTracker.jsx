import React, { useState, useEffect, useMemo } from 'react';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { productsAPI } from '../api/service';

const getStatus=days=>{
  if(days<=2) return{label:'Expires Today/Tomorrow',color:'#dc2626',bg:'#fee2e2',border:'#fca5a5',icon:'🔴',priority:0};
  if(days<=5) return{label:'This Week',color:'#ea580c',bg:'#ffedd5',border:'#fdba74',icon:'🟠',priority:1};
  if(days<=14)return{label:'Two Weeks',color:'#f59e0b',bg:'#fef3c7',border:'#fcd34d',icon:'🟡',priority:2};
  if(days<=30)return{label:'This Month',color:'#2d7a3a',bg:'#e8f5e9',border:'#a5d6a7',icon:'🟢',priority:3};
  return null;
};

export default function ExpiryTracker({ user }) {
  const [products,setProducts]=useState(ALL_PRODUCTS);
  const [live,setLive]=useState(false);
  const [filter,setFilter]=useState('All');
  const [action,setAction]=useState({});
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{
    productsAPI.getAll().then(data=>{
      if(Array.isArray(data)&&data.length>0){
        setProducts(data.map(p=>({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,expiry_days:parseInt(p.expiry_days)||365,reorder_point:parseInt(p.reorder_point)||20})));
        setLive(true);
      }
    }).catch(()=>{});
  },[]);

  const expiring=useMemo(()=>
    products.map(p=>({...p,status:getStatus(p.expiry_days)}))
      .filter(p=>p.status!==null&&p.stock>0)
      .sort((a,b)=>a.expiry_days-b.expiry_days)
  ,[products]);

  const critical=expiring.filter(p=>p.expiry_days<=2);
  const thisWeek=expiring.filter(p=>p.expiry_days>2&&p.expiry_days<=5);
  const twoWeeks=expiring.filter(p=>p.expiry_days>5&&p.expiry_days<=14);
  const thisMonth=expiring.filter(p=>p.expiry_days>14&&p.expiry_days<=30);
  const totalLoss=critical.reduce((s,p)=>s+p.stock*p.cost_price,0);
  const weekLoss=thisWeek.reduce((s,p)=>s+p.stock*p.cost_price,0);

  const filtered=filter==='All'?expiring:filter==='Critical'?critical:filter==='This Week'?thisWeek:filter==='Two Weeks'?twoWeeks:thisMonth;

  const setItemAction=(id,act)=>setAction(prev=>({...prev,[id]:act}));

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live DB — ${expiring.length} items expiring within 30 days`:'📦 Showing demo product data'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'🔴',label:'Critical (≤2 days)',val:critical.length,sub:`${INR(totalLoss)} at risk`,color:'#dc2626',bg:'#fee2e2',filter:'Critical'},
          {icon:'🟠',label:'This Week (≤5d)',val:thisWeek.length,sub:`${INR(weekLoss)} stock value`,color:'#ea580c',bg:'#ffedd5',filter:'This Week'},
          {icon:'🟡',label:'Two Weeks (≤14d)',val:twoWeeks.length,sub:'Monitor closely',color:'#f59e0b',bg:'#fef3c7',filter:'Two Weeks'},
          {icon:'🟢',label:'This Month (≤30d)',val:thisMonth.length,sub:'Plan promotions',color:'#2d7a3a',bg:'#e8f5e9',filter:'This Month'},
        ].map(k=>(
          <div key={k.label} onClick={()=>setFilter(filter===k.filter?'All':k.filter)}
            style={{background:k.bg,borderRadius:14,padding:'16px',cursor:'pointer',border:`2px solid ${filter===k.filter?k.color:'transparent'}`,transition:'all .15s'}}>
            <div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
            <div style={{fontWeight:900,fontSize:28,color:k.color}}>{k.val}</div>
            <div style={{fontSize:12,fontWeight:700,color:k.color,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {critical.length>0&&(
        <div className="alert alert-crit" style={{marginBottom:14}}>
          🚨 <strong>{critical.length} items expire in ≤2 days!</strong> Potential loss: <strong>{INR(totalLoss)}</strong> — Apply discounts or return to supplier immediately.
        </div>
      )}

      {/* Action Tips */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
        {[
          {col:'#fee2e2',bc:'#fca5a5',tc:'#dc2626',dc:'#7f1d1d',title:'🔴 Immediate Action',tips:'Apply 30–50% discount • Bundle with fast-movers • Contact supplier for return/credit note'},
          {col:'#fef3c7',bc:'#fcd34d',tc:'#92400e',dc:'#78350f',title:'🟡 This Week Plan',tips:'Apply 10–20% discount • Place near checkout • Add to combo offers • Promote on WhatsApp'},
          {col:'#e8f5e9',bc:'#a5d6a7',tc:'#2d7a3a',dc:'#1a4a1f',title:'🟢 Plan Ahead',tips:'Reduce next purchase qty • Plan weekend promo • Check velocity vs remaining stock'},
        ].map(t=>(
          <div key={t.title} style={{padding:'14px',background:t.col,border:`1.5px solid ${t.bc}`,borderRadius:12}}>
            <div style={{fontWeight:800,color:t.tc,marginBottom:6,fontSize:13}}>{t.title}</div>
            <div style={{fontSize:11,color:t.dc,lineHeight:1.7}}>{t.tips}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        {['All','Critical','This Week','Two Weeks','This Month'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'7px 16px',borderRadius:20,border:'none',fontWeight:700,cursor:'pointer',fontSize:12,
              background:filter===f?'#0f2d14':'#f3f4f6',color:filter===f?'#fff':'#374151'}}>
            {f} <span style={{opacity:.7}}>({f==='All'?expiring.length:f==='Critical'?critical.length:f==='This Week'?thisWeek.length:f==='Two Weeks'?twoWeeks.length:thisMonth.length})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Product</th><th>Category</th><th>Expires In</th><th>Stock</th><th>Stock Value</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#9ca3af'}}>No items in this category 🎉</td></tr>
            :filtered.map(p=>{
              const meta=CATEGORY_META[p.category];
              const st=p.status;
              const act=action[p.id];
              return(
                <tr key={p.id}>
                  <td><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:'#9ca3af'}}>{p.unit}</div></td>
                  <td><span style={{padding:'3px 8px',borderRadius:20,background:meta?.bg,color:meta?.color,fontSize:11,fontWeight:700}}>{meta?.icon} {p.category}</span></td>
                  <td><span style={{fontWeight:900,fontSize:18,color:st.color}}>{p.expiry_days}d</span></td>
                  <td><span className="mono" style={{fontWeight:700}}>{p.stock} {p.unit}s</span></td>
                  <td><span className="mono" style={{color:'#dc2626',fontWeight:700}}>{INR(p.stock*p.cost_price)}</span></td>
                  <td><span style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color,border:`1.5px solid ${st.border}`}}>{st.icon} {st.label}</span></td>
                  <td>
                    {act?<span style={{fontSize:12,fontWeight:700,color:'#2d7a3a'}}>✅ {act}</span>:(
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>setItemAction(p.id,'Discount Applied')} className="btn btn-amber btn-sm">🏷 Discount</button>
                        <button onClick={()=>setItemAction(p.id,'Return Initiated')} className="btn btn-outline btn-sm">↩ Return</button>
                      </div>
                    )}
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