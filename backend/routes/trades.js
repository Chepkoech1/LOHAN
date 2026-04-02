// backend/routes/trades.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');

// ── Supported Assets ────────────────────────────────────────────────
const SUPPORTED_ASSETS = {
  synthetic: [
    'Volatility 10 (1s) Index',
    'Volatility 10 Index',
    'Volatility 15 (1s) Index',
    'Volatility 25 (1s) Index',
    'Volatility 25 Index',
    'Volatility 30 (1s) Index',
    'Volatility 50 (1s) Index',
    'Volatility 50 Index',
    'Volatility 75 (1s) Index',
    'Volatility 75 Index',
    'Volatility 90 (1s) Index',
    'Volatility 100 (1s) Index',
    'Volatility 100 Index',
  ],
};

// ── Contract Types and Allowed Directions ───────────────────────────
const CONTRACT_DIRECTIONS = {
  'rise_fall':    ['call', 'put'],
  'higher_lower': ['call', 'put'],
  'touch_notouch':['call', 'put'],
  'even_odd':     ['even', 'odd'],
  'over_under':   ['over', 'under'],
  'match_differ': ['match', 'differ'],
};

const DIGIT_CONTRACTS = ['match_differ', 'over_under', 'even_odd'];
const DIGIT_CAPABLE_ASSET_TYPES = ['synthetic'];

function resolveAssetType(asset) {
  for (const [type, list] of Object.entries(SUPPORTED_ASSETS)) {
    if (list.includes(asset)) return type;
  }
  return null;
}

function simulatePrice(asset) {
  const basePrices = {
    'BTC/USD': 67000, 'ETH/USD': 3500, 'EUR/USD': 1.085,
    'GBP/USD': 1.265, 'GOLD': 2350, 'SILVER': 28.5,
    'Volatility 10 Index': 500, 'Volatility 25 Index': 750,
    'Volatility 50 Index': 1000, 'Volatility 75 Index': 1250,
    'Volatility 100 Index': 1500,
  };
  const base = basePrices[asset] || 1000;
  const spread = base * 0.002;
  return parseFloat((base + (Math.random() - 0.5) * spread).toFixed(5));
}

function simulateTradeResult(trade) {
  const { direction, entryPrice, digitPrediction } = trade;
  let exitPrice;
  let won = false;

  const lastDigit = Math.floor(Math.random() * 10);
  exitPrice = parseFloat((entryPrice + (Math.random() - 0.5) * entryPrice * 0.01).toFixed(5));

  switch (direction) {
    case 'call':
      won = exitPrice > entryPrice;
      break;
    case 'put':
      won = exitPrice < entryPrice;
      break;
    case 'even':
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + (lastDigit % 2 === 0 ? '2' : '3'));
      won = lastDigit % 2 === 0;
      break;
    case 'odd':
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + (lastDigit % 2 !== 0 ? '1' : '4'));
      won = lastDigit % 2 !== 0;
      break;
    case 'over':
      won = lastDigit > (digitPrediction ?? 4);
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + lastDigit);
      break;
    case 'under':
      won = lastDigit < (digitPrediction ?? 5);
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + lastDigit);
      break;
    case 'match':
      won = lastDigit === digitPrediction;
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + lastDigit);
      break;
    case 'differ':
      won = lastDigit !== digitPrediction;
      exitPrice = parseFloat(entryPrice.toFixed(4).slice(0, -1) + lastDigit);
      break;
    default:
      won = false;
  }

  return { exitPrice, won, lastDigit };
}

// ══════════════════════════════════════════════════════════════════
// POST /api/trades/place  —  Place a new trade (real or demo)
// ══════════════════════════════════════════════════════════════════
router.post('/place', auth, async (req, res) => {
  try {
    const {
      asset,
      direction,
      amount,
      duration,
      digitPrediction,
      isDemo = false,
    } = req.body;

    const CONTRACT_TYPE_MAP = {
      call:   'rise_fall',
      put:    'rise_fall',
      match:  'match_differ',
      differ: 'match_differ',
      even:   'even_odd',
      odd:    'even_odd',
      over:   'over_under',
      under:  'over_under',
    };
    const contractType = CONTRACT_TYPE_MAP[direction];
    if (!contractType) {
      return res.status(400).json({ success: false, message: `Direction "${direction}" is not supported.` });
    }

    const assetType = resolveAssetType(asset);
    if (!assetType) {
      return res.status(400).json({ success: false, message: `Asset "${asset}" is not available.` });
    }

    const allowedDirections = CONTRACT_DIRECTIONS[contractType];
    if (!allowedDirections.includes(direction)) {
      return res.status(400).json({ success: false, message: `Direction "${direction}" is not valid for "${contractType}".` });
    }

    if (DIGIT_CONTRACTS.includes(contractType) && !DIGIT_CAPABLE_ASSET_TYPES.includes(assetType)) {
      return res.status(400).json({ success: false, message: `Digit contracts are only available on Synthetic Indices.` });
    }

    if (['match_differ', 'over_under'].includes(contractType)) {
      if (digitPrediction === undefined || digitPrediction === null || digitPrediction === '') {
        return res.status(400).json({ success: false, message: `"digitPrediction" (0–9) is required for ${contractType} contracts.` });
      }
      const dp = Number(digitPrediction);
      if (!Number.isInteger(dp) || dp < 0 || dp > 9) {
        return res.status(400).json({ success: false, message: `"digitPrediction" must be an integer between 0 and 9.` });
      }
    }

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Minimum trade amount is 1.' });
    }

    const user = await User.findById(req.user._id);
    const availableBalance = isDemo ? (user.demoBalance ?? 10000) : user.balance;
    if (availableBalance < amount) {
      return res.status(400).json({ success: false, message: `Insufficient ${isDemo ? 'demo' : 'real'} balance.` });
    }

    const entryPrice = simulatePrice(asset);
    const expiryTime = new Date(Date.now() + duration * 1000);

    if (isDemo) {
      user.demoBalance = (user.demoBalance ?? 10000) - amount;
    } else {
      user.balance -= amount;
    }

    const trade = new Trade({
      user: user._id,
      asset,
      assetType,
      direction,
      amount,
      digitPrediction: digitPrediction !== undefined ? Number(digitPrediction) : null,
      entryPrice,
      expiryTime,
      duration,
      payoutRate: 1.0,
      status: 'active',
      isDemo,
    });

    await trade.save();
    await user.save();

    // Schedule resolution
    setTimeout(async () => {
      try {
        const resolvedTrade = await Trade.findById(trade._id);
        // Skip if already closed early
        if (!resolvedTrade || resolvedTrade.status !== 'active') return;

        const { exitPrice, won, lastDigit } = simulateTradeResult({
          direction,
          entryPrice,
          digitPrediction: digitPrediction !== undefined ? Number(digitPrediction) : null,
          asset,
        });

        const profit = won ? parseFloat((amount * 1.0).toFixed(2)) : -amount;
        const payout = won ? amount + profit : 0;

        resolvedTrade.exitPrice = exitPrice;
        resolvedTrade.status   = won ? 'won' : 'lost';
        resolvedTrade.profit   = profit;
        resolvedTrade.closedAt = new Date();
        await resolvedTrade.save();

        const resolvedUser = await User.findById(user._id);
        if (isDemo) {
          resolvedUser.demoBalance = (resolvedUser.demoBalance ?? 0) + payout;
        } else {
          if (won) resolvedUser.balance += payout;
          resolvedUser.stats.totalTrades += 1;
          if (won) {
            resolvedUser.stats.winCount    += 1;
            resolvedUser.stats.totalProfit  = (resolvedUser.stats.totalProfit || 0) + profit;
          } else {
            resolvedUser.stats.lossCount += 1;
            resolvedUser.stats.totalLoss  = (resolvedUser.stats.totalLoss || 0) + amount;
          }
        }
        await resolvedUser.save();

        console.log(`✅ Trade ${trade._id} resolved: ${won ? 'WON' : 'LOST'} | Last digit: ${lastDigit} | Profit: ${profit}`);
      } catch (err) {
        console.error('Trade resolution error:', err);
      }
    }, duration * 1000);

    res.status(201).json({
      success: true,
      message: 'Trade placed successfully',
      trade: {
        _id: trade._id,
        asset, assetType, contractType, direction, amount,
        digitPrediction: trade.digitPrediction,
        entryPrice, expiryTime, duration,
        status: 'active', isDemo,
      },
      balance: isDemo ? user.demoBalance : user.balance,
    });

  } catch (error) {
    console.error('Place trade error:', error);
    res.status(500).json({ success: false, message: 'Server error placing trade', error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/trades/:id/close  —  Close a trade early
//
// When a user clicks "Close Trade" on an active position:
//   - If time remaining > 60%: they receive 50% of their stake back
//   - If time remaining 30–60%: they receive 25% back
//   - If time remaining < 30%: no refund (trade runs to natural expiry)
//
// The trade is immediately marked 'closed_early' so the scheduled
// setTimeout will skip resolution when it fires.
// ══════════════════════════════════════════════════════════════════
router.post('/:id/close', auth, async (req, res) => {
  try {
    const { isDemo = false } = req.body;

    // 0. Validate ObjectId format to avoid Mongoose CastError
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid trade ID.' });
    }

    // 1. Find the trade and verify ownership
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id });
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found.' });
    }

    // 2. Only active trades can be closed early
    if (trade.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Trade is already ${trade.status} and cannot be closed early.`,
      });
    }

    const now        = Date.now();
    const totalMs    = trade.duration * 1000;
    const elapsedMs  = now - new Date(trade.createdAt).getTime();
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const remainingPct = remainingMs / totalMs; // 1.0 = full time left, 0 = expired

    // 3. Calculate early-close refund (partial stake return)
    //    The more time remaining, the larger the refund.
    let refundRate = 0;
    if (remainingPct > 0.6)      refundRate = 0.50; // >60% time left  → 50% refund
    else if (remainingPct > 0.3) refundRate = 0.25; // 30–60% time left → 25% refund
    // else < 30% time left → 0% refund

    const refundAmount = parseFloat((trade.amount * refundRate).toFixed(2));
    const profit       = parseFloat(-(trade.amount - refundAmount).toFixed(2)); // always a loss

    // 4. Mark the trade as closed early
    trade.status    = 'closed_early';
    trade.profit    = profit;
    trade.closedAt  = new Date();
    trade.exitPrice = simulatePrice(trade.asset); // current simulated price at close
    await trade.save();

    // 5. Credit refund to user balance
    const user = await User.findById(req.user._id);
    if (trade.isDemo) {
      user.demoBalance = (user.demoBalance ?? 0) + refundAmount;
    } else {
      user.balance += refundAmount;
      // Guard: stats may not exist on older user documents
      if (!user.stats) user.stats = {};
      user.stats.totalTrades = (user.stats.totalTrades || 0) + 1;
      user.stats.lossCount   = (user.stats.lossCount   || 0) + 1;
      user.stats.totalLoss   = (user.stats.totalLoss   || 0) + (trade.amount - refundAmount);
    }
    await user.save();

    console.log(`🛑 Trade ${trade._id} closed early | Refund: $${refundAmount} (${(refundRate*100).toFixed(0)}%) | Time left: ${(remainingPct*100).toFixed(1)}%`);

    res.json({
      success: true,
      message: refundRate > 0
        ? `Trade closed early. $${refundAmount} refunded to your ${trade.isDemo ? 'demo' : 'real'} balance.`
        : 'Trade closed early. No refund — less than 30% time remaining.',
      refundAmount,
      refundRate,
      profit,
      balance: trade.isDemo ? user.demoBalance : user.balance,
    });

  } catch (error) {
    console.error('Early close error:', error.stack || error);
    res.status(500).json({ success: false, message: 'Server error closing trade', error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/trades/active  —  Get user's active trades
// ══════════════════════════════════════════════════════════════════
router.get('/active', auth, async (req, res) => {
  try {
    const { isDemo } = req.query;
    const filter = { user: req.user._id, status: 'active' };
    if (isDemo !== undefined) filter.isDemo = isDemo === 'true';

    const trades = await Trade.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/trades/history  —  Get trade history
// ══════════════════════════════════════════════════════════════════
router.get('/history', auth, async (req, res) => {
  try {
    const { isDemo, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id, status: { $ne: 'active' } };
    if (isDemo !== undefined) filter.isDemo = isDemo === 'true';

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Trade.countDocuments(filter);

    res.json({ success: true, trades, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/trades/assets  —  Return all available assets
// ══════════════════════════════════════════════════════════════════
router.get('/assets', auth, (req, res) => {
  res.json({ success: true, assets: SUPPORTED_ASSETS });
});

// ══════════════════════════════════════════════════════════════════
// GET /api/trades/:id  —  Get single trade by ID
// ══════════════════════════════════════════════════════════════════
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id });
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
    res.json({ success: true, trade });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;