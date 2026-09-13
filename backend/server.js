import express from "express";
import cors from "cors";
import { fetchAddressTxs, AddressLookupError, NETWORK } from "./mempoolClient.js";
import { runHeuristics } from "./heuristics.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, network: NETWORK });
});

app.post("/analyze", async (req, res) => {
  const { address } = req.body || {};

  if (!address || typeof address !== "string" || address.trim().length < 20) {
    return res.status(400).json({ error: "Provide a valid Bitcoin address." });
  }

  try {
    const { fundedTxCount, spentTxCount, txs } = await fetchAddressTxs(
      address.trim()
    );

    if (!txs || txs.length === 0) {
      return res.json({
        address,
        score: 0,
        heuristics: [],
        linkedAddresses: [],
        note: "No transaction history found for this address yet — nothing to analyze.",
        fundedTxCount,
        spentTxCount,
      });
    }

    const result = runHeuristics(address.trim(), txs);

    return res.json({
      address,
      ...result,
      fundedTxCount,
      spentTxCount,
      txsAnalyzed: txs.length,
      network: NETWORK,
    });
  } catch (err) {
    if (err instanceof AddressLookupError) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Unexpected server error." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`privacy-scanner backend running on :${PORT} (network: ${NETWORK})`);
});
