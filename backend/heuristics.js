// Real heuristics run against real Esplora tx data (not mocked).
// Each tx from mempool.space already includes `prevout` on every vin,
// so we get input addresses without extra API calls.

function inputAddressesOf(tx) {
  return tx.vin
    .map((vin) => vin.prevout?.scriptpubkey_address)
    .filter(Boolean);
}

function outputsOf(tx) {
  return tx.vout
    .filter((vout) => vout.scriptpubkey_address)
    .map((vout) => ({ address: vout.scriptpubkey_address, value: vout.value }));
}

// Crude "round amount" check: values that look like human-picked BTC
// amounts (e.g. 0.01, 0.005 BTC) rather than exact-change leftovers.
// 1 BTC = 100,000,000 sats. Round to at least 5 trailing zero sats
// (i.e. multiples of 100,000 sats / 0.001 BTC) reads as "someone typed this".
function isRoundAmount(sats) {
  return sats % 100000 === 0 && sats > 0;
}

export function runHeuristics(address, txs) {
  const reuseTxids = [];
  const cioAddresses = new Set();
  const cioTxids = [];
  const changeAddresses = new Set();
  const changeTxids = [];

  for (const tx of txs) {
    const inputs = inputAddressesOf(tx);
    const outputs = outputsOf(tx);
    const isInput = inputs.includes(address);
    const isOutput = outputs.some((o) => o.address === address);

    // --- Heuristic 1: address reuse ---
    // Flag if this address has received funds in more than one transaction.
    if (isOutput) {
      reuseTxids.push(tx.txid);
    }

    // --- Heuristic 2: common-input-ownership ---
    // If our address co-signs a tx alongside other input addresses,
    // the standard Bitcoin heuristic treats those as commonly owned.
    if (isInput) {
      inputs
        .filter((a) => a !== address)
        .forEach((a) => cioAddresses.add(a));
      if (inputs.length > 1) cioTxids.push(tx.txid);
    }

    // --- Heuristic 3: change-output detection ---
    // Case A: address spends and also receives an output in the same tx
    // (self-change) -> the OTHER output(s) are the real payment destination,
    // now linkable to this address as "who this wallet paid".
    // Case B: address spends, doesn't receive back, but of two outputs one
    // is a non-round amount -> that output is the likely change address,
    // now linkable back to this wallet.
    if (isInput && isOutput && outputs.length >= 2) {
      changeTxids.push(tx.txid);
      outputs
        .filter((o) => o.address !== address)
        .forEach((o) => changeAddresses.add(o.address));
    } else if (isInput && !isOutput && outputs.length === 2) {
      const nonRound = outputs.find((o) => !isRoundAmount(o.value));
      if (nonRound) {
        changeTxids.push(tx.txid);
        changeAddresses.add(nonRound.address);
      }
    }
  }

  const heuristics = [
    {
      id: "reuse",
      label: "Address reuse",
      detail:
        "This address has received funds in more than one transaction, letting anyone link all its activity together.",
      flagged: reuseTxids.length > 1,
      evidence: reuseTxids.slice(0, 5),
    },
    {
      id: "cio",
      label: "Common-input-ownership",
      detail:
        "This address was spent alongside other addresses as joint inputs — the classic heuristic treats co-signing addresses as commonly owned.",
      flagged: cioAddresses.size > 0,
      evidence: cioTxids.slice(0, 5),
    },
    {
      id: "change",
      label: "Change-output linkage",
      detail:
        "A likely change or payment output in a spend from this address ties it to another address in the same wallet or transaction.",
      flagged: changeAddresses.size > 0,
      evidence: changeTxids.slice(0, 5),
    },
  ];

  const flaggedCount = heuristics.filter((h) => h.flagged).length;
  const score = Math.round((flaggedCount / heuristics.length) * 100);

  const linkedAddresses = Array.from(
    new Set([...cioAddresses, ...changeAddresses])
  ).slice(0, 20);

  return { score, heuristics, linkedAddresses };
}
