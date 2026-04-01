// backend/services/priceFeed.js

const prices = {
  // Forex
  'EUR/USD':      1.08450,
  'GBP/USD':      1.26780,
  'USD/JPY':      149.870,
  'AUD/USD':      0.65200,
  'USD/CHF':      0.90110,
  'NZD/USD':      0.59800,
  'EUR/GBP':      0.85410,
  'EUR/JPY':      161.250,

  // Crypto
  'BTC/USD':      67450.00,
  'ETH/USD':      3520.00,
  'LTC/USD':      82.45,
  'XRP/USD':      0.52310,
  'SOL/USD':      148.20,
  'BNB/USD':      312.50,

  // Commodities
  'GOLD':         2345.50,
  'SILVER':       27.45,
  'OIL':          82.30,
  'NATURAL GAS':  2.31,
  'COPPER':       4.12,
  'PLATINUM':     985.00,

  // Synthetic Indices — Volatility
  'Volatility 10 Index':          1180.20,
  'Volatility 10 (1s) Index':     1245.50,
  'Volatility 15 (1s) Index':     1520.30,
  'Volatility 25 Index':          2180.50,
  'Volatility 25 (1s) Index':     2340.10,
  'Volatility 30 (1s) Index':     3100.75,
  'Volatility 50 Index':          5120.80,
  'Volatility 50 (1s) Index':     5420.30,
  'Volatility 75 Index':          8920.40,
  'Volatility 75 (1s) Index':     9351.77,
  'Volatility 90 (1s) Index':     11240.60,
  'Volatility 100 Index':         12840.90,
  'Volatility 100 (1s) Index':    13580.20,

  // Synthetic Indices — Crash & Boom
  'Crash 300 Index':              8420.50,
  'Crash 500 Index':              6120.30,
  'Crash 1000 Index':             4850.70,
  'Boom 300 Index':               8980.20,
  'Boom 500 Index':               6540.10,
  'Boom 1000 Index':              5210.40,

  // Synthetic Indices — Other
  'Step Index':                   100.00,
  'Range Break 100 Index':        1250.00,
  'Range Break 200 Index':        2480.00,

  // Legacy keys (keep for backward compat)
  'Volatility 75':                9351.77,
  'Volatility 10':                1245.50,
};

const assetTypes = {
  // Forex
  'EUR/USD': 'forex', 'GBP/USD': 'forex', 'USD/JPY': 'forex',
  'AUD/USD': 'forex', 'USD/CHF': 'forex', 'NZD/USD': 'forex',
  'EUR/GBP': 'forex', 'EUR/JPY': 'forex',

  // Crypto
  'BTC/USD': 'crypto', 'ETH/USD': 'crypto', 'LTC/USD': 'crypto',
  'XRP/USD': 'crypto', 'SOL/USD': 'crypto', 'BNB/USD': 'crypto',

  // Commodities
  'GOLD': 'commodity', 'SILVER': 'commodity', 'OIL': 'commodity',
  'NATURAL GAS': 'commodity', 'COPPER': 'commodity', 'PLATINUM': 'commodity',

  // Synthetic
  'Volatility 10 Index':       'synthetic',
  'Volatility 10 (1s) Index':  'synthetic',
  'Volatility 15 (1s) Index':  'synthetic',
  'Volatility 25 Index':       'synthetic',
  'Volatility 25 (1s) Index':  'synthetic',
  'Volatility 30 (1s) Index':  'synthetic',
  'Volatility 50 Index':       'synthetic',
  'Volatility 50 (1s) Index':  'synthetic',
  'Volatility 75 Index':       'synthetic',
  'Volatility 75 (1s) Index':  'synthetic',
  'Volatility 90 (1s) Index':  'synthetic',
  'Volatility 100 Index':      'synthetic',
  'Volatility 100 (1s) Index': 'synthetic',
  'Crash 300 Index':           'synthetic',
  'Crash 500 Index':           'synthetic',
  'Crash 1000 Index':          'synthetic',
  'Boom 300 Index':            'synthetic',
  'Boom 500 Index':            'synthetic',
  'Boom 1000 Index':           'synthetic',
  'Step Index':                'synthetic',
  'Range Break 100 Index':     'synthetic',
  'Range Break 200 Index':     'synthetic',

  // Legacy
  'Volatility 75': 'synthetic',
  'Volatility 10': 'synthetic',
};

// Volatility multipliers — synthetics move faster than forex
const volatilityMap = {
  forex:     0.0003,
  crypto:    0.0015,
  commodity: 0.0005,
  synthetic: 0.0020,
};

// Simulate live price movements
setInterval(() => {
  for (const asset in prices) {
    const type   = assetTypes[asset] || 'forex';
    const vol    = volatilityMap[type] || 0.0003;
    const change = (Math.random() - 0.5) * vol;
    prices[asset] = parseFloat((prices[asset] * (1 + change)).toFixed(5));
  }
}, 1000);

module.exports = {
  getPrice(asset) {
    return prices[asset] ?? null;
  },

  getAllPrices() {
    return { ...prices };
  },

  getAssetType(asset) {
    return assetTypes[asset] || 'forex';
  }
};