import React, { useState, useRef, useEffect } from 'react';
import { ALL_PRODUCTS } from '../data/products';
import { productsAPI } from '../api/service';

const parseProduct = p => ({
  ...p,
  price:         parseFloat(p.price)         || 0,
  cost_price:    parseFloat(p.cost_price)     || 0,
  stock:         parseInt(p.stock)            || 0,
  expiry_days:   parseInt(p.expiry_days)      || 365,
  reorder_point: parseInt(p.reorder_point)    || 20,
});


const API = (process.env.REACT_APP_API_BASE || 'http://localhost/sales-intelligence/backend/api') + '/upload_bills.php';

export default function DailySales({ user }) {
  const [file,       setFile]       = useState(null);
  const [saleDate,   setSaleDate]   = useState(new Date().toISOString().slice(0,10));
  const [status,     setStatus]     = useState('idle');
  const [result,     setResult]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [products,   setProducts]   = useState(ALL_PRODUCTS);
  const [live,       setLive]       = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    productsAPI.getAll()
      .then(raw => { const data = Array.isArray(raw) ? raw.map(parseProduct) : []; if (data.length > 0) { setProducts(data.map(parseProduct)); setLive(true); } })
      .catch(() => {});
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { setErrorMsg('Only .xlsx .xls .csv accepted'); return; }
    setFile(f); setErrorMsg(''); setResult(null); setStatus('idle');
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading'); setErrorMsg(''); setResult(null);
    const form = new FormData();
    form.append('bills_file', file);
    form.append('sale_date', saleDate);
    try {
      const res  = await fetch(API, { method:'POST', body:form });
      const data = await res.json();
      if (data.success) {
        setResult(data); setStatus('success'); setFile(null);
        // 🔔 Fire event → NotificationCenter picks this up instantly
        window.dispatchEvent(new CustomEvent('bills-uploaded', { detail: data }));
        // Refresh products to show updated stock
        if (live) productsAPI.getAll().then(d => { if (Array.isArray(d)) setProducts(d.map(parseProduct)); }).catch(()=>{});
      } else {
        setErrorMsg(data.error || 'Upload failed'); setStatus('error');
      }
    } catch {
      setErrorMsg('Cannot reach server. Check XAMPP is running.'); setStatus('error');
    }
  };

  const INR = (n) => '₹' + Number(n||0).toLocaleString('en-IN');

  // Sample products for reference table
  const sampleProds = products.slice(0,3).map(p=>p.name);

  return (
    <div className="fade-up" style={{ maxWidth:860, margin:'0 auto' }}>

      {/* Header */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0f2d14' }}>📋 Daily Bills Upload</h2>
            <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:13 }}>
              Upload bills → stock auto-reduces → revenue saved
              {live && <span style={{ color:'#2d7a3a', marginLeft:8, fontWeight:700 }}>● Live DB ({products.length} products)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom:20, background:'#f0fdf4', border:'1.5px solid #bbf7d0' }}>
        <div style={{ fontWeight:700, color:'#166534', marginBottom:10, fontSize:14 }}>💡 How It Works</div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {[
            { n:'1', t:'Fill Excel', d:'Bill No + Customer + Phone + Payment + Products (per-unit price × qty = auto total).' },
            { n:'2', t:'Upload Here', d:'Select sale date → drag & drop your filled Excel file.' },
            { n:'3', t:'Done!', d:'Stock auto-reduces per unit sold. Revenue & customers updated.' },
          ].map(s => (
            <div key={s.n} style={{ flex:1, minWidth:180, display:'flex', gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'#0f2d14',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontWeight:700, color:'#0f2d14', fontSize:13 }}>{s.t}</div>
                <div style={{ color:'#374151', fontSize:12, marginTop:2 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload form */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, color:'#111827', marginBottom:16, fontSize:15 }}>📤 Upload Bills File</div>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <label style={{ fontWeight:600, color:'#374151', fontSize:13 }}>📅 Sale Date:</label>
          <input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid #d1fae5', fontSize:14, fontWeight:600, color:'#166534', background:'#f0fdf4', outline:'none' }} />
          <span style={{ fontSize:12, color:'#9ca3af', fontStyle:'italic' }}>Change if uploading for a different day</span>
        </div>

        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
          onClick={()=>fileRef.current?.click()}
          style={{ border:`2.5px dashed ${dragOver?'#2d7a3a':file?'#2d7a3a':'#d1fae5'}`, borderRadius:14,
            background:dragOver?'#e8f5e9':file?'#f0fdf4':'#fafafa',
            padding:'36px 20px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', marginBottom:16 }}>
          <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])} />
          {file ? (
            <><div style={{fontSize:36,marginBottom:8}}>📋</div>
              <div style={{fontWeight:800,color:'#166534',fontSize:15}}>{file.name}</div>
              <div style={{color:'#6b7280',fontSize:12,marginTop:4}}>{(file.size/1024).toFixed(1)} KB · Click to change</div></>
          ) : (
            <><div style={{fontSize:42,marginBottom:10}}>📂</div>
              <div style={{fontWeight:700,color:'#374151',fontSize:15}}>Drag & Drop your Bills Excel here</div>
              <div style={{color:'#9ca3af',fontSize:12,marginTop:6}}>or click to browse · .xlsx .xls .csv</div></>
          )}
        </div>

        {errorMsg && <div style={{ padding:'10px 14px', background:'#fee2e2', borderRadius:8, color:'#dc2626', fontSize:13, fontWeight:600, marginBottom:12 }}>❌ {errorMsg}</div>}

        <button onClick={handleUpload} disabled={!file||status==='uploading'}
          style={{ width:'100%', padding:14, borderRadius:12,
            background:!file||status==='uploading'?'#d1fae5':'#0f2d14',
            color:!file||status==='uploading'?'#6b7280':'#fff',
            fontWeight:800, fontSize:15, border:'none', cursor:!file?'not-allowed':'pointer', transition:'all 0.2s' }}>
          {status==='uploading' ? '⟳ Processing Bills & Updating Stock...' : '⬆️ Process Bills & Update Stock'}
        </button>
      </div>

      {/* Success */}
      {status==='success' && result && (
        <div className="card" style={{ border:'2px solid #bbf7d0', background:'#f0fdf4', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <span style={{fontSize:28}}>✅</span>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:'#166534'}}>Upload Successful! Stock Updated.</div>
              <div style={{fontSize:13,color:'#374151'}}>{result.message}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              {icon:'🧾',label:'Bills',value:result.bills,color:'#1d4ed8',bg:'#dbeafe'},
              {icon:'📦',label:'Items Sold',value:result.processed,color:'#166534',bg:'#e8f5e9'},
              {icon:'💰',label:'Revenue',value:INR(result.total_revenue),color:'#166534',bg:'#e8f5e9'},
              {icon:'⏭️',label:'Skipped',value:result.skipped,color:'#92400e',bg:'#fef3c7'},
            ].map(k=>(
              <div key={k.label} style={{background:k.bg,borderRadius:12,padding:14,textAlign:'center'}}>
                <div style={{fontSize:22}}>{k.icon}</div>
                <div style={{fontSize:20,fontWeight:800,color:k.color,marginTop:4}}>{k.value}</div>
                <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{k.label}</div>
              </div>
            ))}
          </div>
          {result.stock_issues?.length > 0 && (
            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontWeight:700,color:'#92400e',marginBottom:8,fontSize:13}}>⚠️ Issues ({result.stock_issues.length})</div>
              {result.stock_issues.map((iss,i)=><div key={i} style={{fontSize:12,color:'#78350f',marginBottom:4}}>• {iss}</div>)}
            </div>
          )}
          <button onClick={()=>{setStatus('idle');setResult(null);}}
            style={{padding:'10px 20px',borderRadius:10,background:'#0f2d14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>
            Upload Another File
          </button>
          <div style={{ background:'#dcfce7', borderRadius:10, padding:14, marginTop:12, border:'1px solid #86efac' }}>
            <div style={{ fontWeight:800, color:'#166534', marginBottom:8, fontSize:14 }}>🎉 All pages now show your live data!</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {['Dashboard','Sales Calendar','Profit & Loss','Product Rankings','AI Forecast','Risk Alerts','Customer Intel'].map(p => (
                <span key={p} style={{ background:'#fff', border:'1px solid #86efac', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#166534', fontWeight:600 }}>✅ {p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Format Quick Reference */}
      <div className="card" style={{ background:'#f8fafc' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{fontWeight:700,color:'#374151',fontSize:14}}>📌 Excel Format — Quick Reference</div>
          <div style={{fontSize:12,color:'#6b7280'}}>Price per 1 unit · Customer qty × price = bill total</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>{['Bill No','Customer','Phone','Payment','Product 1','Qty 1','Disc 1','Product 2','Qty 2','Disc 2','Bill Total'].map(h=>(
                <th key={h} style={{background:'#0f2d14',color:'#fff',padding:'7px 10px',fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[
                ['B001','Ravi Kumar','9876543210','UPI', sampleProds[0]||'Sona Masoori Rice 1kg','5','0', sampleProds[1]||'Toor Dal 1kg','2','0',''],
                ['B002','Priya S','9988776655','Cash', sampleProds[2]||'Milk 1L Packet','5','0','','','',''],
                ['B003','Walk-in','','Cash','Potato Chips 26g','3','0','Cold Drink 500ml','2','0',''],
              ].map((row,i)=>(
                <tr key={i} style={{background:i%2===0?'#f0fdf4':'#fff'}}>
                  {row.map((cell,j)=>(
                    <td key={j} style={{padding:'6px 10px',borderBottom:'1px solid #e8f5e9',
                      color:j===0?'#1d4ed8':j===4||j===7?'#166534':j===5||j===8?'#d97706':'#374151',
                      fontWeight:j===0||j===5||j===8?700:400,whiteSpace:'nowrap'}}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'#fffbeb',borderRadius:8,fontSize:12,color:'#92400e'}}>
          <strong>⭐ Key rules:</strong> Same Bill No = same customer. One row per bill. Multiple products in columns E→AI. 
          Price is per 1 unit (1kg/1L/1pc). Enter Qty = how many units sold. Disc = rupee discount per item.
          {live && <span style={{color:'#166534',marginLeft:8}}>✅ {products.length} products in DB</span>}
        </div>
      </div>

    </div>
  );
}