// Thin client around a public Esplora-compatible API (mempool.space).
// Testnet by default so the demo is safe to run against real chain data
// without touching mainnet funds. Swap MEMPOOL_BASE to mainnet if you want
// real addresses for the judging demo (read-only, no risk either way).

const NETWORK = process.env.BTC_NETWORK || "testnet"; // "testnet" | "mainnet"

const MEMPOOL_BASE =
  NETWORK === "mainnet"
    ? "https://mempool.space/api"
    : "https://mempool.space/testnet/api";

class AddressLookupError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AddressLookupError";
    this.status = status;
  }
}

async function fetchJson(url) {
  const res = await fetch(url);

  if (res.status === 404) {
    throw new AddressLookupError("Address not found or invalid.", 404);
  }
  if (res.status === 429) {
    throw new AddressLookupError(
      "Rate limited by the block explorer API. Wait a few seconds and try again.",
      429
    );
  }
  if (!res.ok) {
    throw new AddressLookupError(
      `Block explorer API error (${res.status}).`,
      res.status
    );
  }
  return res.json();
}

// Returns { txCount, txs } where txs is an array of Esplora tx objects,
// each already including prevout info on every input (no extra calls needed).
export async function fetchAddressTxs(address) {
  // Basic address stats (also acts as address-format validation)
  const stats = await fetchJson(`${MEMPOOL_BASE}/address/${address}`);

  const fundedTxCount =
    (stats.chain_stats?.funded_txo_count || 0) +
    (stats.mempool_stats?.funded_txo_count || 0);
  const spentTxCount =
    (stats.chain_stats?.spent_txo_count || 0) +
    (stats.mempool_stats?.spent_txo_count || 0);

  // Esplora returns the most recent ~50 confirmed txs plus mempool txs.
  // Good enough depth for a hackathon demo; page via /txs/chain/:last_txid
  // for full history if you need it later.
  const txs = await fetchJson(`${MEMPOOL_BASE}/address/${address}/txs`);

  return { fundedTxCount, spentTxCount, txs };
}

export { AddressLookupError, NETWORK, MEMPOOL_BASE };
