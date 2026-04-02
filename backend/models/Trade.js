// backend/models/Trade.js
const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset: { type: String, required: true },
  assetType: { type: String, enum: ['crypto', 'forex', 'commodity', 'stock', 'synthetic'], required: true },
  direction: { type: String, enum: ['call', 'put', 'even', 'odd', 'over', 'under', 'match', 'differ'], required: true },
  amount: { type: Number, required: true, min: 1 },
  digitPrediction: { type: Number, min: 0, max: 9, default: null }, // for match/differ contracts
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number, default: null },
  expiryTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  payoutRate: { type: Number, default: 1.0},
status: { type: String, enum: ['active', 'won', 'lost', 'closed_early'], default: 'active'}, 
  profit: { type: Number, default: null },
  isDemo: { type: Boolean, default: false }, // ← demo flag
  closedAt: { type: Date },
  createdAt: { type: Date, default: null},
});

module.exports = mongoose.model('Trade', tradeSchema);