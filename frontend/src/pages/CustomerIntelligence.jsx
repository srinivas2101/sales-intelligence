import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { customersAPI } from '../api/service';

const SEG={
  loyal:   {icon:'👑',color:'#2d7a3a',bg:'#e8f5e9',label:'Loyal',action:'Issue VIP loyalty card with 5% cashback on every visit.',strategy:'Reward, upsell premium brands, offer early festival deals.'},
  regular: {icon:'⭐',color:'#3b82f6',bg:'#dbeafe',label:'Regular',action:'Send weekly combo WhatsApp offer to increase visit frequency.',strategy:'Nudge towards loyalty tier with incremental rewards.'},
  occasional:{icon:'🕐',color:'#f59e0b',bg:'#fffbeb',label:'Occasional',action:'Festival offer — Buy ₹500 get ₹50 off. SMS campaign.',strategy:'Convert to regular with targeted seasonal offers.'},
  new:     {icon:'🌱',color:'#8b5cf6',bg:'#f5f3ff',label:'New',action:'Welcome coupon: ₹30 off on 2nd visit.',strategy:'Excellent first experience. 3 good visits = regular customer.'},
  inactive:{icon:'😴',color:'#9ca3af',bg:'#f3f4f6',label:'Inactive',action:'"We miss you" WhatsApp + 15% off this weekend.',strategy:'Win-back campaign. If 2 attempts fail, close account.'},
};

const SAMPLE_CUSTOMERS=[
  {id:1,name:'Murugan A',phone:'98765 43210',segment:'loyal',spent:48200,visits:92,avg:524,last:'2026-03-07'},
  {id:2,name:'Kavitha R',phone:'98765 43211',segment:'loyal',spent:36500,visits:78,avg:468,last:'2026-03-07'},
  {id:3,name:'Shanthi D',phone:'98765 43218',segment:'loyal',spent:42100,visits:85,avg:495,last:'2026-03-06'},
  {id:4,name:'Selvi P',phone:'98765 43212',segment:'regular',spent:18000,visits:40,avg:450,last:'2026-03-07'},
  {id:5,name:'Ramesh G',phone:'98765 43213',segment:'regular',spent:12400,visits:28,avg:443,last:'2026-03-05'},
  {id:6,name:'Arun P',phone:'98765 43219',segment:'regular',spent:15800,visits:32,avg:494,last:'2026-03-07'},
  {id:7,name:'Priya S',phone:'98765 43214',segment:'occasional',spent:5200,visits:10,avg:520,last:'2026-03-01'},
  {id:8,name:'Anbu K',phone:'98765 43215',segment:'occasional',spent:3800,visits:7,avg:543,last:'2026-02-20'},
  {id:9,name:'Deepa M',phone:'98765 43216',segment:'new',spent:1200,visits:3,avg:400,last:'2026-03-07'},
  {id:10,name:'Velu N',phone:'98765 43217',segment:'inactive',spent:850,visits:2,avg:425,last:'2026-01-15'},
];

export default function CustomerIntelligence({ user }) {
  const [customers,setCustomers]=useState(SAMPLE_CUSTOMERS);
  const [live,setLive]=useState(false);
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState('');
  const [segFilter,setSegFilter]=useState('all');
  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  useEffect(()=>{
    customersAPI.get().then(d=>{
      if(d?.customers?.length){
        setCustomers(d.customers.map(c=>({...c,spent:parseFloat(c.total_spent)||0,visits:parseInt(c.visit_count)||0,avg:parseFloat(c.avg_bill)||0})));
        setLive(true);
      }
    }).catch(()=>{});
  },[]);

  const segStats=Object.keys(SEG).map(seg=>({
    seg,config:SEG[seg],
    count:customers.filter(c=>c.segment===seg).length,
    total:customers.filter(c=>c.segment===seg).reduce((s,c)=>s+c.spent,0),
  }));

  const totalRev=customers.reduce((s,c)=>s+c.spent,0);
  const loyalRev=customers.filter(c=>c.segment==='loyal').reduce((s,c)=>s+c.spent,0);
  const avgBasket=Math.round(customers.reduce((s,c)=>s+c.avg,0)/Math.max(customers.length,1));
  const inactive=customers.filter(c=>c.segment==='inactive').length;

  const pieData=segStats.filter(s=>s.count>0).map(s=>({name:s.config.label,value:s.count,color:s.config.color}));
  const filteredC=customers.filter(c=>(segFilter==='all'||c.segment===segFilter)&&(c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)));

  return(
    <div className="fade-up">
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
        {live?`🔴 Live DB — ${customers.length} customers tracked`:'📊 Sample data — Upload bills with customer info for live data'}
      </div>

      {/* 4 KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'👥',label:'Total Customers',val:customers.length,sub:'Active accounts',color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💰',label:'Customer Revenue',val:INR(totalRev),sub:`${INR(loyalRev)} from loyal`,color:'#f59e0b',bg:'#fffbeb'},
          {icon:'🧾',label:'Avg Basket Value',val:INR(avgBasket),sub:'Per transaction',color:'#3b82f6',bg:'#dbeafe'},
          {icon:'😴',label:'At Risk (Inactive)',val:inactive,sub:'Need win-back now',color:'#dc2626',bg:'#fee2e2'},
        ].map(k=>(
          <div key={k.label} className="kpi-card" style={{'--kpi-color':k.color,'--kpi-bg':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-change kpi-neutral" style={{fontSize:10}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16,marginBottom:16}}>
        {/* Segment cards */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {segStats.map(s=>(
            <div key={s.seg} onClick={()=>setSegFilter(segFilter===s.seg?'all':s.seg)}
              style={{background:'#fff',border:`2px solid ${segFilter===s.seg?s.config.color:'#e5e7eb'}`,borderRadius:12,padding:'14px 18px',cursor:'pointer',transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:s.config.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{s.config.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:800,fontSize:14}}>{s.config.label} Customers</span>
                    <span style={{fontWeight:900,color:s.config.color,fontSize:20}}>{s.count}</span>
                  </div>
                  <div style={{height:6,background:'#f3f4f6',borderRadius:4,marginTop:5}}>
                    <div style={{height:6,width:`${customers.length>0?(s.count/customers.length)*100:0}%`,background:s.config.color,borderRadius:4}}/>
                  </div>
                  <div style={{display:'flex',gap:14,marginTop:4}}>
                    <span style={{fontSize:11,color:'#6b7280'}}>{INR(s.total)} total</span>
                    <span style={{fontSize:11,color:'#6b7280'}}>{s.count>0?((s.count/customers.length)*100).toFixed(0):0}% of base</span>
                  </div>
                </div>
              </div>
              {segFilter===s.seg&&(
                <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{padding:'10px 12px',background:s.config.bg,borderRadius:10}}>
                    <div style={{fontWeight:700,color:s.config.color,fontSize:12,marginBottom:4}}>📢 Action</div>
                    <div style={{fontSize:11,color:'#374151',lineHeight:1.6}}>{s.config.action}</div>
                  </div>
                  <div style={{padding:'10px 12px',background:'#f8fafc',borderRadius:10}}>
                    <div style={{fontWeight:700,color:'#374151',fontSize:12,marginBottom:4}}>🎯 Strategy</div>
                    <div style={{fontSize:11,color:'#374151',lineHeight:1.6}}>{s.config.strategy}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pie chart */}
        <div className="card" style={{padding:16}}>
          <div style={{fontWeight:700,color:'#0f2d14',marginBottom:12,fontSize:13}}>🥧 Customer Mix</div>
          <PieChart width={240} height={200}>
            <Pie data={pieData} cx={115} cy={95} outerRadius={85} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {pieData.map((p,i)=><Cell key={i} fill={p.color}/>)}
            </Pie>
            <Tooltip formatter={v=>[v,'Customers']}/>
          </PieChart>
          <div style={{marginTop:8}}>
            {segStats.filter(s=>s.count>0).map(s=>(
              <div key={s.seg} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,fontSize:12}}>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:s.config.color,marginRight:6}}/>{s.config.label}</span>
                <span style={{fontWeight:700,color:s.config.color}}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name or phone..." style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:13,width:250,outline:'none'}}/>
        <span style={{display:'flex',alignItems:'center',fontSize:12,color:'#6b7280'}}>{filteredC.length} customers</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Segment</th><th>Total Spent</th><th>Visits</th><th>Avg Bill</th><th>Last Visit</th><th>Recommended Action</th></tr></thead>
          <tbody>
            {filteredC.map(c=>{
              const s=SEG[c.segment]||SEG.occasional;
              return(
                <tr key={c.id}>
                  <td><div style={{fontWeight:700}}>{c.name}</div><div style={{fontSize:11,color:'#9ca3af'}}>{c.phone}</div></td>
                  <td><span style={{padding:'3px 10px',borderRadius:20,background:s.bg,color:s.color,fontSize:11,fontWeight:700}}>{s.icon} {s.label}</span></td>
                  <td><span className="mono" style={{fontWeight:700,color:'#2d7a3a'}}>{INR(c.spent)}</span></td>
                  <td style={{fontWeight:700}}>{c.visits}</td>
                  <td><span className="mono">{INR(c.avg)}</span></td>
                  <td style={{fontSize:11,color:'#6b7280'}}>{c.last?new Date(c.last).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—'}</td>
                  <td style={{fontSize:12,color:'#374151',maxWidth:200}}>{s.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}