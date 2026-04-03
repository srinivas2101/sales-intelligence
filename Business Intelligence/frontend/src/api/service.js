export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost/sales-intelligence/backend/api';

const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

export const productsAPI   = {
  getAll: ()   => apiFetch('products.php'),
  create: (d)  => apiFetch('products.php', { method:'POST', body:JSON.stringify(d) }),
  update: (d)  => apiFetch('products.php', { method:'PUT',  body:JSON.stringify(d) }),
  delete: (id) => apiFetch(`products.php?id=${id}`, { method:'DELETE' }),
};
export const salesAPI      = {
  get: (params='') => apiFetch(`sales.php${params}`),
  getTrend: (days=30) => apiFetch(`sales.php?type=trend&period=${days}`),
  getCalendar: () => apiFetch('sales.php?type=calendar'),
  getByCategory: (days=30) => apiFetch(`sales.php?type=by_category&period=${days}`),
  getRankings: (days=30) => apiFetch(`sales.php?type=rankings&period=${days}`),
  getProfitMonthly: () => apiFetch('sales.php?type=profit_monthly'),
  getToday: () => apiFetch('sales.php?type=today'),
  getSummary: (days=30) => apiFetch(`sales.php?type=summary&period=${days}`),
};
export const dashboardAPI  = { get: () => apiFetch('dashboard.php') };
export const riskAPI       = { get: () => apiFetch('risk.php') };
export const customersAPI  = { get: () => apiFetch('customers.php') };
export const simulateAPI   = { run: (d) => apiFetch('simulate.php', { method:'POST', body:JSON.stringify(d) }) };
export const rootCauseAPI  = { analyse: (id, period=30) => apiFetch('root_cause.php', { method:'POST', body:JSON.stringify({ product_id:id, period }) }) };
export const predictAPI    = { get: (p) => apiFetch('predict.php', { method:'POST', body:JSON.stringify({ product_id:p.id, category:p.category, price:p.price, stock:p.stock, cost_price:p.cost_price, days_to_expiry:p.expiry_days||180 }) }) };
export const checkConnection = async () => { try { await apiFetch('dashboard.php'); return true; } catch { return false; } };
export const gstAPI = { get: () => apiFetch('gst.php') };
export const expiryAPI = { get: () => apiFetch('expiry.php') };
export const notificationsAPI = { get: () => apiFetch('notifications.php') };
export const priceHistoryAPI  = {
  getAll:      ()         => apiFetch('price_history.php'),
  getByProduct:(productId)=> apiFetch(`price_history.php?product_id=${productId}`),
};