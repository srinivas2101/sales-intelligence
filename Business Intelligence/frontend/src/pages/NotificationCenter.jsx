import React, { useState, useEffect, useCallback } from 'react';
import { notificationsAPI, dashboardAPI, productsAPI } from '../api/service';

const parseProduct = p => ({
  ...p,
  price:         parseFloat(p.price)         || 0,
  cost_price:    parseFloat(p.cost_price)     || 0,
  stock:         parseInt(p.stock)            || 0,
  expiry_days:   parseInt(p.expiry_days)      || 365,
  reorder_point: parseInt(p.reorder_point)    || 20,
});


const INR = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const LS_KEY = 'bi_dismissed_notifs';

// localStorage helpers
const loadDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveDismissed = set => {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])); } catch {}
};

export default function NotificationCenter({ user }) {
  const [notifications, setNotifs]    = useState([]);
  const [loading,       setLoading]   = useState(true);
  const [filter,        setFilter]    = useState('all');
  const [dismissed,     setDismissed] = useState(loadDismissed);   // ← persisted
  const [lastRefresh,   setLastRefresh] = useState(null);
  const [apiStatus,     setApiStatus] = useState({ notif:'idle', dash:'idle', prod:'idle' });

  // Persist dismissed to localStorage whenever it changes
  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  // Notify App-level badge via CustomEvent
  const emitCount = useCallback((visible) => {
    window.dispatchEvent(new CustomEvent('notif-count-changed', { detail: { count: visible } }));
  }, []);

  const loadNotifications = useCallback(async (injectUploadResult = null) => {
    setLoading(true);

    const [notifRes, dashRes, prodRes] = await Promise.allSettled([
      notificationsAPI.get(),
      dashboardAPI.get(),
      productsAPI.getAll(),
    ]);

    setApiStatus({
      notif: notifRes.status === 'fulfilled' ? 'ok' : 'fail',
      dash:  dashRes.status  === 'fulfilled' ? 'ok' : 'fail',
      prod:  prodRes.status  === 'fulfilled' ? 'ok' : 'fail',
    });

    const notifs = [];

    // 1. Fresh upload inject (from DailySales CustomEvent)
    if (injectUploadResult?.success) {
      notifs.push({
        id: 'upload-fresh-' + Date.now(),
        type: 'upload', icon: '✅',
        title: 'Bills Uploaded Successfully!',
        msg: `${injectUploadResult.bills || 0} bills processed — ${injectUploadResult.processed || 0} items sold — Revenue: ${INR(injectUploadResult.total_revenue || 0)}`,
        time: new Date().toISOString(), color: '#166534', bg: '#dcfce7', priority: 0, badge: 'JUST NOW',
      });
    }

    // 2. Live from notifications.php
    if (notifRes.status === 'fulfilled') {
      (notifRes.value?.notifications || []).forEach((n, i) => {
        if (injectUploadResult?.success && n.type === 'upload') return;
        notifs.push({
          id: `live-${n.type}-${i}`,
          type: n.type, icon: n.icon || '🔔',
          title: n.title || 'Notification', msg: n.msg || '',
          time: n.time || new Date().toISOString(),
          color: n.color || '#374151', bg: n.bg || '#f9fafb',
          priority: n.type==='critical'?1 : n.type==='expiry'?2 : n.type==='stock'?3 : n.type==='upload'?4 : n.type==='revenue'?5 : 7,
          badge: 'LIVE',
        });
      });
    }

    // 3. Fallback from dashboardAPI
    const dash = dashRes.status === 'fulfilled' ? dashRes.value : null;
    if (!notifs.some(n=>n.type==='upload') && (dash?.upload_count||0) > 0) {
      notifs.push({ id:'dash-upload', type:'upload', icon:'📤',
        title:'Daily Bills Uploaded Today',
        msg:`${dash.upload_count} upload(s) — ${dash.bills_today||0} bills, ${INR(dash.revenue?.today||0)} revenue`,
        time:new Date().toISOString(), color:'#2d7a3a', bg:'#e8f5e9', priority:4 });
    }
    if (!notifs.some(n=>n.type==='revenue') && (dash?.revenue?.today||0) > 0) {
      const rev=dash.revenue.today, cnt=Math.max(dash.bills_today||1,1);
      notifs.push({ id:'dash-rev', type:'revenue', icon:'💰',
        title:"Today's Revenue Update",
        msg:`Earned ${INR(rev)} from ${dash.bills_today||0} bills — avg ${INR(rev/cnt)}/bill`,
        time:new Date().toISOString(), color:'#1d4ed8', bg:'#dbeafe', priority:5 });
    }

    // 4. Fallback from productsAPI
    const prods = prodRes.status==='fulfilled' && Array.isArray(prodRes.value) ? prodRes.value : [];
    if (!notifs.some(n=>n.type==='expiry')) {
      prods.filter(p=>parseInt(p.expiry_days||999)<=7&&parseInt(p.stock||0)>0).slice(0,5).forEach(p=>{
        const d=parseInt(p.expiry_days);
        notifs.push({ id:`exp-${p.id}`, type:'expiry', icon:'⏰',
          title:'Expiry Alert', msg:`${p.name} — expires in ${d} day(s). Apply discount or return to supplier.`,
          time:new Date().toISOString(), color:d<=2?'#dc2626':'#ea580c', bg:d<=2?'#fee2e2':'#ffedd5', priority:d<=2?1:2 });
      });
    }
    if (!notifs.some(n=>n.type==='stock')) {
      prods.filter(p=>parseInt(p.stock||0)<parseInt(p.reorder_point||20)&&parseInt(p.stock||0)>0).slice(0,4).forEach(p=>{
        notifs.push({ id:`low-${p.id}`, type:'stock', icon:'📦',
          title:'Low Stock Alert', msg:`${p.name} — only ${p.stock} units left. Reorder at ${p.reorder_point}.`,
          time:new Date().toISOString(), color:'#d97706', bg:'#fef3c7', priority:3 });
      });
    }
    if (!notifs.some(n=>n.type==='critical')) {
      prods.filter(p=>parseInt(p.stock||0)===0).slice(0,3).forEach(p=>{
        notifs.push({ id:`oos-${p.id}`, type:'critical', icon:'🚨',
          title:'Out of Stock!', msg:`${p.name} — 0 units remaining. Customer orders cannot be fulfilled.`,
          time:new Date().toISOString(), color:'#dc2626', bg:'#fee2e2', priority:1 });
      });
    }

    // 5. Static tips — fixed IDs so dismiss persists across refreshes
    notifs.push({ id:'static-tip-weekend', type:'tip', icon:'💡',
      title:'Daily Business Tip',
      msg:'Weekend is coming! Stock up on beverages, snacks & impulse-buy items for Saturday & Sunday peak sales.',
      time:new Date().toISOString(), color:'#7c3aed', bg:'#f5f3ff', priority:8 });
    notifs.push({ id:'static-gst-monthly', type:'gst', icon:'📋',
      title:'GST Reminder',
      msg:'File your monthly GSTR-1 on time. Check GST Report page for output tax summary.',
      time:new Date().toISOString(), color:'#0ea5e9', bg:'#f0f9ff', priority:8 });

    const sorted = notifs.sort((a,b)=>a.priority-b.priority);
    setNotifs(sorted);
    setLastRefresh(new Date());
    setLoading(false);

    // Tell App how many are visible after applying persisted dismissed
    const currentDismissed = loadDismissed();
    const visibleCount = sorted.filter(n => !currentDismissed.has(n.id)).length;
    emitCount(visibleCount);
  }, [emitCount]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Listen for upload events from DailySales
  useEffect(() => {
    const handler = e => {
      setDismissed(prev => {
        const next = new Set(prev);
        for (const k of next) { if (k.startsWith('upload-fresh-')) next.delete(k); }
        return next;
      });
      loadNotifications(e.detail);
    };
    window.addEventListener('bills-uploaded', handler);
    return () => window.removeEventListener('bills-uploaded', handler);
  }, [loadNotifications]);

  // Auto-refresh every 90 seconds
  useEffect(() => {
    const t = setInterval(() => loadNotifications(), 90_000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  const dismiss = id => {
    setDismissed(prev => {
      const next = new Set([...prev, id]);
      saveDismissed(next);
      const visibleCount = notifications.filter(n => !next.has(n.id)).length;
      emitCount(visibleCount);
      return next;
    });
  };

  const dismissAll = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setDismissed(allIds);
    saveDismissed(allIds);
    emitCount(0);
  };

  const visible  = notifications.filter(n => !dismissed.has(n.id));
  const filtered = filter === 'all' ? visible : visible.filter(n => n.type === filter);
  const types    = [...new Set(notifications.map(n => n.type))];

  const counts = {
    critical: visible.filter(n=>n.type==='critical'||n.type==='expiry').length,
    stock:    visible.filter(n=>n.type==='stock').length,
    upload:   visible.filter(n=>n.type==='upload'||n.type==='revenue').length,
    info:     visible.filter(n=>n.type==='tip'||n.type==='gst').length,
  };

  const statusDot = apiStatus.notif==='idle' ? { label:'● Connecting…', color:'#9ca3af' }
                  : apiStatus.notif==='ok'   ? { label:'● Live DB',     color:'#166534' }
                  : Object.values(apiStatus).some(s=>s==='ok') ? { label:'◑ Partial', color:'#d97706' }
                  : { label:'○ Offline', color:'#dc2626' };

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontWeight:800,fontSize:16,color:'#0f2d14'}}>🔔 Notification Center</span>
          {visible.length > 0 && (
            <span style={{background:'#dc2626',color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>
              {visible.length}
            </span>
          )}
          <span style={{fontSize:11,fontWeight:700,color:statusDot.color}}>{statusDot.label}</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {lastRefresh && (
            <span style={{fontSize:10,color:'#9ca3af'}}>
              Refreshed {lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </span>
          )}
          <button onClick={()=>loadNotifications()}
            style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:8,padding:'6px 14px',fontWeight:700,cursor:'pointer',fontSize:12,color:'#166534'}}>
            ↻ Refresh
          </button>
          {visible.length > 0 && (
            <button onClick={dismissAll}
              style={{background:'#f3f4f6',border:'none',borderRadius:8,padding:'6px 14px',fontWeight:700,cursor:'pointer',fontSize:12,color:'#6b7280'}}>
              ✓ Dismiss All
            </button>
          )}
        </div>
      </div>

      {/* API warning */}
      {apiStatus.notif === 'fail' && (
        <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400e'}}>
          ⚠️ <strong>notifications.php unreachable</strong> — showing data from dashboard & products APIs instead.
          Check XAMPP is running and <code>backend/api/notifications.php</code> exists.
        </div>
      )}
      {apiStatus.notif==='fail' && apiStatus.dash==='fail' && apiStatus.prod==='fail' && (
        <div style={{background:'#fee2e2',border:'1.5px solid #fca5a5',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#dc2626'}}>
          🔴 <strong>All APIs offline.</strong> Make sure XAMPP is running at <code>localhost/sales-intelligence</code>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          {icon:'🚨',label:'Critical',    val:counts.critical,color:'#dc2626',bg:'#fee2e2'},
          {icon:'📦',label:'Stock',       val:counts.stock,   color:'#d97706',bg:'#fef3c7'},
          {icon:'💰',label:'Business',    val:counts.upload,  color:'#2d7a3a',bg:'#e8f5e9'},
          {icon:'💡',label:'Info & Tips', val:counts.info,    color:'#7c3aed',bg:'#f5f3ff'},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:'12px 14px',textAlign:'center'}}>
            <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
            <div style={{fontWeight:800,fontSize:20,color:k.color}}>{k.val}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {['all',...types].map(t=>(
          <button key={t} onClick={()=>setFilter(t)}
            style={{padding:'6px 16px',borderRadius:20,border:'none',fontWeight:700,cursor:'pointer',fontSize:12,
              background:filter===t?'#0f2d14':'#f3f4f6', color:filter===t?'#fff':'#374151'}}>
            {t==='all'?`All (${visible.length})`:t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>⏳ Loading notifications…</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>
          <div style={{fontSize:40,marginBottom:12}}>🔔</div>
          No notifications — all clear!
        </div>
      ) : (
        filtered.map(n => (
          <div key={n.id} style={{
            background:n.bg, borderRadius:12, padding:'14px 18px', marginBottom:8,
            display:'flex', gap:14, alignItems:'flex-start',
            border:`1.5px solid ${n.color}${n.badge==='JUST NOW'?'cc':'33'}`,
            boxShadow:n.badge==='JUST NOW'?`0 0 0 3px ${n.color}22,0 4px 12px rgba(0,0,0,.08)`:'0 2px 8px rgba(0,0,0,.05)',
          }}>
            <div style={{fontSize:24,flexShrink:0,marginTop:2}}>{n.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontWeight:800,color:n.color,fontSize:13}}>{n.title}</span>
                {n.badge && (
                  <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,
                    background:n.badge==='JUST NOW'?'#dcfce7':`${n.color}15`,
                    color:n.color, border:`1px solid ${n.color}44`}}>
                    {n.badge}
                  </span>
                )}
              </div>
              <div style={{fontSize:12,color:'#374151',lineHeight:1.6}}>{n.msg}</div>
              <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>
                {new Date(n.time).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
            <button onClick={()=>dismiss(n.id)}
              style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16,flexShrink:0,padding:4}}>
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}