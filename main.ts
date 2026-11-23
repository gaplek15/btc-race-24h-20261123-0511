// Step-rider: a long-only cbBTC bot for agent-fun/bars-replay/v1.
//
// Idea: on 1-minute bars BTC mostly chops sideways and moves in short bursts,
// and a full round trip costs ~26 bps in fees, slippage and pool impact, so
// trading often bleeds money. This bot therefore trades rarely:
//   - it buys with all its cash on the first tradable batch and rides the trend;
//   - it sells everything only when the trend really breaks: the close falls
//     2.5% below the highest close since entry (trailing stop), or the 60-bar
//     return drops below -1.5% (a strong hourly down-move);
//   - after an exit it re-enters only on a fresh burst: the 60-bar return
//     above +1.0% (a strong hourly up-move);
//   - it never buys in the last 30 bars: a late entry would pay the round-trip
//     cost and be flattened at the last close almost at once.
// Everything is integer (bigint) math on close ratios, so the same bars give
// the same orders on every run: no clock, no randomness, no network, no floats.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Trailing stop: sell when close <= peak * 975 / 1000 (-2.5%). */
const TRAIL_NUM = 975n;
const TRAIL_DEN = 1000n;
/** Down-move exit: sell when the 60-bar return <= -1.5% (close*1000 <= close60*985). */
const DOWN_NUM = 985n;
/** Burst re-entry: buy when the 60-bar return >= +1.0% (close*1000 >= close60*1010). */
const UP_NUM = 1010n;
const RET_DEN = 1000n;
/** Lookback for the hourly return, in bars. */
const LOOKBACK = 60;
/** No new buys once this many scored bars have passed (window is 1440 bars). */
const BUY_CUTOFF_BARS = 1410;
/** Slippage cap per order, 1% past the close it was decided on. */
const MAX_SLIPPAGE_BPS = 100;

/** The closes seen so far, oldest first (at most LOOKBACK + 1 kept). */
const closes: bigint[] = [];
/** Highest close since the current entry, null while flat. */
let peak: bigint | null = null;

function pushClose(c: bigint): void {
  closes.push(c);
  if (closes.length > LOOKBACK + 1) closes.shift();
}

await runBars({
  onBatch(state: BarsState) {
    const bar = state.latest.get(SYMBOL);
    if (bar !== undefined) pushClose(BigInt(bar.c));
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const scoredBars = state.seq - state.warmupBars;
    const old = closes.length > LOOKBACK ? closes[closes.length - 1 - LOOKBACK] : null;
    const close = bar === undefined ? null : BigInt(bar.c);

    if (held === undefined) {
      // Flat: no peak to trail from. A peak set by a buy decided on an
      // earlier batch is dropped if that buy never filled.
      peak = null;
    } else if (close !== null) {
      if (peak === null || close > peak) peak = close;
      // Trailing stop: 2.5% below the peak since entry.
      if (close * TRAIL_DEN <= peak * TRAIL_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      // Strong hourly down-move: 60-bar return at or below -1.5%.
      if (old !== null && close * RET_DEN <= old * DOWN_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      return [];
    } else {
      return [];
    }

    // Flat from here on: no new buys in the last 30 bars of the window.
    if (scoredBars >= BUY_CUTOFF_BARS) return [];
    if (state.cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];

    // First tradable batch: buy and ride.
    if (scoredBars === 0) {
      if (close !== null) peak = close;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput];
    }
    // Re-entry only on a fresh burst: 60-bar return at or above +1.0%.
    if (old !== null && close !== null && close * RET_DEN >= old * UP_NUM) {
      peak = close;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput];
    }
    return [];
  },
});
