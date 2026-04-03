// ── Role-based data masking utilities ────────────────────────────────────────
export const isOwner   = u => u?.id === 'owner';
export const isManager = u => u?.id === 'manager';

// Returns masked string for manager, real value for owner
export const mask = (value, user) => (isOwner(user) ? value : '****');

// Returns masked ₹ amount
export const maskINR = (value, user) => {
  if (isOwner(user))
    return '₹' + Number(value||0).toLocaleString('en-IN', {maximumFractionDigits:0});
  return '****';
};

// Returns masked % value
export const maskPct = (value, user, decimals=1) => {
  if (isOwner(user)) return Number(value||0).toFixed(decimals) + '%';
  return '****';
};

// Style for masked cells
export const maskStyle = u => isManager(u)
  ? { color:'#94a3b8', letterSpacing:'2px', fontFamily:'monospace' }
  : {};