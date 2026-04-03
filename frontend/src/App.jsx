import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProfitLoss from './pages/ProfitLoss';
import Prediction from './pages/Prediction';
import RiskAlerts from './pages/RiskAlerts';
import CustomerIntelligence from './pages/CustomerIntelligence';
import WhatIfSimulation from './pages/WhatIfSimulation';
import ExpiryTracker from './pages/ExpiryTracker';
import DailySales from './pages/DailySales';
import NotificationCenter from './pages/NotificationCenter';
import WhatsAppAlerts from './pages/WhatsAppAlerts';
import SalesCalendar from './pages/SalesCalendar';
import ProductRankings from './pages/ProductRankings';
import PriceHistory from './pages/PriceHistory';
import LoginPage from './pages/LoginPage';
import './App.css';

export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost/sales-intelligence/backend/api';

const NAV = [
  { section: 'Overview' },
  { id: 'dashboard',    label: 'Dashboard',          icon: '▦',  roles: ['owner','manager'] },
  { id: 'calendar',     label: 'Sales Calendar',     icon: '📅', roles: ['owner','manager'] },
  { section: 'Operations' },
  { id: 'products',     label: 'Products & Stock',   icon: '⊞',  roles: ['owner','manager'] },
  { id: 'profitloss',   label: 'Profit & Loss',      icon: '₹',  roles: ['owner'] },
  { id: 'expiry',       label: 'Expiry Tracker',     icon: '⏰', roles: ['owner','manager'] },
  { section: 'Analytics' },
  { id: 'rankings',     label: 'Product Rankings',   icon: '🏆', roles: ['owner','manager'] },
  { id: 'pricehistory', label: 'Price History',      icon: '📉', roles: ['owner','manager'] },
  { section: 'Intelligence' },
  { id: 'prediction',   label: 'AI Demand Forecast', icon: '◈',  badge: 'AI', roles: ['owner','manager'] },
  { id: 'risk',         label: 'Risk Alerts',        icon: '◉',  badge: '3', roles: ['owner','manager'] },
  { id: 'customers',    label: 'Customer Intel',     icon: '◎',  roles: ['owner','manager'] },
  { id: 'simulation',   label: 'What-If Simulator',  icon: '⬡',  roles: ['owner'] },
  { section: 'Billing' },
  { id: 'dailysales',   label: 'Daily Bills Upload', icon: '📤', roles: ['owner','manager'] },
  { section: 'More' },
  { id: 'whatsapp',     label: 'WhatsApp Alerts',    icon: '📱', roles: ['owner','manager'] },
  { id: 'notifications',label: 'Notifications',      icon: '🔔', roles: ['owner','manager'] },
];

const ROLE_META = {
  owner:   { color: '#2d7a3a', bg: '#e8f5e9', icon: '👑' },
  manager: { color: '#1d4ed8', bg: '#dbeafe', icon: '🏪' },
};

const pages = {
  dashboard: Dashboard, products: Products, profitloss: ProfitLoss,
  prediction: Prediction, risk: RiskAlerts, customers: CustomerIntelligence,
  simulation: WhatIfSimulation, expiry: ExpiryTracker, dailysales: DailySales,
  notifications: NotificationCenter, whatsapp: WhatsAppAlerts,
  calendar: SalesCalendar, rankings: ProductRankings, pricehistory: PriceHistory,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => { document.body.classList.toggle('dark-mode', darkMode); }, [darkMode]);

  // Dynamic notification badge — updated by NotificationCenter via CustomEvent
  const [notifCount, setNotifCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bi_dismissed_notifs') || '[]').length > 0 ? 0 : 5; }
    catch { return 0; }
  });
  useEffect(() => {
    const handler = e => setNotifCount(e.detail.count);
    window.addEventListener('notif-count-changed', handler);
    return () => window.removeEventListener('notif-count-changed', handler);
  }, []);
  useEffect(() => {
    const handler = () => setNotifCount(c => c + 1);
    window.addEventListener('bills-uploaded', handler);
    return () => window.removeEventListener('bills-uploaded', handler);
  }, []);

  const handleLogin = (role) => {
    setUser(role);
    const firstPage = NAV.find(n => n.id && n.roles?.includes(role.id));
    setActive(firstPage?.id || 'dashboard');
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const allowedNav = NAV.filter(n => !n.id || n.roles?.includes(user.id));
  const Page = pages[active] || Dashboard;
  const navItem = NAV.find(n => n.id === active);
  const roleMeta = ROLE_META[user.id];

  return (
    <div className="app">
      <aside className={`sidebar ${open ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🛒</div>
          {open && <div><div className="brand-name">Business Intelligence</div></div>}
          <button className="sidebar-toggle" onClick={() => setOpen(!open)}>{open ? '◀' : '▶'}</button>
        </div>

        {open && (
          <div className="sidebar-role-badge" style={{ '--rc': roleMeta.color, '--rb': roleMeta.bg }}>
            <span className="srb-icon">{user.icon}</span>
            <div><div className="srb-label">{user.label}</div><div className="srb-sub">Logged in</div></div>
          </div>
        )}

        <nav className="sidebar-nav">
          {allowedNav.map((item, i) => {
            if (item.section) return open ? <div key={i} className="nav-section">{item.section}</div> : null;
            return (
              <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)} title={item.label}>
                <span className="nav-icon">{item.icon}</span>
                {open && <span className="nav-label">{item.label}</span>}
                {open && (item.id === 'notifications' ? (notifCount > 0 && <span className="nav-badge">{notifCount}</span>) : (item.badge && <span className="nav-badge">{item.badge}</span>))}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {open ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div className="store-info">
                <div className="store-dot" />
                <div><div className="store-name">Business Intelligence</div><div className="store-text">System Online</div></div>
              </div>
              <button className="btn-logout" onClick={() => { setUser(null); setActive(null); }}>⏻ Logout</button>
            </div>
          ) : (
            <button className="btn-logout-icon" onClick={() => { setUser(null); setActive(null); }} title="Logout">⏻</button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{navItem?.icon} {navItem?.label}</div>
          </div>
          <div className="topbar-right">
            <button className="dark-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Light Mode' : 'Dark Mode'}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="dark-toggle" onClick={() => { setActive('notifications'); }} style={{ position:'relative' }}>
              🔔
              {notifCount > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, background:'#dc2626', borderRadius:'50%', fontSize:9, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{notifCount}</span>}
            </button>
            <div className="topbar-role-chip" style={{ background:roleMeta.bg, color:roleMeta.color }}>
              {user.icon} {user.label}
            </div>
            <span className="topbar-pill pill-live">● Live</span>
            <span className="topbar-pill pill-date">
              {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
            </span>
          </div>
        </header>
        <div className="page-wrap"><Page user={user} /></div>
      </main>
    </div>
  );
}