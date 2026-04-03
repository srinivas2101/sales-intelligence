import React, { useState } from 'react';

// ─── Fixed credentials for 2 roles ───────────────────────────────────────────
const CREDENTIALS = [
  {
    id: 'owner',
    label: 'Store Owner',
    icon: '👑',
    email: 'owner@supermart.in',
    password: 'owner123',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: 'manager',
    label: 'Store Manager',
    icon: '🏪',
    email: 'manager@supermart.in',
    password: 'manager123',
    color: '#2563eb',
    bg: '#eff6ff',
  },
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showCreds, setShowCreds] = useState(false);

  const handleLogin = (e) => {
    e?.preventDefault();
    setError('');

    const emailTrimmed = email.trim().toLowerCase();
    const role = CREDENTIALS.find(
      r => r.email === emailTrimmed && r.password === password
    );

    if (!role) {
      setError('Invalid email or password. Please try again.');
      return;
    }

    setLoading(true);
    setTimeout(() => onLogin(role), 800);
  };

  const fillCreds = (role) => {
    setEmail(role.email);
    setPassword(role.password);
    setError('');
    setShowCreds(false);
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .lp-wrap    { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .lp-input   { transition: border-color 0.18s, box-shadow 0.18s; }
        .lp-input:focus {
          outline: none;
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.14);
        }
        .lp-btn:hover:not(:disabled) {
          background: #15803d !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(22,163,74,0.38) !important;
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .lp-btn { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }

        .cred-row:hover { background: #f8fafc !important; cursor: pointer; }
        .show-pw:hover  { opacity: 1 !important; }
      `}</style>

      {/* Left panel — branding */}
      <div style={S.left}>
        <div style={S.leftInner}>
          <div style={S.logoBox}>🛒</div>
          <div style={S.logoName}>BUSINESS</div>
          <div style={S.logoSub}>Intelligence</div>

          <div style={S.dividerLine} />

          <div style={S.tagline}>
            Manage smarter.<br />Sell faster.
          </div>
          <div style={S.tagSub}>
            Your all-in-one supermarket intelligence platform — forecasts, risk alerts, billing & more.
          </div>

          {/* Stats row */}
          <div style={S.statsRow}>
            {[
              { num: '160+', label: 'Products' },
              { num: '2',    label: 'Roles'    },
              { num: 'Live', label: 'Status'   },
            ].map(s => (
              <div key={s.label} style={S.stat}>
                <div style={S.statNum}>{s.num}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decoration circles */}
        <div style={{ ...S.circle, width: 320, height: 320, bottom: -80, right: -80, opacity: 0.07 }} />
        <div style={{ ...S.circle, width: 180, height: 180, top: 40, right: 40, opacity: 0.05 }} />
      </div>

      {/* Right panel — login form */}
      <div style={S.right}>
        <div className="lp-wrap" style={S.card}>

          {/* Header */}
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Sign in</div>
            <div style={S.cardSub}>Enter your credentials to continue</div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={S.form}>

            {/* Email */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Email address</label>
              <div style={S.inputWrap}>
                <span style={S.inputIcon}>✉️</span>
                <input
                  className="lp-input"
                  type="email"
                  placeholder="you@supermart.in"
                  value={email}
                  autoFocus
                  autoComplete="email"
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  style={S.input}
                />
              </div>
            </div>

            {/* Password */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Password</label>
              <div style={S.inputWrap}>
                <span style={S.inputIcon}>🔑</span>
                <input
                  className="lp-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="show-pw"
                  onClick={() => setShowPw(v => !v)}
                  style={S.showPwBtn}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={S.errorBox}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="lp-btn"
              disabled={!email || !password || loading}
              style={S.submitBtn}
            >
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                  <span style={S.spinner} /> Signing in...
                </span>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Credentials reference */}
          <div style={S.credSection}>
            <button
              type="button"
              onClick={() => setShowCreds(v => !v)}
              style={S.credToggle}
            >
              {showCreds ? '▲' : '▼'} &nbsp;Demo Credentials
            </button>

            {showCreds && (
              <div style={S.credTable}>
                <div style={S.credHead}>
                  <span>Role</span>
                  <span>Email</span>
                  <span>Password</span>
                  <span></span>
                </div>
                {CREDENTIALS.map(r => (
                  <div
                    key={r.id}
                    className="cred-row"
                    onClick={() => fillCreds(r)}
                    style={S.credRow}
                  >
                    <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{
                        ...S.roleDot,
                        background: r.color,
                      }} />
                      <span style={{ fontWeight:600, color:'#1e293b' }}>{r.label}</span>
                    </span>
                    <span style={S.credMono}>{r.email}</span>
                    <span style={S.credMono}>{r.password}</span>
                    <span style={{ color: r.color, fontSize:11, fontWeight:700 }}>USE →</span>
                  </div>
                ))}
                <div style={S.credNote}>
                  Click any row to auto-fill credentials
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={S.cardFooter}>
            🔒 Secured login &nbsp;·&nbsp; Business Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'DM Sans', sans-serif",
    background: '#f8fafc',
  },

  /* Left branding panel */
  left: {
    width: '42%',
    background: 'linear-gradient(160deg, #0f2d14 0%, #1a4d1f 50%, #145218 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 48px',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  leftInner: {
    position: 'relative',
    zIndex: 2,
    maxWidth: 320,
  },
  logoBox: {
    width: 56, height: 56,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28,
    marginBottom: 18,
    backdropFilter: 'blur(8px)',
  },
  logoName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 32,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '3px',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 28,
  },
  dividerLine: {
    height: 1,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)',
    marginBottom: 28,
  },
  tagline: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.25,
    marginBottom: 14,
  },
  tagSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.7,
    marginBottom: 36,
    fontWeight: 400,
  },
  statsRow: {
    display: 'flex',
    gap: 24,
  },
  stat: {
    textAlign: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 800,
    color: '#4ade80',
    fontFamily: "'Syne', sans-serif",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    marginTop: 4,
  },
  circle: {
    position: 'absolute',
    borderRadius: '50%',
    background: '#fff',
    pointerEvents: 'none',
  },

  /* Right form panel */
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    background: '#f8fafc',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(15,30,16,0.09), 0 1px 3px rgba(0,0,0,0.04)',
    border: '1px solid #e8f0e8',
  },

  /* Card internals */
  cardHeader: { marginBottom: 28 },
  cardTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f1f10',
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '-0.4px',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13.5,
    color: '#6b7280',
    fontWeight: 400,
  },

  form: { display: 'flex', flexDirection: 'column', gap: 18 },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
  },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: {
    position: 'absolute', left: 13, fontSize: 15,
    pointerEvents: 'none', zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    fontSize: 14,
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    color: '#0f1f10',
    fontFamily: "'DM Sans', sans-serif",
  },
  showPwBtn: {
    position: 'absolute', right: 12,
    background: 'none', border: 'none',
    fontSize: 16, cursor: 'pointer',
    opacity: 0.45, padding: 4,
    transition: 'opacity 0.15s',
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 9,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: 600,
  },

  submitBtn: {
    width: '100%',
    padding: '13px',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 11,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '-0.2px',
    boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
    marginTop: 4,
  },

  spinner: {
    display: 'inline-block',
    width: 17, height: 17,
    border: '2.5px solid rgba(255,255,255,0.35)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  /* Credentials section */
  credSection: { marginTop: 24 },
  credToggle: {
    width: '100%',
    padding: '9px 14px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    transition: 'background 0.15s',
  },
  credTable: {
    marginTop: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
  },
  credHead: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr 1.2fr 0.5fr',
    padding: '8px 14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 10,
    fontWeight: 800,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.9px',
    gap: 8,
  },
  credRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr 1.2fr 0.5fr',
    padding: '10px 14px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 12,
    color: '#475569',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    transition: 'background 0.15s',
  },
  roleDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  credMono: {
    fontFamily: 'monospace',
    fontSize: 11.5,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  credNote: {
    padding: '8px 14px',
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    background: '#f8fafc',
  },

  cardFooter: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
  },
};