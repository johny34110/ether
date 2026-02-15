import { useState } from "react";
import Defenses from "./pages/Defenses";
import Offenses from "./pages/Offenses";
import Search from "./pages/Search";

export default function App() {
  const [tab, setTab] = useState("defenses");
  const [activeDefenseId, setActiveDefenseId] = useState(null);

  const tabs = [
    ["defenses", "🛡️ Défenses"],
    ["offenses", "⚔️ Offenses"],
    ["search", "🔎 Recherche"]
  ];

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 1000, fontSize: 20 }}>GVG Counters</div>
        <div style={{ marginLeft: 10, display: "flex", gap: 8 }}>
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: tab === k ? "#f0f7ff" : "white",
                cursor: "pointer"
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", opacity: 0.75 }}>
          Défense active: {activeDefenseId ? activeDefenseId.slice(0, 8) + "…" : "—"}
        </div>
      </div>

      {tab === "defenses" && (
        <Defenses activeDefenseId={activeDefenseId} setActiveDefenseId={setActiveDefenseId} />
      )}
      {tab === "offenses" && (
        <Offenses activeDefenseId={activeDefenseId} setActiveDefenseId={setActiveDefenseId} />
      )}
      {tab === "search" && (
        <Search setActiveDefenseId={setActiveDefenseId} />
      )}
    </div>
  );
}
