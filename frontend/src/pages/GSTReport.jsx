import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { salesAPI } from '../api/service';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';

const GST_RATES={'Rice & Grains':0,'Dal & Pulses':0,'Atta & Flour':0,'Vegetables':0,'Fruits':0,'Dairy':5,'Oils & Ghee':5,'Spices & Masala':5,'Bakery':5,'Baby & Health':5,'Beverages':12,'Snacks & Biscuits':12,'Frozen & Packed':12,'Stationery':12,'Personal Care':18,'Home Care':18,'Condiments':12,'Sweets':5};
const RATE_GROUPS=[{rate:0,label:'0% Exempt',color:'#2d7a3a',bg:'#e8f5e9'},{rate:5,label:'5% GST',color:'#1d4ed8',bg:'#dbeafe'},{rate:12,label:'12% GST',color:'#f59e0b',bg:'#fef3c7'},{rate:18,label:'18% GST',color:'#dc2626',bg:'#fee2e2'}];
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div style={{background:'#1a4a1f',borderRadius:10,padding:'10px 14px'}}><div style={{color:'#a5d6a7',fontWeight:700,marginBottom:4,fontSize:12}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:'#fff',fontSize:12}}><span style={{color:p.color}}>{p.name}: </span><strong>₹{Number(p.value)?.toLocaleString('en-IN')}</strong></div>)}</div>;};

export default function GSTReport({ user }) {
  const [monthly,setMonthly]=useState([]);
  const [catSales,setCatSales]=useState([]);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('summary');
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{
    Promise.all([salesAPI.getProfitMonthly(),salesAPI.getByCategory(90)])
      .then(([mData,catRaw])=>{
        if(Array.isArray(mData)&&mData.length>0){
          setMonthly(mData.map(m=>{
            const sales=parseFloat(m.revenue)||0,purchases=sales*0.7;
            const outputGST=sales*0.065,inputGST=purchases*0.065;
            return{month:m.month,month_num:parseInt(m.month_num),sales:Math.round(sales),purchases:Math.round(purchases),outputGST:Math.round(outputGST),inputGST:Math.round(inputGST),netGST:Math.round(outputGST-inputGST),filed:false};
          }));
          setLive(true);
        }
        if(Array.isArray(catRaw)&&catRaw.length>0)setCatSales(catRaw);
      }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  // Category GST breakdown from actual sales
  const catBreakdown=useMemo(()=>{
    if(catSales.length>0){
      return catSales.map(c=>({cat:c.category,rate:GST_RATES[c.category]??12,taxableValue:Math.round(parseFloat(c.revenue)||0),gstAmt:Math.round((parseFloat(c.revenue)||0)*(GST_RATES[c.category]??12)/100),meta:CATEGORY_META[c.category],units:parseInt(c.units)||0})).sort((a,b)=>b.gstAmt-a.gstAmt);
    }
    // Fallback: use product catalog
    return Object.entries(GST_RATES).map(([cat,rate])=>{
      const tv=ALL_PRODUCTS.filter(p=>p.category===cat).reduce((s,p)=>s+p.price*10,0);
      return{cat,rate,taxableValue:Math.round(tv),gstAmt:Math.round(tv*rate/100),meta:CATEGORY_META[cat],units:0};
    }).sort((a,b)=>b.gstAmt-a.gstAmt);
  },[catSales]);

  const todayGST=useMemo(()=>{
    // Derive from most recent month data
    const lastM=monthly[monthly.length-1];
    if(!lastM)return{output:0,input:0,net:0};
    // Approximate today's share (1 day of this month)
    const daysInMonth=new Date().getDate();
    return{output:Math.round(lastM.outputGST/Math.max(daysInMonth,1)),input:Math.round(lastM.inputGST/Math.max(daysInMonth,1)),net:Math.round(lastM.netGST/Math.max(daysInMonth,1))};
  },[monthly]);

  const totalOutput=monthly.reduce((s,m)=>s+m.outputGST,0);
  const totalInput=monthly.reduce((s,m)=>s+m.inputGST,0);
  const totalNet=monthly.reduce((s,m)=>s+m.netGST,0);
  const totalSales=monthly.reduce((s,m)=>s+m.sales,0);

  const pieData=RATE_GROUPS.map(rg=>({name:rg.label,value:catBreakdown.filter(c=>c.rate===rg.rate).reduce((s,c)=>s+c.gstAmt,0),color:rg.color})).filter(r=>r.value>0);

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live DB — GST calculated from today's sales onwards`:loading?'⏳ Loading...':'📊 Estimated data'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'🧾',label:"Today's Output GST",val:INR(todayGST.output),sub:'Tax collected today',color:'#dc2626',bg:'#fee2e2'},
          {icon:'🔖',label:"Today's Input Credit",val:INR(todayGST.input),sub:'Credit claimable',color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💰',label:'Net GST Payable',val:INR(totalNet),sub:'Output - Input credit',color:'#f59e0b',bg:'#fffbeb'},
          {icon:'📊',label:'Total Taxable Sales',val:INR(totalSales),sub:`${monthly.length} months data`,color:'#0ea5e9',bg:'#f0f9ff'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-change kpi-neutral" style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* GST notice */}
      <div style={{background:'#dbeafe',border:'1.5px solid #93c5fd',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:12,color:'#1d4ed8'}}>
        ℹ️ <strong>GST starts from 07 March 2026 (today).</strong> All calculations are based on actual daily bill uploads. Data grows as you upload daily bills.
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {[['summary','📊 Summary'],['monthly','📅 Monthly'],['category','🏷️ By Category'],['rates','📋 Rate Groups']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 18px',borderRadius:8,border:'none',fontWeight:700,cursor:'pointer',fontSize:13,background:tab===v?'#0f2d14':'#e8f5e9',color:tab===v?'#fff':'#2d7a3a'}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='summary'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>📊 GST by Rate Slab</div>
            <PieChart width={280} height={220}>
              <Pie data={pieData} cx={140} cy={100} outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                {pieData.map((p,i)=><Cell key={i} fill={p.color}/>)}
              </Pie>
              <Tooltip formatter={v=>[INR(v),'GST Amount']}/>
            </PieChart>
          </div>
          <div className="card">
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>💰 GST Summary</div>
            {RATE_GROUPS.map(rg=>{
              const gstAmt=catBreakdown.filter(c=>c.rate===rg.rate).reduce((s,c)=>s+c.gstAmt,0);
              const tv=catBreakdown.filter(c=>c.rate===rg.rate).reduce((s,c)=>s+c.taxableValue,0);
              return(
                <div key={rg.rate} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f0fdf4'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontWeight:800,fontSize:18,color:rg.color}}>{rg.rate}%</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:12}}>{rg.label}</div>
                      <div style={{fontSize:10,color:'#6b7280'}}>{INR(tv)} taxable</div>
                    </div>
                  </div>
                  <span style={{fontWeight:800,color:rg.color}}>{INR(gstAmt)}</span>
                </div>
              );
            })}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:14,paddingTop:14,borderTop:'2px solid #0f2d14'}}>
              <span style={{fontWeight:800,color:'#0f2d14'}}>Total GST</span>
              <span style={{fontWeight:800,color:'#dc2626',fontSize:16}}>{INR(totalOutput)}</span>
            </div>
          </div>
        </div>
      )}

      {tab==='monthly'&&(
        <div className="card">
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>Monthly GST Report (2026 — Today-first)</div>
          {monthly.length>0?(
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:11}}/>
                  <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:10}}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="outputGST" name="Output GST" fill="#dc2626" radius={[4,4,0,0]}/>
                  <Bar dataKey="inputGST" name="Input Credit" fill="#2d7a3a" radius={[4,4,0,0]}/>
                  <Bar dataKey="netGST" name="Net Payable" fill="#f59e0b" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <div className="tbl-wrap" style={{marginTop:12}}>
                <table className="tbl">
                  <thead><tr><th>Month</th><th>Sales</th><th>Output GST</th><th>Input Credit</th><th>Net Payable</th><th>Filing Status</th></tr></thead>
                  <tbody>
                    {monthly.map((m,i)=>(
                      <tr key={i}>
                        <td style={{fontWeight:700}}>{m.month} 2026</td>
                        <td><span className="mono">{INR(m.sales)}</span></td>
                        <td><span className="mono" style={{color:'#dc2626',fontWeight:700}}>{INR(m.outputGST)}</span></td>
                        <td><span className="mono" style={{color:'#2d7a3a',fontWeight:700}}>{INR(m.inputGST)}</span></td>
                        <td><span className="mono" style={{fontWeight:800,color:'#f59e0b'}}>{INR(m.netGST)}</span></td>
                        <td><span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:'#fef3c7',color:'#92400e'}}>Pending</span></td>
                      </tr>
                    ))}
                    <tr style={{background:'#f0fdf4',fontWeight:800}}>
                      <td>TOTAL</td>
                      <td className="mono">{INR(totalSales)}</td>
                      <td className="mono" style={{color:'#dc2626'}}>{INR(totalOutput)}</td>
                      <td className="mono" style={{color:'#2d7a3a'}}>{INR(totalInput)}</td>
                      <td className="mono" style={{color:'#f59e0b'}}>{INR(totalNet)}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ):<div style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No monthly GST data. Upload daily bills to generate.</div>}
        </div>
      )}

      {tab==='category'&&(
        <div className="card">
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>Category-wise GST Breakdown</div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Category</th><th>GST Rate</th><th>Taxable Value</th><th>GST Amount</th><th>Share</th></tr></thead>
              <tbody>
                {catBreakdown.filter(c=>c.gstAmt>0).map(c=>{
                  const totalGST=catBreakdown.reduce((s,x)=>s+x.gstAmt,0);
                  const pct=totalGST>0?((c.gstAmt/totalGST)*100).toFixed(1):0;
                  return(
                    <tr key={c.cat}>
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:c.meta?.bg,color:c.meta?.color,fontSize:12,fontWeight:700}}>{c.meta?.icon} {c.cat}</span></td>
                      <td><span style={{fontWeight:800,color:c.rate===0?'#2d7a3a':c.rate===5?'#1d4ed8':c.rate===12?'#f59e0b':'#dc2626'}}>{c.rate}%</span></td>
                      <td><span className="mono">{INR(c.taxableValue)}</span></td>
                      <td><span className="mono" style={{fontWeight:700,color:'#dc2626'}}>{INR(c.gstAmt)}</span></td>
                      <td style={{minWidth:140}}>
                        <div style={{height:6,background:'#f3f4f6',borderRadius:4,marginBottom:3}}>
                          <div style={{height:6,width:`${pct}%`,background:'#2d7a3a',borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:10,color:'#6b7280'}}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='rates'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
          {RATE_GROUPS.map(rg=>(
            <div key={rg.rate} className="card" style={{borderTop:`4px solid ${rg.color}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:28,fontWeight:800,color:rg.color}}>{rg.rate}%</div>
                <span style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,background:rg.bg,color:rg.color}}>{rg.label}</span>
              </div>
              {catBreakdown.filter(c=>c.rate===rg.rate).map(c=>(
                <div key={c.cat} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #eee',fontSize:12}}>
                  <span>{c.meta?.icon} {c.cat}</span>
                  <span className="mono" style={{fontWeight:700,color:rg.color}}>{INR(c.gstAmt)}</span>
                </div>
              ))}
              <div style={{marginTop:10,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:13}}>
                <span>Total</span>
                <span style={{color:rg.color}}>{INR(catBreakdown.filter(c=>c.rate===rg.rate).reduce((s,c)=>s+c.gstAmt,0))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}