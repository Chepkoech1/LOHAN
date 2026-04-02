// frontend/js/api.js

const api = {
  baseURL: 'http://localhost:3000/api',

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    let data = {};
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || `Request failed (${response.status})` };
      }
    } catch (e) {
      data = { message: `Request failed (${response.status})` };
    }

    if (!response.ok) {
      console.error('API Error:', { endpoint, status: response.status, data });
      throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }

    return data;
  },

  get(endpoint)          { return this.request(endpoint); },
  post(endpoint, data)   { return this.request(endpoint, { method: 'POST',  body: JSON.stringify(data) }); },
  put(endpoint, data)    { return this.request(endpoint, { method: 'PUT',   body: JSON.stringify(data) }); },
  delete(endpoint)       { return this.request(endpoint, { method: 'DELETE' }); },

  // ── Auth ──────────────────────────────────────────────────────────
  register(data)         { return this.post('/auth/register', data); },
  login(data)            { return this.post('/auth/login', data); },
  getMe()                { return this.get('/auth/me'); },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
  },

  // ── User ──────────────────────────────────────────────────────────
  getStats()             { return this.get('/user/stats'); },
  getProfile()           { return this.get('/user/profile'); },
  updateProfile(data)    { return this.put('/user/profile', data); },

  // ── Trades ────────────────────────────────────────────────────────
  // FIX: use isDemo (not demo) to match backend query param
  getActiveTrades(isDemo = false) {
    return this.get(`/trades/active?isDemo=${isDemo}`);
  },
  getTradeHistory(isDemo = false, page = 1, limit = 20) {
    return this.get(`/trades/history?isDemo=${isDemo}&page=${page}&limit=${limit}`);
  },
  getTrade(id)           { return this.get(`/trades/${id}`); },
  getAssets()            { return this.get('/trades/assets'); },

  // FIX: ensure full payload is forwarded exactly as-is
  placeTrade(data) {
    // Validate required fields before sending to avoid cryptic 400s
    if (!data.asset)     throw new Error('asset is required');
    if (!data.direction) throw new Error('direction is required');
    if (!data.amount)    throw new Error('amount is required');
    if (!data.duration)  throw new Error('duration is required');

    // Digit contracts require digitPrediction
    const digitDirections = ['match', 'differ', 'over', 'under'];
    if (digitDirections.includes(data.direction) && data.digitPrediction === undefined) {
      throw new Error(`digitPrediction (0–9) is required for ${data.direction} trades`);
    }

    console.log('📤 Placing trade:', data); // helpful for debugging
    return this.post('/trades/place', data);
  },

  // ── Payments ──────────────────────────────────────────────────────
  deposit(data)          { return this.post('/payments/deposit', data); },
  withdraw(data)         { return this.post('/payments/withdraw', data); },
  getTransactions()      { return this.get('/payments/history'); },
};