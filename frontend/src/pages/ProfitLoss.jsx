import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { salesAPI } from '../api/service';
import { CATEGORY_META } from '../data/products';

const P=['#2d7a3a','#4caf50','#f59e0b','#3b82f6','#f43f5e','#8b5cf6','#06b6d4','#fb923c'];
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div style={{background:'#1a4a1f',borderRadius:10,padding:'10px 14px'}}><div style={{color:'#a5d6a7',fontWeight:700,marginBottom:4,fontSize:12}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:'#fff',fontSize:12}}><span style={{color:p.color}}>{p.name}: </span><strong>₹{Number(p.value)?.toLocaleString('en-IN')}</strong></div>)}</div>;};

export default function ProfitLoss({ user }) {
  const [monthly,setMonthly]=useState([]);
  const [catData,setCatData]=useState([]);
  const [todayData,setTodayData]=useState(null);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState('monthly');
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{
    Promise.all([salesAPI.getProfitMonthly(),salesAPI.getByCategory(90),salesAPI.getToday()])
      .then(([mData,catRaw,todayRaw])=>{
        if(Array.isArray(mData)&&mData.length>0){
          const processed=mData.map(m=>{
            const rev=parseFloat(m.revenue)||0,profit=parseFloat(m.profit)||0;
            const cogs=rev-profit,opex=rev*0.08,waste=rev*0.02;
            return{month:m.month,month_num:parseInt(m.month_num),revenue:Math.round(rev),cogs:Math.round(cogs),opex:Math.round(opex),waste:Math.round(waste),profit:Math.round(profit-opex-waste),gross:Math.round(profit),margin:rev>0?+((profit/rev)*100).toFixed(1):0,bills:parseInt(m.bills)||0};
          });
          setMonthly(processed);setLive(true);
        }
        if(Array.isArray(catRaw)&&catRaw.length>0){
          setCatData(catRaw.map((c,i)=>({cat:c.category,icon:CATEGORY_META[c.category]?.icon||'📦',color:P[i%8],revenue:Math.round(parseFloat(c.revenue)||0),profit:Math.round(parseFloat(c.profit)||0),units:parseInt(c.units)||0,margin:parseFloat(c.revenue)>0?+((parseFloat(c.profit)/parseFloat(c.revenue))*100).toFixed(1):0})).sort((a,b)=>b.profit-a.profit));
        }
        if(todayRaw)setTodayData(todayRaw);
      }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const totalRev=monthly.reduce((s,m)=>s+m.revenue,0);
  const totalCOGS=monthly.reduce((s,m)=>s+m.cogs,0);
  const totalWaste=monthly.reduce((s,m)=>s+m.waste,0);
  const totalOpex=monthly.reduce((s,m)=>s+m.opex,0);
  const totalProfit=monthly.reduce((s,m)=>s+m.profit,0);
  const CURR=monthly[monthly.length-1]||{};
  const PREV=monthly[monthly.length-2]||{};
  const revG=PREV.revenue?((CURR.revenue-PREV.revenue)/PREV.revenue*100).toFixed(1):0;

  const todayRev=parseFloat(todayData?.today?.revenue||0);
  const todayProfit=parseFloat(todayData?.today?.profit||0);
  const todayBills=parseInt(todayData?.today?.bills||0);

  if(!live&&!loading)return(
    <div className="card" style={{textAlign:'center',padding:48}}>
      <div style={{fontSize:48,marginBottom:12}}>📊</div>
      <div style={{fontSize:20,fontWeight:800,color:'#0f2d14',marginBottom:8}}>No P&L Data Yet</div>
      <div style={{color:'#6b7280',fontSize:14}}>Upload daily bills to auto-generate Profit & Loss reports.</div>
      <div style={{marginTop:16,background:'#fffbeb',padding:'12px 24px',borderRadius:8,display:'inline-block',fontSize:13,color:'#92400e'}}>📤 <strong>Daily Bills Upload</strong> → P&L auto-calculates</div>
    </div>
  );

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live DB — P&L from ${monthly.length} months of real sales data (today-first)`:loading?'⏳ Loading...':'No data'}
      </div>

      {/* 5 KPI Cards */}
      <div className="kpi-grid" style={{marginBottom:16}}>
        {[
          {icon:'💰',label:"Today's Revenue",val:INR(todayRev),sub:`${todayBills} bills today`,color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💹',label:'Total Revenue',val:INR(totalRev),sub:`▲ ${revG}% vs prev month`,color:'#0ea5e9',bg:'#f0f9ff'},
          {icon:'🏭',label:'Cost of Goods',val:INR(totalCOGS),sub:`${totalRev>0?((totalCOGS/totalRev)*100).toFixed(1):0}% of revenue`,color:'#dc2626',bg:'#fee2e2'},
          {icon:'🏢',label:'Operating Exp',val:INR(totalOpex),sub:'Est. 8% of revenue',color:'#8b5cf6',bg:'#f5f3ff'},
          {icon:'💎',label:'Net Profit',val:INR(totalProfit),sub:`${totalRev>0?((totalProfit/totalRev)*100).toFixed(1):0}% margin`,color:'#059669',bg:'#ecfdf5'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-change kpi-neutral" style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['monthly','📅 Monthly P&L'],['categories','🏷️ By Category'],['breakdown','📊 Cost Breakdown'],['trend','📈 Profit Trend']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:'8px 18px',borderRadius:8,border:'none',fontWeight:700,cursor:'pointer',fontSize:13,background:view===v?'#0f2d14':'#e8f5e9',color:view===v?'#fff':'#2d7a3a'}}>
            {l}
          </button>
        ))}
      </div>

      {view==='monthly'&&(
        <div className="card">
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:16,fontSize:14}}>Monthly Revenue & Profit — 2026 (Today-first)</div>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:10}}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="revenue" name="Revenue" fill="#2d7a3a" radius={[4,4,0,0]}/>
                <Bar dataKey="gross" name="Gross Profit" fill="#4caf50" radius={[4,4,0,0]}/>
                <Bar dataKey="profit" name="Net Profit" fill="#a5d6a7" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ):<div style={{height:300,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>No monthly data</div>}
          {/* Monthly table */}
          <div className="tbl-wrap" style={{marginTop:16}}>
            <table className="tbl">
              <thead><tr><th>Month</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>Margin</th><th>Net Profit</th><th>Bills</th></tr></thead>
              <tbody>
                {monthly.map(m=>(
                  <tr key={m.month}>
                    <td style={{fontWeight:700}}>{m.month} 2026</td>
                    <td><span className="mono" style={{fontWeight:700,color:'#0f2d14'}}>{INR(m.revenue)}</span></td>
                    <td><span className="mono" style={{color:'#dc2626'}}>{INR(m.cogs)}</span></td>
                    <td><span className="mono" style={{color:'#2d7a3a',fontWeight:700}}>{INR(m.gross)}</span></td>
                    <td><span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:m.margin>20?'#e8f5e9':m.margin>10?'#fef3c7':'#fee2e2',color:m.margin>20?'#2d7a3a':m.margin>10?'#92400e':'#dc2626'}}>{m.margin}%</span></td>
                    <td><span className="mono" style={{fontWeight:800,color:'#0ea5e9'}}>{INR(m.profit)}</span></td>
                    <td style={{color:'#6b7280'}}>{m.bills}</td>
                  </tr>
                ))}
                <tr style={{background:'#f0fdf4',fontWeight:800}}>
                  <td>TOTAL</td>
                  <td className="mono">{INR(totalRev)}</td>
                  <td className="mono" style={{color:'#dc2626'}}>{INR(totalCOGS)}</td>
                  <td className="mono" style={{color:'#2d7a3a'}}>{INR(totalRev-totalCOGS)}</td>
                  <td><span style={{fontWeight:700}}>{totalRev>0?((totalProfit/totalRev)*100).toFixed(1):0}%</span></td>
                  <td className="mono" style={{color:'#0ea5e9'}}>{INR(totalProfit)}</td>
                  <td>{monthly.reduce((s,m)=>s+m.bills,0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view==='categories'&&(
        <div className="card">
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:16,fontSize:14}}>Category-wise P&L (Last 90 days)</div>
          {catData.length>0?(
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData.slice(0,8)} margin={{top:5,right:20,left:0,bottom:30}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="cat" tick={{fontSize:9}} angle={-25} textAnchor="end" interval={0}/>
                  <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:9}}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>{catData.slice(0,8).map((_,i)=><Cell key={i} fill={P[i%8]}/>)}</Bar>
                  <Bar dataKey="profit" name="Profit" fill="#a5d6a7" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <div className="tbl-wrap" style={{marginTop:12}}>
                <table className="tbl">
                  <thead><tr><th>Category</th><th>Revenue</th><th>Profit</th><th>Margin</th><th>Units</th></tr></thead>
                  <tbody>
                    {catData.map(c=>(
                      <tr key={c.cat}>
                        <td style={{fontWeight:600}}>{c.icon} {c.cat}</td>
                        <td><span className="mono" style={{color:'#2d7a3a',fontWeight:700}}>{INR(c.revenue)}</span></td>
                        <td><span className="mono" style={{color:'#0ea5e9',fontWeight:700}}>{INR(c.profit)}</span></td>
                        <td><span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:c.margin>20?'#e8f5e9':c.margin>10?'#fef9c3':'#fee2e2',color:c.margin>20?'#166534':c.margin>10?'#713f12':'#dc2626'}}>{c.margin}%</span></td>
                        <td style={{color:'#6b7280'}}>{c.units?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ):<div style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No category data</div>}
        </div>
      )}

      {view==='breakdown'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>📊 Cost Structure</div>
            <PieChart width={280} height={220}>
              <Pie data={[{name:'Revenue',value:totalRev-totalCOGS-totalOpex-totalWaste},{name:'COGS',value:totalCOGS},{name:'OpEx',value:totalOpex},{name:'Waste',value:totalWaste}]} cx={140} cy={100} outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                {['#2d7a3a','#dc2626','#8b5cf6','#f59e0b'].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie>
              <Tooltip formatter={v=>[`₹${v.toLocaleString('en-IN')}`]}/>
            </PieChart>
          </div>
          <div className="card">
            <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>💰 P&L Summary</div>
            {[
              {l:'Total Revenue',v:totalRev,c:'#2d7a3a'},
              {l:'(-) Cost of Goods',v:-totalCOGS,c:'#dc2626'},
              {l:'= Gross Profit',v:totalRev-totalCOGS,c:'#059669',bold:true},
              {l:'(-) Operating Exp',v:-totalOpex,c:'#8b5cf6'},
              {l:'(-) Waste/Expiry',v:-totalWaste,c:'#f59e0b'},
              {l:'= Net Profit',v:totalProfit,c:'#0ea5e9',bold:true},
            ].map(r=>(
              <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f0fdf4',fontWeight:r.bold?800:400}}>
                <span style={{fontSize:13,color:r.bold?'#0f2d14':'#374151'}}>{r.l}</span>
                <span className="mono" style={{color:r.c,fontSize:13}}>{r.v<0?'-'+INR(-r.v):INR(r.v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view==='trend'&&(
        <div className="card">
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:14,fontSize:14}}>📈 Profit Trend (Month over Month)</div>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly} margin={{top:5,right:20,left:0,bottom:5}}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d7a3a" stopOpacity={0.3}/><stop offset="95%" stopColor="#2d7a3a" stopOpacity={0}/></linearGradient>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4caf50" stopOpacity={0.2}/><stop offset="95%" stopColor="#4caf50" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:10}}/>
                <Tooltip content={<TT/>}/>
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2d7a3a" fill="url(#rg)" strokeWidth={2}/>
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#4caf50" fill="url(#pg)" strokeWidth={2}/>
                <Line type="monotone" dataKey="margin" name="Margin%" stroke="#f59e0b" strokeWidth={1.5} dot={{fill:'#f59e0b',r:3}} yAxisId="right"/>
              </AreaChart>
            </ResponsiveContainer>
          ):<div style={{height:300,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>No trend data</div>}
        </div>
      )}
    </div>
  );
}