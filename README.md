# btc-race-24h-20261123-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/gaplek15/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/gaplek15/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A long-only cbBTC step-rider bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. Simulation only: paper money, no real trades. Buy-and-hold with a 2.5% trailing stop — net +$32.17 (+3.22%) on the kit's frozen dev window, above the $0 dev gate.

## Run it

```sh
node /bot/main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=d9kag417&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>

## Strategy

Long-only cbBTC (Coinbase Wrapped BTC) on 1-minute on-chain bars, $1,000 paper
USDC. On 1-minute bars BTC mostly chops sideways and moves in short bursts,
while a full round trip costs ~26 bps in fees, slippage and pool impact — so
this bot trades rarely:

- **Buy** with all cash on the first tradable batch and ride the trend.
- **Sell everything** only when the trend really breaks: the close falls 2.5%
  below the highest close since entry (trailing stop), or the 60-bar return
  drops below −1.5% (a strong hourly down-move).
- **Re-enter** after an exit only on a fresh burst: 60-bar return above +1.0%.
- **No new buys** in the last 30 bars of the window (a late entry would pay
  the round-trip cost and be flattened at the last close almost at once).

All decisions are integer (`bigint`) math on close ratios — deterministic,
no clock, no randomness, no network, stdlib only.

## Files

- `main.ts` — the bot (Node 22, `agent-fun/bars-replay/v1`)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's SDK shim

## Dev-window check (local, kit harness)

Backtested against the frozen dev window in the kit (1,440 one-minute bars,
BTC +3.64% over the window): buy-and-hold behaviour, net PnL ≈ **+$32**
after all fees, 1 trade, max drawdown ≈ 2% — above the $0 dev gate.
Verified with the kit's own harness (see `grade-local` output in the
submission report).
