// frontend/js/api.js

const api = {
  baseURL: '/api',

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
    
    // SAFE PARSING - Line 17 area fixed
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
      console.error('API Error:', {
        endpoint,
        status: response.status,
        data: data
      });
      throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }
    
    return data;
  },

  get(endpoint) { return this.request(endpoint); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },

  register(data) { return this.post('/auth/register', data); },
  login(data) { return this.post('/auth/login', data); },
  getMe() { return this.get('/auth/me'); },
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/pages/login.html'; },

  getStats() { return this.get('/user/stats'); },
  getProfile() { return this.get('/user/profile'); },
  updateProfile(data) { return this.put('/user/profile', data); },

  getTrades() { return this.get('/trades'); },
  getActiveTrades() { return this.get('/trades/active'); },
  getTradeHistory() { return this.get('/trades/history'); },
  placeTrade(data) { return this.post('/trades', data); },

  deposit(data) { return this.post('/payments/deposit', data); },
  withdraw(data) { return this.post('/payments/withdraw', data); },
  getTransactions() { return this.get('/payments/history'); },
};