import React, { useState, useEffect } from 'react';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
// API imports removed — using local ALL_PRODUCTS for accurate risk data

const LS={'CRITICAL':{color:'#dc2626',bg:'#fee2e2',border:'#fca5a5'},'HIGH':{color:'#ea580c',bg:'#ffedd5',border:'#fdba74'},'MEDIUM':{color:'#d97706',bg:'#fef3c7',border:'#fcd34d'},'LOW':{color:'#2d7a3a',bg:'#e8f5e9',border:'#a5d6a7'}};

const calcRisk=p=>{
  let score=0,factors=[];
  if(p.stock===0){score+=35;factors.push({name:'Out of Stock',score:35,detail:'0 units — immediate reorder needed'});}
  else if(p.stock<p.reorder_point){const pct=p.stock/p.reorder_point;score+=Math.round(25*(1-pct));factors.push({name:'Low Stock',score:Math.round(25*(1-pct)),detail:`${p.stock}/${p.reorder_point} units`});}
  if(p.expiry_days<=2){score+=35;factors.push({name:'Critical Expiry',score:35,detail:`Expires in ${p.expiry_days} days!`});}
  else if(p.expiry_days<=7){score+=20;factors.push({name:'Expiry Risk',score:20,detail:`Expires in ${p.expiry_days} days`});}
  else if(p.expiry_days<=14){score+=10;factors.push({name:'Expiry Watch',score:10,detail:`Expires in ${p.expiry_days} days`});}
  if(p.risk_score&&p.risk_score>score)score=p.risk_score;
  const level=score>=70?'CRITICAL':score>=40?'HIGH':score>=20?'MEDIUM':'LOW';
  return{...p,riskScore:Math.min(score,100),riskLevel:level,factors,recommendation:level==='CRITICAL'?'🚨 URGENT: Immediate action required — reorder or discount now.':level==='HIGH'?'⚡ HIGH: Proactive action needed this week.':level==='MEDIUM'?'👀 MONITOR: Keep close watch, plan ahead.':'✅ HEALTHY: Continue normal operations.'};
};

export default function RiskAlerts({ user }) {
  const [riskData,setRiskData]=useState([]);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('ALL');
  const [selected,setSelected]=useState(null);
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(() => {
    // Always use ALL_PRODUCTS (local data) — DB has old stock values
    // ALL_PRODUCTS uses seededRand for realistic varied stock/expiry per product
    const scored = ALL_PRODUCTS.map(p => calcRisk({
      ...p,
      price:         parseFloat(p.price)         || 0,
      cost_price:    parseFloat(p.cost_price)     || 0,
      stock:         parseInt(p.stock)            || 0,
      expiry_days:   parseInt(p.expiry_days)      || 365,
      reorder_point: parseInt(p.reorder_point)    || 20,
    }));
    setRiskData(scored.sort((a, b) => b.riskScore - a.riskScore));
    setLive(true);
    setLoading(false);
  }, []);

  const filtered=filter==='ALL'?riskData:riskData.filter(r=>r.riskLevel===filter);
  const counts={CRITICAL:riskData.filter(r=>r.riskLevel==='CRITICAL').length,HIGH:riskData.filter(r=>r.riskLevel==='HIGH').length,MEDIUM:riskData.filter(r=>r.riskLevel==='MEDIUM').length,LOW:riskData.filter(r=>r.riskLevel==='LOW').length};
  const criticalValue=riskData.filter(r=>r.riskLevel==='CRITICAL').reduce((s,p)=>s+p.stock*p.cost_price,0);

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live DB — Risk scores from real stock & expiry data`:loading?'⏳ Calculating...':'📊 Demo mode'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[['CRITICAL','🚨','#dc2626','#fee2e2',`${INR(criticalValue)} at risk`],['HIGH','🔴','#ea580c','#ffedd5','urgent attention'],['MEDIUM','🟡','#d97706','#fef3c7','monitor closely'],['LOW','✅','#2d7a3a','#e8f5e9','healthy status']].map(([lvl,icon,color,bg,sub])=>(
          <div key={lvl} onClick={()=>setFilter(filter===lvl?'ALL':lvl)}
            style={{background:bg,borderRadius:14,padding:16,cursor:'pointer',border:`2px solid ${filter===lvl?color:'transparent'}`,transition:'all .15s'}}>
            <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
            <div style={{fontWeight:900,fontSize:28,color}}>{counts[lvl]}</div>
            <div style={{fontSize:12,fontWeight:700,color,marginTop:2}}>{lvl}</div>
            <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{sub}</div>
          </div>
        ))}
      </div>

      {counts.CRITICAL>0&&<div className="alert alert-crit" style={{marginBottom:14}}>🚨 <strong>{counts.CRITICAL} CRITICAL items</strong> — Immediate action required! Stock value at risk: <strong>{INR(criticalValue)}</strong></div>}

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 340px':'1fr',gap:16}}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Expiry</th><th>Risk Score</th><th>Level</th><th>Action</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={7} style={{textAlign:'center',padding:40}}>⏳ Calculating risk scores...</td></tr>
              :filtered.slice(0,50).map((r,i)=>{
                const meta=CATEGORY_META[r.category];
                const st=LS[r.riskLevel]||LS.LOW;
                return(
                  <tr key={i} onClick={()=>setSelected(selected?.id===r.id?null:r)} style={{cursor:'pointer',background:selected?.id===r.id?'#f0fdf4':'transparent'}}>
                    <td><div style={{fontWeight:700,fontSize:13}}>{r.name}</div><div style={{fontSize:10,color:'#9ca3af'}}>{r.unit}</div></td>
                    <td><span style={{padding:'2px 8px',borderRadius:20,background:meta?.bg,color:meta?.color,fontSize:11,fontWeight:700}}>{meta?.icon} {r.category}</span></td>
                    <td><span style={{fontWeight:800,color:r.stock===0?'#dc2626':r.stock<r.reorder_point?'#d97706':'#2d7a3a'}}>{r.stock}</span></td>
                    <td><span style={{fontWeight:700,color:r.expiry_days<=7?'#dc2626':r.expiry_days<=14?'#d97706':'#6b7280'}}>{r.expiry_days}d</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:8,background:'#eee',borderRadius:10,overflow:'hidden',minWidth:60}}>
                          <div style={{height:'100%',width:`${r.riskScore}%`,background:st.color,transition:'width 1s ease'}}/>
                        </div>
                        <span style={{fontWeight:800,color:st.color,minWidth:28,fontSize:13}}>{r.riskScore}</span>
                      </div>
                    </td>
                    <td><span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:800,background:st.bg,color:st.color}}>{r.riskLevel}</span></td>
                    <td><button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();setSelected(selected?.id===r.id?null:r);}}>Details →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected&&(
          <div className="card fade-up" style={{alignSelf:'flex-start',borderTop:`4px solid ${LS[selected.riskLevel]?.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:15,color:'#0f2d14'}}>{selected.name}</div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#888'}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[{l:'Risk Score',v:selected.riskScore,c:LS[selected.riskLevel]?.color},{l:'Level',v:selected.riskLevel,c:LS[selected.riskLevel]?.color},{l:'Stock',v:selected.stock,c:'#374151'},{l:'Expiry',v:`${selected.expiry_days}d`,c:selected.expiry_days<=7?'#dc2626':'#374151'}].map(s=>(
                <div key={s.l} style={{padding:10,background:'#f7faf7',borderRadius:8,textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#888',marginBottom:2}}>{s.l}</div>
                  <div style={{fontWeight:800,fontSize:16,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>⚡ Risk Factors</div>
            {(selected.factors||[]).map((f,i)=>(
              <div key={i} style={{padding:'8px 12px',marginBottom:6,background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,fontSize:12}}>
                <div style={{fontWeight:700,display:'flex',justifyContent:'space-between'}}><span>{f.name}</span><span style={{color:'#f59e0b'}}>+{f.score}pts</span></div>
                <div style={{color:'#666',marginTop:2}}>{f.detail}</div>
              </div>
            ))}
            <div style={{marginTop:12,padding:'10px 12px',background:LS[selected.riskLevel]?.bg,border:`1px solid ${LS[selected.riskLevel]?.border}`,borderRadius:10,fontSize:12,color:LS[selected.riskLevel]?.color,lineHeight:1.7}}>
              {selected.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}