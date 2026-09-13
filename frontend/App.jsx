import { useState } from "react";
import { Terminal, ShieldAlert, ShieldCheck, ChevronRight, RotateCcw, ExternalLink } from "lucide-react";

// Point this at your backend. In dev, backend runs on :4000 by default.
const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:4000";

// Must match backend's BTC_NETWORK so evidence links resolve correctly.
const NETWORK = "testnet"; // "testnet" | "mainnet"
const EXPLORER_BASE =
  NETWORK === "mainnet" ? "https://mempool.space/tx" : "https://mempool.space/testnet/tx";

const SAMPLE_ADDRESSES = [
  // Swap these for testnet addresses you control or a known-active one —
  // real chain data only shows heuristics on addresses with real history.
  "tb1q9d9zz9j0kwm40dysgc9700akwrryv5npqu5s0j",
];

function riskColor(score) {
  if (score >= 60) return "#E85D4C";
  if (score >= 30) return "#F2A93B";
  return "#4FAE8B";
}

function riskWord(score) {
  if (score >= 60) return "linkable";
  if (score >= 30) return "somewhat linkable";
  return "low linkage";
}

export default function App() {
  const [address, setAddress] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const analyze = async (addr) => {
    const value = addr.trim();
    if (!value) return;

    setPhase("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setPhase("error");
        return;
      }

      setResult(data);
      setPhase("done");
    } catch (err) {
      setErrorMsg("Could not reach the backend. Is it running on " + API_BASE + "?");
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setErrorMsg("");
    setAddress("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0F14",
        color: "#E7EBF0",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "48px 20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#8A94A3",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 12.5,
              marginBottom: 10,
            }}
          >
            <Terminal size={14} />
            <span>poison-utxo / privacy-scanner · {NETWORK}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
            How linkable is this address?
          </h1>
          <p style={{ color: "#8A94A3", fontSize: 14.5, marginTop: 8, lineHeight: 1.55 }}>
            Runs real on-chain heuristics against live {NETWORK} transaction data —
            address reuse, common-input-ownership, and change-output linkage.
          </p>
        </div>

        <div style={{ background: "#11161D", border: "1px solid #1E2630", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #1E2630" }}>
            <ChevronRight size={16} color="#F2A93B" style={{ flexShrink: 0 }} />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze(address)}
              placeholder={`paste a ${NETWORK} bitcoin address`}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#E7EBF0",
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: 13.5,
              }}
            />
            {phase === "done" || phase === "error" ? (
              <button onClick={reset} style={btnGhost}>
                <RotateCcw size={12} /> reset
              </button>
            ) : (
              <button
                onClick={() => analyze(address)}
                disabled={phase === "loading"}
                style={{ ...btnPrimary, opacity: phase === "loading" ? 0.6 : 1 }}
              >
                {phase === "loading" ? "analyzing…" : "analyze"}
              </button>
            )}
          </div>

          {phase === "idle" && (
            <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SAMPLE_ADDRESSES.map((a) => (
                <button key={a} onClick={() => { setAddress(a); analyze(a); }} style={sampleBtn}>
                  {a.slice(0, 12)}…
                </button>
              ))}
            </div>
          )}

          {phase === "loading" && (
            <div style={{ padding: 16, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 12.5, color: "#8A94A3" }}>
              querying {NETWORK} explorer & running heuristics...
            </div>
          )}

          {phase === "error" && (
            <div style={{ padding: 16, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 12.5, color: "#E85D4C" }}>
              ✕ {errorMsg}
            </div>
          )}

          {phase === "done" && result && (
            <div style={{ borderTop: "1px solid #1E2630" }}>
              {result.note ? (
                <div style={{ padding: 16, color: "#8A94A3", fontSize: 13 }}>{result.note}</div>
              ) : (
                <>
                  <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #1E2630" }}>
                    {result.score >= 30 ? (
                      <ShieldAlert size={22} color={riskColor(result.score)} />
                    ) : (
                      <ShieldCheck size={22} color={riskColor(result.score)} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                        Linkage score: {result.score}/100 —{" "}
                        <span style={{ color: riskColor(result.score) }}>{riskWord(result.score)}</span>
                      </div>
                      <div style={{ color: "#8A94A3", fontSize: 12.5, marginTop: 3 }}>
                        {result.txsAnalyzed} transactions analyzed · {result.linkedAddresses.length} linked address
                        {result.linkedAddresses.length !== 1 ? "es" : ""} found
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "14px 16px" }}>
                    {result.heuristics.map((h) => (
                      <div key={h.id} style={{ padding: "9px 0", borderBottom: "1px solid #161D26" }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: h.flagged ? "#E85D4C" : "#2A3441" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: h.flagged ? "#E7EBF0" : "#8A94A3" }}>
                              {h.label}
                            </div>
                            <div style={{ fontSize: 12, color: "#5E6773", marginTop: 2, lineHeight: 1.5 }}>
                              {h.detail}
                            </div>
                            {h.flagged && h.evidence?.length > 0 && (
                              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {h.evidence.map((txid) => (
                                  <a
                                    key={txid}
                                    href={`${EXPLORER_BASE}/${txid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={evidenceLink}
                                  >
                                    {txid.slice(0, 8)}… <ExternalLink size={10} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p style={{ color: "#5E6773", fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
          Backend queries live {NETWORK} data via mempool.space's public API — every
          score here is computed from real transactions, not simulated.
        </p>
      </div>
    </div>
  );
}

const btnGhost = {
  display: "flex", alignItems: "center", gap: 6, background: "transparent",
  border: "1px solid #1E2630", color: "#8A94A3", borderRadius: 6,
  padding: "6px 10px", fontSize: 12.5, cursor: "pointer",
};

const btnPrimary = {
  background: "#F2A93B", border: "none", color: "#0B0F14", borderRadius: 6,
  padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const sampleBtn = {
  background: "#161D26", border: "1px solid #1E2630", color: "#8A94A3",
  borderRadius: 5, padding: "5px 9px", fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: 11, cursor: "pointer",
};

const evidenceLink = {
  display: "inline-flex", alignItems: "center", gap: 4, color: "#7BA8C9",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 10.5,
  textDecoration: "none", background: "#161D26", border: "1px solid #1E2630",
  borderRadius: 4, padding: "2px 6px",
};
