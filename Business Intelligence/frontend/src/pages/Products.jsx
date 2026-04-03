import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { mask, maskINR, maskPct, isOwner } from '../utils/roleUtils';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';
import { productsAPI } from '../api/service';

export default function Products({ user }) {
  const isOwnerRole = user?.id === 'owner';
  const [products,setProducts]=useState(ALL_PRODUCTS);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState('');
  const [cat,setCat]=useState('All');
  const [sortKey,setSortKey]=useState('name');
  const [stockFilter,setStockFilter]=useState('all');
  const [showForm,setShowForm]=useState(false);
  const [editProd,setEditProd]=useState(null);
  const [toast,setToast]=useState(null);
  const [form,setForm]=useState({name:'',category:'Rice & Grains',price:'',cost_price:'',stock:'',unit:'pack',expiry_days:'365',reorder_point:'20'});

  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const loadProducts=()=>{
    productsAPI.getAll().then(data=>{
      if(Array.isArray(data)&&data.length>0){
        setProducts(data.map(p=>({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,expiry_days:parseInt(p.expiry_days)||365,reorder_point:parseInt(p.reorder_point)||20,risk_score:parseInt(p.risk_score)||0})));
        setLive(true);
      }
    }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{loadProducts();},[]);

  const categories=['All',...Object.keys(CATEGORY_META)];

  const filtered=useMemo(()=>{
    let d=products.filter(p=>(cat==='All'||p.category===cat)&&p.name.toLowerCase().includes(search.toLowerCase()));
    if(stockFilter==='low') d=d.filter(p=>p.stock<p.reorder_point&&p.stock>0);
    if(stockFilter==='out') d=d.filter(p=>p.stock===0);
    if(stockFilter==='ok') d=d.filter(p=>p.stock>=p.reorder_point);
    return d.sort((a,b)=>{
      if(sortKey==='price')return b.price-a.price;
      if(sortKey==='stock')return a.stock-b.stock;
      if(sortKey==='margin')return((b.price-b.cost_price)/b.price)-((a.price-a.cost_price)/a.price);
      return a.name.localeCompare(b.name);
    });
  },[products,cat,search,sortKey,stockFilter]);

  const lowStock=products.filter(p=>p.stock<p.reorder_point&&p.stock>0).length;
  const outStock=products.filter(p=>p.stock===0).length;
  const healthy=products.filter(p=>p.stock>=p.reorder_point).length;
  const totalValue=products.reduce((s,p)=>s+p.stock*p.cost_price,0);

  const openAdd=()=>{setEditProd(null);setForm({name:'',category:'Rice & Grains',price:'',cost_price:'',stock:'',unit:'pack',expiry_days:'365',reorder_point:'20'});setShowForm(true);};
  const openEdit=p=>{setEditProd(p);setForm({name:p.name,category:p.category,price:p.price,cost_price:p.cost_price,stock:p.stock,unit:p.unit||'pack',expiry_days:p.expiry_days,reorder_point:p.reorder_point});setShowForm(true);};

  const handleSave=async()=>{
    if(!form.name||!form.price)return;
    setSaving(true);
    const payload={...form,price:+form.price,cost_price:+form.cost_price,stock:+form.stock,expiry_days:+form.expiry_days,reorder_point:+form.reorder_point};
    try{
      if(live){
        if(editProd){await productsAPI.update({...payload,id:editProd.id});setProducts(prev=>prev.map(p=>p.id===editProd.id?{...p,...payload}:p));}
        else{await productsAPI.create(payload);const f=await productsAPI.getAll();if(Array.isArray(f))setProducts(f.map(p=>({...p,price:parseFloat(p.price)||0,cost_price:parseFloat(p.cost_price)||0,stock:parseInt(p.stock)||0,expiry_days:parseInt(p.expiry_days)||365,reorder_point:parseInt(p.reorder_point)||20})));}
      }else{
        if(editProd)setProducts(prev=>prev.map(p=>p.id===editProd.id?{...p,...payload}:p));
        else setProducts(prev=>[...prev,{...payload,id:Date.now(),risk_score:0}]);
      }
      showToast(editProd?'✅ Product updated!':'✅ Product added!');setShowForm(false);
    }catch{showToast('❌ Save failed','error');}
    setSaving(false);
  };

  const handleDelete=async p=>{
    if(!window.confirm(`Delete "${p.name}"?`))return;
    try{
      if(live)await productsAPI.delete(p.id);
      setProducts(prev=>prev.filter(x=>x.id!==p.id));
      showToast('🗑️ Product deleted');
    }catch{showToast('❌ Delete failed','error');}
  };

  const INR=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  return(
    <div className="fade-up">
      {toast&&<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:toast.type==='error'?'#fee2e2':toast.type==='warn'?'#fef3c7':'#e8f5e9',border:`1px solid ${toast.type==='error'?'#fca5a5':toast.type==='warn'?'#fcd34d':'#86efac'}`,borderRadius:10,padding:'12px 20px',fontWeight:700,color:toast.type==='error'?'#dc2626':toast.type==='warn'?'#92400e':'#166534',boxShadow:'0 8px 24px rgba(0,0,0,.15)'}}>{toast.msg}</div>}

      {/* Live Status */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:live?'#2d7a3a':'#f59e0b'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:live?'#43a047':'#f59e0b',display:'inline-block'}}/>
          {live?`🔴 Live DB — ${products.length} products`:loading?'⏳ Loading...':'📦 Demo mode'}
        </div>
        <button onClick={openAdd} style={{background:'#0f2d14',color:'#fff',border:'none',borderRadius:10,padding:'9px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>+ Add Product</button>
      </div>

      {/* 4 Stock KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'📦',label:'Total Products',val:products.length,sub:`${INR(totalValue)} stock value`,color:'#2d7a3a',bg:'#e8f5e9',filter:'all'},
          {icon:'✅',label:'Healthy Stock',val:healthy,sub:`${products.length>0?((healthy/products.length)*100).toFixed(0):0}% of catalog`,color:'#059669',bg:'#ecfdf5',filter:'ok'},
          {icon:'⚠️',label:'Low Stock',val:lowStock,sub:'Below reorder point',color:'#d97706',bg:'#fef3c7',filter:'low'},
          {icon:'🚨',label:'Out of Stock',val:outStock,sub:'Needs immediate reorder',color:'#dc2626',bg:'#fee2e2',filter:'out'},
        ].map(k=>(
          <div key={k.label} onClick={()=>setStockFilter(stockFilter===k.filter?'all':k.filter)}
            style={{background:k.bg,borderRadius:14,padding:'16px',cursor:'pointer',border:`2px solid ${stockFilter===k.filter?k.color:'transparent'}`,transition:'all 0.15s',boxShadow:stockFilter===k.filter?`0 4px 16px ${k.color}33`:'none'}}>
            <div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
            <div style={{fontWeight:900,fontSize:26,color:k.color}}>{k.val}</div>
            <div style={{fontSize:12,fontWeight:700,color:k.color,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products..." style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:13,width:220,outline:'none'}}/>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:12,background:'#fff',cursor:'pointer'}}>
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={sortKey} onChange={e=>setSortKey(e.target.value)} style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #d1fae5',fontSize:12,background:'#fff',cursor:'pointer'}}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="stock">Sort: Stock (Low first)</option>
          <option value="margin">Sort: Margin</option>
        </select>
        <span style={{fontSize:12,color:'#6b7280',marginLeft:4}}>{filtered.length} products</span>
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Product</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Reorder At</th><th>Expiry Days</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={10} style={{textAlign:'center',padding:40}}>⏳ Loading products...</td></tr>
            :filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No products found</td></tr>
            :filtered.map(p=>{
              const meta=CATEGORY_META[p.category];
              const margin=p.price>0?((p.price-p.cost_price)/p.price*100).toFixed(1):0;
              const status=p.stock===0?{l:'Out of Stock',c:'#dc2626',bg:'#fee2e2'}:p.stock<p.reorder_point?{l:'Low Stock',c:'#d97706',bg:'#fef3c7'}:{l:'Healthy',c:'#059669',bg:'#ecfdf5'};
              return(
                <tr key={p.id}>
                  <td><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:10,color:'#9ca3af'}}>{p.unit}</div></td>
                  <td><span style={{padding:'3px 8px',borderRadius:20,background:meta?.bg,color:meta?.color,fontSize:11,fontWeight:700}}>{meta?.icon} {p.category}</span></td>
                  <td><span className="mono" style={{fontWeight:700,color:'#0f2d14'}}>{INR(p.price)}</span></td>
                  <td><span className="mono" style={{color:'#6b7280'}}>{isOwner(user) ? INR(p.cost_price) : '****'}</span></td>
                  <td><span style={{fontWeight:700,color:margin>25?'#059669':margin>15?'#d97706':'#dc2626'}}>{margin}%</span></td>
                  <td><span style={{fontWeight:800,fontSize:15,color:status.c}}>{p.stock}</span></td>
                  <td style={{color:'#6b7280',fontSize:12}}>{p.reorder_point}</td>
                  <td style={{color:p.expiry_days<=7?'#dc2626':p.expiry_days<=14?'#d97706':'#6b7280',fontWeight:p.expiry_days<=14?700:400,fontSize:12}}>{p.expiry_days}d</td>
                  <td><span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:status.bg,color:status.c}}>{status.l}</span></td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>openEdit(p)} className="btn btn-outline btn-sm">✏️ Edit</button>
                      <button onClick={()=>handleDelete(p)} className="btn btn-sm" style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal — rendered via Portal to escape page-wrap overflow clipping */}
      {showForm && createPortal(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:16,padding:28,width:500,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:17,color:'#0f2d14'}}>{editProd?'✏️ Edit Product':'+ Add New Product'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'#f3f4f6',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            {[
              {l:'Product Name',k:'name',type:'text'},
              {l:'Price (₹)',k:'price',type:'number'},
              {l:'Cost Price (₹)',k:'cost_price',type:'number'},
              {l:'Stock Qty',k:'stock',type:'number'},
              {l:'Reorder Point',k:'reorder_point',type:'number'},
              {l:'Expiry Days',k:'expiry_days',type:'number'},
              {l:'Unit',k:'unit',type:'text'},
            ].map(f=>(
              <div key={f.k} style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{f.l}</label>
                <input type={f.type} value={form[f.k]} onChange={e=>setForm(prev=>({...prev,[f.k]:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #d1fae5',fontSize:13,boxSizing:'border-box',outline:'none'}}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Category</label>
              <select value={form.category} onChange={e=>setForm(prev=>({...prev,category:e.target.value}))}
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #d1fae5',fontSize:13}}>
                {Object.keys(CATEGORY_META).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={handleSave} disabled={saving} style={{flex:1,background:'#0f2d14',color:'#fff',border:'none',borderRadius:10,padding:'11px',fontWeight:700,cursor:'pointer',fontSize:14}}>
                {saving?'Saving...':editProd?'Update Product':'Add Product'}
              </button>
              <button onClick={()=>setShowForm(false)} style={{padding:'11px 20px',borderRadius:10,border:'1.5px solid #e5e7eb',cursor:'pointer',fontWeight:700,fontSize:14}}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}