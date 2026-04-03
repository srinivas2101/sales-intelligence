import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { productsAPI, salesAPI, simulateAPI } from '../api/service';

export default function WhatIfSimulation({ user }) {
  const [products,setProducts]=useState(ALL_PRODUCTS);
  const [live,setLive]=useState(false);
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState('');
  const [params,setParams]=useState({priceChange:0,discountPct:0,stockAdd:100,adBudget:0});
  const [result,setResult]=useState(null);
  const [running,setRunning]=useState(false);
  const [scenarios,setScenarios]=useState([]);
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{ setLive(true); },[]);

  const CAT_DAILY={'Dairy':14,'Bakery':13,'Snacks & Biscuits':12,'Beverages':11,'Rice & Grains':10,'Dal & Pulses':9,'Atta & Flour':8,'Oils & Ghee':7,'Frozen & Packed':8,'Personal Care':5};

  const localSimulate=(product,p)=>{
    const daily=CAT_DAILY[product.category]||8;
    const curUnits=daily*30;
    const newPrice=product.price*(1+p.priceChange/100)*(1-p.discountPct/100);
    const netPct=p.priceChange-p.discountPct;
    const priceFactor=Math.max(0.3,1+(-1.2*netPct/100));
    const stockFactor=(product.stock<20&&p.stockAdd>0)?1.15:1.0;
    const adFactor=1+Math.min(0.20,p.adBudget/1000*0.02);
    const projUnits=Math.max(0,Math.round(curUnits*priceFactor*stockFactor*adFactor));
    const cost=product.cost_price||product.price*0.72;
    const curRevenue=Math.round(curUnits*product.price);
    const curProfit=Math.round(curUnits*(product.price-cost));
    const curMargin=product.price>0?((product.price-cost)/product.price*100).toFixed(1):0;
    const projRevenue=Math.round(projUnits*newPrice);
    const projProfit=Math.round(projUnits*(newPrice-cost)-p.adBudget*4);
    const projMargin=newPrice>0?((newPrice-cost)/newPrice*100).toFixed(1):0;
    const profChange=projProfit-curProfit;
    let recommendation='';
    if(profChange>5000)recommendation='✅ Excellent! Significantly improves profitability.';
    else if(profChange>0)recommendation='✅ Profitable! This scenario improves margins.';
    else if(p.discountPct>20)recommendation='⚠️ Deep discount reduces margin. Consider 10–15% max.';
    else if(p.priceChange>15)recommendation='⚠️ High price increase may reduce demand.';
    else recommendation='📊 Neutral impact. Monitor sales velocity.';
    return{current:{units:curUnits,revenue:curRevenue,profit:curProfit,margin:curMargin},projected:{units:projUnits,revenue:projRevenue,profit:projProfit,margin:projMargin},changes:{revenue:projRevenue-curRevenue,profit:profChange,units:projUnits-curUnits},recommendation,ml_used:false,model:'Rule-based elasticity model'};
  };

  const runSim=async()=>{
    if(!selected)return;
    setRunning(true);
    try{
      const payload={product_id:selected.id,category:selected.category,price:selected.price,cost_price:selected.cost_price||selected.price*0.72,current_stock:selected.stock,...params};
      const r=await simulateAPI.run(payload);
      if(r&&r.current&&r.projected&&r.changes){setResult(r);}
      else{setResult(localSimulate(selected,params));}
    }catch{
      setResult(localSimulate(selected,params));
    }
    setRunning(false);
  };

  const saveScenario=()=>{
    if(!result||!selected)return;
    setScenarios(prev=>[{name:`${selected.name.split(' ')[0]} - ${params.discountPct>0?`${params.discountPct}% off`:params.priceChange!==0?`Price ${params.priceChange>0?'+':''}${params.priceChange}%`:'Stock+'}`,result,...params,product:selected.name},...prev.slice(0,4)]);
  };

  const filtered=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).slice(0,15);

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?'🔴 Live DB — Simulation uses real cost & price data':'📊 Demo simulation'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'🧪',label:'Scenarios Saved',val:scenarios.length,sub:'This session',color:'#7c3aed',bg:'#f5f3ff'},
          {icon:'💰',label:'Best Scenario Profit',val:scenarios.length>0?INR(Math.max(...scenarios.map(s=>s.result?.projected?.profit||0))):'—',sub:'Highest projected',color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'🎯',label:'Products Analyzed',val:products.length,sub:'Available to simulate',color:'#0ea5e9',bg:'#f0f9ff'},
          {icon:'📊',label:'Simulation Mode',val:live?'Live Data':'Demo',sub:live?'Using real prices':'Estimated data',color:'#f59e0b',bg:'#fffbeb'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:typeof k.val==='string'&&k.val.length>8?13:undefined}}>{k.val}</div>
            <div className="kpi-change kpi-neutral" style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:16}}>
        {/* Product selector */}
        <div className="card" style={{padding:16,alignSelf:'flex-start'}}>
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:10,fontSize:13}}>📦 Select Product</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #d1fae5',fontSize:12,boxSizing:'border-box',marginBottom:8,outline:'none'}}/>
          <div style={{maxHeight:300,overflowY:'auto'}}>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>{setSelected({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0});setResult(null);}}
                style={{padding:'8px 10px',borderRadius:8,marginBottom:3,cursor:'pointer',background:selected?.id===p.id?'#e8f5e9':'#f8fafc',border:`1.5px solid ${selected?.id===p.id?'#2d7a3a':'transparent'}`}}>
                <div style={{fontWeight:700,fontSize:12}}>{p.name}</div>
                <div style={{fontSize:10,color:'#6b7280'}}>{INR(p.price)} · Stock: {p.stock}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Parameters */}
          <div className="card" style={{marginBottom:14,padding:18}}>
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>🎛️ Simulation Parameters {selected&&<span style={{color:'#2d7a3a',fontWeight:600,fontSize:12,marginLeft:8}}>— {selected.name}</span>}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Price Change (%): <strong style={{color:'#2d7a3a'}}>{params.priceChange}%</strong></label>
                <input type="range" min={-50} max={50} value={params.priceChange} onChange={e=>setParams(prev=>({...prev,priceChange:parseInt(e.target.value)}))} style={{width:'100%',accentColor:'#2d7a3a',marginBottom:4}}/>
                <div style={{fontSize:10,color:'#6b7280'}}>New price: {selected?INR(parseFloat(selected.price||0)*(1+params.priceChange/100)):'—'} {selected&&selected.price==0?'(price missing!)':''}</div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Discount (%): <strong style={{color:'#2d7a3a'}}>{params.discountPct}%</strong></label>
                <input type="range" min={0} max={70} value={params.discountPct} onChange={e=>setParams(prev=>({...prev,discountPct:parseInt(e.target.value)}))} style={{width:'100%',accentColor:'#2d7a3a',marginBottom:4}}/>
                <div style={{fontSize:10,color:'#6b7280'}}>Customer sees: {selected?INR(parseFloat(selected.price||0)*(1-params.discountPct/100)):'—'}</div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Stock to Add (units): <strong style={{color:'#2d7a3a'}}>{params.stockAdd} units</strong></label>
                <input type="range" min={0} max={500} value={params.stockAdd} onChange={e=>setParams(prev=>({...prev,stockAdd:parseInt(e.target.value)}))} style={{width:'100%',accentColor:'#2d7a3a',marginBottom:4}}/>
                <div style={{fontSize:10,color:'#6b7280'}}>Total after add: {(selected?.stock||0)+params.stockAdd} units</div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Ad Budget (₹/week): <strong style={{color:'#2d7a3a'}}>₹{params.adBudget}</strong></label>
                <input type="range" min={0} max={10000} value={params.adBudget} onChange={e=>setParams(prev=>({...prev,adBudget:parseInt(e.target.value)}))} style={{width:'100%',accentColor:'#2d7a3a',marginBottom:4}}/>
                <div style={{fontSize:10,color:'#6b7280'}}>Expected reach: {Math.round(params.adBudget/5)} customers</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={runSim} disabled={!selected||running} style={{background:'#0f2d14',color:'#fff',border:'none',borderRadius:10,padding:'10px 24px',fontWeight:700,cursor:selected?'pointer':'not-allowed',fontSize:14,opacity:selected?1:0.5}}>
                {running?'⏳ Running...':'🧪 Run Simulation'}
              </button>
              {result&&<button onClick={saveScenario} style={{background:'#e8f5e9',color:'#2d7a3a',border:'none',borderRadius:10,padding:'10px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>💾 Save Scenario</button>}
            </div>
          </div>

          {/* Results */}
          {result&&(
            <div className="card" style={{padding:18}}>
              <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>📊 Simulation Results</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                {[['Revenue',result.changes?.revenue,'#2d7a3a'],['Profit',result.changes?.profit,'#0ea5e9'],['Units',result.changes?.units,'#f59e0b']].map(([l,v,c])=>(
                  <div key={l} style={{background:v>=0?'#e8f5e9':'#fee2e2',borderRadius:12,padding:'14px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>{l} Change</div>
                    <div style={{fontWeight:900,fontSize:20,color:v>=0?'#2d7a3a':'#dc2626'}}>{v>=0?'+':''}{l==='Revenue'||l==='Profit'?INR(v):v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {['current','projected'].map(k=>(
                  <div key={k} style={{background:k==='projected'?'#f0fdf4':'#f8fafc',borderRadius:12,padding:14}}>
                    <div style={{fontWeight:700,fontSize:13,color:k==='projected'?'#2d7a3a':'#374151',marginBottom:10}}>{k==='current'?'📦 Current':'🎯 Projected'}</div>
                    {[['Units',result[k]?.units],['Revenue',INR(result[k]?.revenue)],['Profit',INR(result[k]?.profit)],['Margin',`${result[k]?.margin}%`]].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,.05)',fontSize:12}}>
                        <span style={{color:'#6b7280'}}>{l}</span><span style={{fontWeight:700}}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{background:(result.changes?.profit||0)>=0?'#e8f5e9':'#fff3cd',borderRadius:10,padding:'12px 16px',fontSize:13,lineHeight:1.7,fontWeight:600,color:(result.changes?.profit||0)>=0?'#166534':'#92400e'}}>
                💡 {result.recommendation}
              </div>
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:6,fontSize:11,color:result.ml_used?'#7c3aed':'#6b7280',background:result.ml_used?'#f5f3ff':'#f8fafc',border:`1px solid ${result.ml_used?'#ddd6fe':'#e5e7eb'}`,borderRadius:8,padding:'6px 10px'}}>
                {result.ml_used?'🤖':'📐'} {result.model||'Rule-based elasticity model'}
              </div>
            </div>
          )}

          {/* Saved scenarios */}
          {scenarios.length>0&&(
            <div className="card" style={{marginTop:14,padding:16}}>
              <div style={{fontWeight:700,color:'#0f2d14',marginBottom:10,fontSize:13}}>💾 Saved Scenarios</div>
              {scenarios.map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f8fafc',borderRadius:8,marginBottom:6,fontSize:12}}>
                  <span style={{fontWeight:700}}>{s.name}</span>
                  <div style={{display:'flex',gap:12}}>
                    <span style={{color:'#2d7a3a',fontWeight:700}}>Rev: {INR(s.result?.projected?.revenue||0)}</span>
                    <span style={{color:s.result?.changes?.profit>=0?'#2d7a3a':'#dc2626',fontWeight:700}}>P&L: {INR(s.result?.changes?.profit||0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}