# SatoshiTrace

Real on-chain heuristics for BOSS Battle's **Privacy** track. Same clustering
engine behind Poison UTXO (SIH), reframed: instead of attributing an unhosted
wallet to a VASP, it tells *you* how linkable your own address is.

No mocked data — the backend queries live testnet transactions via
mempool.space's public API and runs three real heuristics against them.

## Setup

### Backend
```
cd backend
npm install
npm start          # runs on http://localhost:4000
```
Set `BTC_NETWORK=mainnet` as an env var if you want to demo against real
mainnet addresses (read-only — no funds ever touched).

### Frontend
Drop `App.jsx` into a Vite + React project (or your existing prototype's
project). It expects `lucide-react` installed and reads the backend URL from
`VITE_API_BASE` (defaults to `http://localhost:4000`).

Try it against a testnet address with real activity — the sample address in
the file is a placeholder; swap it for one with actual transaction history
(e.g. a faucet address you've used, or any active testnet address you find
on a testnet block explorer) so the demo has something to show.

## The three heuristics (plain-English, for judging Q&A)

1. **Address reuse** — if an address receives funds more than once, every
   payment to it is now provably linked to the same owner. This is why
   wallets are supposed to generate a new address per payment.

2. **Common-input-ownership** — when a transaction spends from multiple
   addresses at once, standard Bitcoin heuristic analysis assumes all of
   those input addresses belong to the same wallet (you need the private
   keys for all of them to sign the transaction).

3. **Change-output linkage** — most transactions send change back to the
   sender. If we can spot which output is the change (self-receipt in the
   same tx, or a non-round leftover amount), that address gets linked back
   to the sender's other addresses too.

## Weakest heuristic — be ready for this

**Change-output detection (#3) is the easiest to challenge.** It's
probabilistic, not certain — the "non-round amount = change" signal is a
well-known heuristic (used by real chain-analysis firms), but it produces
false positives on transactions that just happen to send odd amounts on
purpose. If a judge pushes on this, the honest answer: real privacy tools
combine several heuristics and confidence-weight them rather than trusting
any single one — this demo intentionally keeps it simple and transparent
about that limitation, which is itself a fair thing to say out loud in
judging.

Heuristics #1 and #2 are much harder to dispute — reuse and common-input-
ownership are both deterministic facts you can point to directly on-chain.

## What's mocked vs. real

Nothing in `/analyze` is mocked. The scanning animation on the frontend
reflects real request/response timing (no artificial delays). If asked live:
"this hits mempool.space's public Esplora API for real transaction data,
computed heuristics run against the actual vin/vout data of each transaction."
