import React, { useState, useEffect, useRef } from 'react';
import { ALL_PRODUCTS, CATEGORY_META } from '../data/products';

// ── Risk calc (same as RiskAlerts.jsx) ──────────────────────────────────────
const calcRisk = p => {
  let score = 0;
  if (p.stock === 0) score += 35;
  else if (p.stock < p.reorder_point) score += Math.round(25 * (1 - p.stock / p.reorder_point));
  if (p.expiry_days <= 2) score += 35;
  else if (p.expiry_days <= 7) score += 20;
  else if (p.expiry_days <= 14) score += 10;
  if (p.risk_score && p.risk_score > score) score = p.risk_score;
  const level = score >= 70 ? 'CRITICAL' : score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
  return { ...p, riskScore: Math.min(score, 100), riskLevel: level };
};

// ── Build WhatsApp message text ──────────────────────────────────────────────
const buildMessage = (riskData, ownerName = 'Owner') => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const critical = riskData.filter(r => r.riskLevel === 'CRITICAL').slice(0, 3);
  const high = riskData.filter(r => r.riskLevel === 'HIGH').slice(0, 3);
  const expiring = riskData.filter(r => r.expiry_days <= 7).slice(0, 3);
  const outOfStock = riskData.filter(r => r.stock === 0).slice(0, 3);
  const totalCritical = riskData.filter(r => r.riskLevel === 'CRITICAL').length;
  const totalHigh = riskData.filter(r => r.riskLevel === 'HIGH').length;

  let msg = `🛒 *Business Intelligence — Daily Report*\n`;
  msg += `📅 ${dateStr}\n`;
  msg += `Good morning, ${ownerName}! Here's your store summary.\n\n`;

  if (totalCritical > 0) {
    msg += `🚨 *CRITICAL ALERTS (${totalCritical} items)*\n`;
    critical.forEach(p => {
      if (p.stock === 0) msg += `• ${p.name} — *Out of stock!* Reorder now\n`;
      else if (p.expiry_days <= 2) msg += `• ${p.name} — *Expires in ${p.expiry_days} day(s)!* Discount immediately\n`;
      else msg += `• ${p.name} — Risk Score: ${p.riskScore}/100\n`;
    });
    if (totalCritical > 3) msg += `  _...and ${totalCritical - 3} more critical items_\n`;
    msg += `\n`;
  }

  if (totalHigh > 0) {
    msg += `⚡ *HIGH RISK (${totalHigh} items)*\n`;
    high.forEach(p => msg += `• ${p.name} — Stock: ${p.stock} units, Expiry: ${p.expiry_days}d\n`);
    if (totalHigh > 3) msg += `  _...and ${totalHigh - 3} more_\n`;
    msg += `\n`;
  }

  if (expiring.length > 0) {
    msg += `⏰ *Expiring This Week*\n`;
    expiring.forEach(p => msg += `• ${p.name} — ${p.expiry_days} day(s) left\n`);
    msg += `\n`;
  }

  if (outOfStock.length > 0) {
    msg += `📦 *Out of Stock*\n`;
    outOfStock.forEach(p => msg += `• ${p.name} (${p.category})\n`);
    msg += `\n`;
  }

  msg += `✅ *${riskData.filter(r => r.riskLevel === 'LOW').length} products* are healthy.\n\n`;
  msg += `_Sent by Business Intelligence System • ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}_`;
  return msg;
};

// ── Twilio send via PHP backend proxy ────────────────────────────────────────
// We call a small PHP proxy so credentials stay server-side (not exposed in JS)
// File: backend/api/whatsapp_send.php  (created below as a comment)
const sendViaProxy = async (to, message, config) => {
  // Direct Twilio call from frontend (sandbox testing only)
  const sid = config.accountSid;
  const token = config.authToken;
  const from = 'whatsapp:+14155238886';
  const toNum = `whatsapp:${to.startsWith('+') ? to : '+' + to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const body = new URLSearchParams();
  body.append('From', from);
  body.append('To', toNum);
  body.append('Body', message);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (data.sid) return { ok: true, sid: data.sid };
  throw new Error(data.message || 'Twilio error');
};

export default function WhatsAppAlerts({ user }) {
  const [riskData, setRiskData] = useState([]);
  const [config, setConfig] = useState({
    accountSid: process.env.REACT_APP_TWILIO_SID,
    authToken: process.env.REACT_APP_TWILIO_TOKEN,
    ownerPhone: '+919150603323',
    ownerName: 'Sri',
  });
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [lastSent, setLastSent] = useState(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [logs, setLogs] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const intervalRef = useRef(null);

  // Build risk data once
  useEffect(() => {
    const scored = ALL_PRODUCTS.map(p => calcRisk({
      ...p,
      price: parseFloat(p.price) || 0,
      cost_price: parseFloat(p.cost_price) || 0,
      stock: parseInt(p.stock) || 0,
      expiry_days: parseInt(p.expiry_days) || 365,
      reorder_point: parseInt(p.reorder_point) || 20,
    })).sort((a, b) => b.riskScore - a.riskScore);
    setRiskData(scored);
  }, []);

  // Build preview whenever data/config changes
  useEffect(() => {
    if (riskData.length) setPreview(buildMessage(riskData, config.ownerName));
  }, [riskData, config.ownerName]);

  // Schedule checker — every minute
  useEffect(() => {
    if (!scheduleEnabled) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      if (hhmm === scheduleTime) handleSend(true);
    }, 60000);
    return () => clearInterval(intervalRef.current);
  }, [scheduleEnabled, scheduleTime, riskData, config]);

  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ type, msg, time }, ...prev.slice(0, 19)]);
  };

  const handleSend = async (auto = false) => {
    if (!config.accountSid || !config.authToken || !config.ownerPhone) {
      setErrorMsg('Credentials missing — fill config first!');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const message = buildMessage(riskData, config.ownerName);
      const res = await sendViaProxy(config.ownerPhone, message, config);
      setStatus('sent');
      setLastSent(new Date());
      addLog('success', `${auto ? '🕐 Auto-sent' : '✅ Manually sent'} to ${config.ownerPhone} — SID: ${res.sid}`);
      setTimeout(() => setStatus(null), 4000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
      addLog('error', `❌ Failed: ${e.message}`);
    }
  };

  const counts = {
    CRITICAL: riskData.filter(r => r.riskLevel === 'CRITICAL').length,
    HIGH: riskData.filter(r => r.riskLevel === 'HIGH').length,
    MEDIUM: riskData.filter(r => r.riskLevel === 'MEDIUM').length,
    LOW: riskData.filter(r => r.riskLevel === 'LOW').length,
  };

  return (
    <div className="fade-up" style={{ maxWidth: 1100 }}>

      {/* Header strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📱</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>WhatsApp Daily Summary Bot</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Auto-send store alerts every morning to owner</div>
          </div>
        </div>
        <button onClick={() => setShowConfig(s => !s)}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#374151' }}>
          ⚙️ {showConfig ? 'Hide' : 'Config'}
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#374151' }}>🔧 Twilio Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxx' },
              { key: 'authToken', label: 'Auth Token', placeholder: '••••••••••••••••••', type: 'password' },
              { key: 'ownerPhone', label: "Owner's WhatsApp Number", placeholder: '+919XXXXXXXXX' },
              { key: 'ownerName', label: "Owner's Name", placeholder: 'Sri' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={config[f.key]}
                  onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['🚨', 'CRITICAL', counts.CRITICAL, '#dc2626', '#fee2e2'],
          ['⚡', 'HIGH', counts.HIGH, '#ea580c', '#ffedd5'],
          ['🟡', 'MEDIUM', counts.MEDIUM, '#d97706', '#fef3c7'],
          ['✅', 'HEALTHY', counts.LOW, '#2d7a3a', '#e8f5e9'],
        ].map(([icon, label, val, color, bg]) => (
          <div key={label} style={{ background: bg, borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${color}22` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 900, fontSize: 26, color }}>{val}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

        {/* Message Preview */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#374151' }}>📋 Message Preview</div>
          <div style={{
            background: '#e5ddd5',
            borderRadius: 16,
            padding: 16,
            minHeight: 380,
            fontFamily: 'system-ui',
            position: 'relative',
          }}>
            {/* WhatsApp bubble */}
            <div style={{
              background: '#fff',
              borderRadius: '4px 16px 16px 16px',
              padding: '12px 16px',
              maxWidth: '90%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#111',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {preview.split('\n').map((line, i) => {
                // Bold for *text*
                const parts = line.split(/(\*[^*]+\*)/g);
                return (
                  <div key={i}>
                    {parts.map((p, j) =>
                      p.startsWith('*') && p.endsWith('*')
                        ? <strong key={j}>{p.slice(1, -1)}</strong>
                        : p.startsWith('_') && p.endsWith('_')
                          ? <em key={j} style={{ color: '#6b7280', fontSize: 11 }}>{p.slice(1, -1)}</em>
                          : <span key={j}>{p}</span>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 6 }}>
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Send Now */}
          <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#374151' }}>📤 Send Now</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
              Sends to <strong>{config.ownerPhone}</strong>
            </div>

            <button
              onClick={() => handleSend(false)}
              disabled={status === 'sending'}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 11,
                border: 'none',
                background: status === 'sending' ? '#9ca3af' : status === 'sent' ? '#16a34a' : status === 'error' ? '#dc2626' : '#25D366',
                color: '#fff',
                fontWeight: 800,
                fontSize: 15,
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
              }}>
              {status === 'sending' ? '⏳ Sending...'
                : status === 'sent' ? '✅ Sent Successfully!'
                  : status === 'error' ? '❌ Failed — Retry'
                    : '📱 Send WhatsApp Now'}
            </button>

            {status === 'error' && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {lastSent && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                Last sent: {lastSent.toLocaleTimeString('en-IN')}
              </div>
            )}
          </div>

          {/* Auto Schedule */}
          <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>🕐 Auto Schedule</div>
              <div
                onClick={() => setScheduleEnabled(s => !s)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: scheduleEnabled ? '#25D366' : '#d1d5db',
                  position: 'relative', cursor: 'pointer', transition: 'background .2s',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: scheduleEnabled ? 23 : 3,
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {scheduleEnabled ? '🟢 Auto-send is ON' : '⚪ Auto-send is OFF'} — sends daily at:
            </div>

            <input
              type="time"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d1d5db', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
            />

            {scheduleEnabled && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                ✅ Will send at {scheduleTime} daily (keep browser open)
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
              💡 For true daily automation, set a cron job on your server calling the PHP script.
            </div>
          </div>

          {/* What's included */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#374151' }}>📋 Message Includes</div>
            {[
              ['🚨', 'Critical stock & expiry alerts'],
              ['⚡', 'High risk product list'],
              ['⏰', 'Items expiring this week'],
              ['📦', 'Out of stock products'],
              ['✅', 'Healthy product count'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: '#374151' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      {logs.length > 0 && (
        <div style={{ marginTop: 20, background: '#0f172a', borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>📜 Activity Log</div>
          {logs.map((log, i) => (
            <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: log.type === 'success' ? '#4ade80' : '#f87171', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>[{log.time}]</span> {log.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}